import {parseLockFile, PaketLock} from './lock-parser';
import {parseDependenciesFile, PaketDependencies, NugetDependency} from './dependencies-parser';
import * as path from 'path';
import * as fs from 'fs';
import {InvalidUserInputError, OutOfSyncError} from './errors';

const DEV_GROUPS = ['build', 'test', 'tests'];
const SUPPORTED_SOURCES = ['nuget'];
const FREQUENCY_THRESHOLD = 100;

export {InvalidUserInputError, OutOfSyncError};

export interface DepTree {
  name: string;
  version: string;
  dependencies: {
    [dep: string]: DepTree;
  };
  depType?: DepType;
  hasDevDependencies?: boolean;
  targetFrameworks?: string[];
  missingLockFileEntry?: boolean;
}

export enum DepType {
  prod = 'prod',
  dev = 'dev',
}

interface FlatDependency {
  name: string;
  version: string;
  dependencies: string[];
  depType: DepType;
  root: boolean;
  refs: number;
  resolved: boolean;
}

export async function buildDepTreeFromFiles(
  root: string,
  manifestFilePath: string,
  lockFilePath: string,
  includeDev = false,
  strict = true,
): Promise<DepTree> {
  const manifestFileFullPath = path.resolve(root, manifestFilePath);
  const lockFileFullPath = path.resolve(root, lockFilePath);

  if (!fs.existsSync(manifestFileFullPath)) {
    throw new InvalidUserInputError('Target file paket.dependencies not found at ' +
      `location: ${manifestFileFullPath}`);
  }
  if (!fs.existsSync(lockFileFullPath)) {
    throw new InvalidUserInputError('Lockfile not found at location: ' +
      lockFileFullPath);
  }

  const manifestFileContents = fs.readFileSync(manifestFileFullPath, 'utf-8');
  const lockFileContents = fs.readFileSync(lockFileFullPath, 'utf-8');

  return {
    dependencies: await buildDepTree(manifestFileContents, lockFileContents, includeDev, strict),
    name: root,
    version: '',
  } as DepTree;
}

async function buildDepTree(
  manifestFileContents: string,
  lockFileContents: string,
  includeDev: boolean = false,
  strict: boolean = true,
): Promise<{ [dep: string]: DepTree }> {
  const manifestFile = parseDependenciesFile(manifestFileContents);
  const lockFile = parseLockFile(lockFileContents);

  const dependenciesMap: Map<string, FlatDependency> = new Map();

  collectRootDeps(manifestFile, dependenciesMap);
  collectResolvedDeps(lockFile, dependenciesMap);

  for (const dep of dependenciesMap.values()) {
    if (dep.root) {
      calculateReferences(dep, dependenciesMap);
    }
  }

  const dependencies = {} as { [dep: string]: DepTree };

  for (const dep of dependenciesMap.values()) {
    if (dep.root && (includeDev || dep.depType === DepType.prod)) {
      if (strict && !dep.resolved) {
        throw new OutOfSyncError(dep.name);
      }

      dependencies[dep.name] = buildTreeFromList(dep, dependenciesMap);

      if (!dep.resolved) {
        dependencies[dep.name].missingLockFileEntry = true;
      }
    }
  }

  const frequentSubTree = buildFrequentDepsSubtree(dependenciesMap);

  if (Object.keys(frequentSubTree.dependencies).length) {
    dependencies[frequentSubTree.name] = frequentSubTree;
  }

  return dependencies;
}

function collectRootDeps(manifestFile: PaketDependencies, dependenciesMap: Map<string, FlatDependency>) {
  for (const group of manifestFile) {
    const isDev = DEV_GROUPS.indexOf((group.name || '').toLowerCase()) !== -1;

    for (const dep of group.dependencies) {
      if (SUPPORTED_SOURCES.indexOf(dep.source.toLowerCase()) === -1) {
        continue;
      }

      const nugetDep = dep as NugetDependency;

      if (!dependenciesMap.has(nugetDep.name.toLowerCase())) {
        dependenciesMap.set(nugetDep.name.toLowerCase(), {
          name: nugetDep.name,
          // Will be overwritten in `collectResolvedDeps`.
          version: nugetDep.versionRange,
          // Will be overwritten in `collectResolvedDeps`.
          dependencies: [],
          depType: isDev ? DepType.dev : DepType.prod,
          root: true,
          refs: 1,
          // Will be overwritten in `collectResolvedDeps`.
          resolved: false,
        });
      }
    }
  }
}

function collectResolvedDeps(lockFile: PaketLock, dependenciesMap: Map<string, FlatDependency>) {
  for (const group of lockFile.groups) {
    const isDev = DEV_GROUPS.indexOf((group.name || '').toLowerCase()) !== -1;

    for (const dep of group.dependencies) {
      if (SUPPORTED_SOURCES.indexOf(dep.repository.toLowerCase()) === -1) {
        continue;
      }

      if (dependenciesMap.has(dep.name.toLowerCase())) {
        const rootDep = dependenciesMap.get(dep.name.toLowerCase());

        rootDep.version = dep.version;
        rootDep.dependencies = dep.dependencies.map((d) => d.name.toLowerCase());
        rootDep.resolved = true;
      } else {
        dependenciesMap.set(dep.name.toLowerCase(), {
          name: dep.name,
          version: dep.version,
          dependencies: dep.dependencies.map((d) => d.name.toLowerCase()),
          depType: isDev ? DepType.dev : DepType.prod,
          root: false,
          refs: 0,
          resolved: true,
        });
      }
    }
  }
}

function calculateReferences(node: FlatDependency, dependenciesMap: Map<string, FlatDependency>) {
  for (const subName of node.dependencies) {
    const sub = dependenciesMap.get(subName);

    sub.refs += node.refs;

    // Do not propagate calculations if we already reach threshold for the node.
    if (sub.refs < FREQUENCY_THRESHOLD) {
      calculateReferences(sub, dependenciesMap);
    }
  }
}

function buildFrequentDepsSubtree(dependenciesMap: Map<string, FlatDependency>): DepTree {
  const tree: DepTree = {
    name: 'meta-common-packages',
    version: 'meta',
    dependencies: {},
  };

  getFrequentDependencies(dependenciesMap).forEach((listItem: FlatDependency) => {
    const treeNode = buildTreeFromList(listItem, dependenciesMap);
    tree.dependencies[treeNode.name] = treeNode;
  });

  return tree;
}

function getFrequentDependencies(dependenciesMap: Map<string, FlatDependency>): FlatDependency[] {
  const frequentDeps = [];

  for (const dep of dependenciesMap.values()) {
    if (!dep.root && dep.refs >= FREQUENCY_THRESHOLD) {
      frequentDeps.push(dep);
    }
  }

  return frequentDeps;
}

function buildTreeFromList(listItem: FlatDependency, dependenciesMap: Map<string, FlatDependency>) {
  const tree = {
    name: listItem.name,
    version: listItem.version,
    dependencies: {},
    depType: listItem.depType,
  } as DepTree;

  for (const name of listItem.dependencies) {
    const subListItem = dependenciesMap.get(name);

    if (!(subListItem.refs >= FREQUENCY_THRESHOLD)) {
      const subtree = buildTreeFromList(subListItem, dependenciesMap);
      tree.dependencies[subtree.name] = subtree;
    }
  }

  return tree;
}
