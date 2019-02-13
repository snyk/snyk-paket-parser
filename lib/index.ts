import {parseLockFile, PaketLock, Dependency} from './lock-parser';
import {parseDependenciesFile, PaketDependencies, NugetDependency} from './dependencies-parser';
import * as path from 'path';
import * as fs from 'fs';
import {InvalidUserInputError} from './errors';
// import * as util from 'util';

const DEV_GROUPS = ['build', 'test', 'tests'];
const FREQUENCY_THRESHOLD = 2;

interface DepCollection { [dep: string]: {}; }

export interface DepTree {
  name: string;
  version: string;
  dependencies: DepCollection;
  depType?: DepType;
  hasDevDependencies?: boolean;
  cyclic?: boolean;
  targetFrameworks?: string[];
  refs?: number;
  root?: boolean;
}

export enum DepType {
  prod = 'prod',
  dev = 'dev',
}

interface FlatDependency {
  name: string;
  version: string;
  dependencies: string[];
  root: boolean;
  refs: number;
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

  return await buildDepTree(manifestFileContents, lockFileContents, includeDev, strict, manifestFileFullPath);
}

export async function buildDepTree(
  manifestFileContents: string,
  lockFileContents: string,
  includeDev: boolean = false,
  strict: boolean = true,
  defaultManifestFileName: string = 'paket.dependencies',
): Promise<DepTree> {
  const manifestFile = parseDependenciesFile(manifestFileContents);
  const lockFile = parseLockFile(lockFileContents);

  const tree = buildTreeFromParsed(manifestFile, lockFile, includeDev);

  tree.name = defaultManifestFileName;

  return tree;
}

function buildTreeFromParsed(
  manifestFile: PaketDependencies,
  lockFile: PaketLock,
  includeDev: boolean = false,
) {
  const depTree = {
    dependencies: {},
    name: '',
    version: '',
  } as DepTree;

  let dependencies = {} as DepCollection;
  let dependenciesMap = {} as DepCollection;

  dependencies = getRootDeps(manifestFile);
  dependenciesMap = getResolvedDeps(lockFile, dependencies);

  for (const mapped in dependenciesMap) {
    if (dependenciesMap.hasOwnProperty(mapped)) {
      calculateReferences(dependenciesMap[mapped], dependenciesMap);
    }
  }

  const frequent = getFrequentDependencies(dependenciesMap);
  const frequentSubTree = buildFrequentDepsSubtree(dependenciesMap);

  // console.log(util.inspect(JSON.stringify(frequent), false, null, true))
  // console.log(util.inspect(JSON.stringify(frequentSubTree), false, null, true))

  for (const group of lockFile.groups) {
    const isDev = DEV_GROUPS.indexOf((group.name || '').toLowerCase()) !== -1;

    if (isDev && !includeDev) {
      continue;
    }

    for (const dep of group.dependencies) {
      if (dependencies[dep.name]) {
        dependencies[dep.name] = {
          depType: isDev ? DepType.dev : DepType.prod,
          dependencies: buildSubTree(dep.dependencies, group.dependencies, isDev),
          name: dep.name,
          version: dep.version,
        };
      }
    }
  }

  depTree.dependencies = dependencies;

  return depTree;
}

function buildSubTree(dependencies: any, groupDeps: Dependency[], isDev: boolean) {
  const subTree = {} as DepCollection;

  for (const currDep of dependencies) {
    for (const dep of groupDeps) {
      if (dep.name === currDep.name) {
        subTree[dep.name] = {
          depType: isDev ? DepType.dev : DepType.prod,
          dependencies: buildSubTree(dep.dependencies, groupDeps, isDev),
          name: dep.name,
          version: dep.version,
        };
      }
    }
  }
  return subTree;
}

function createDependency(dependency: any, root: boolean) {
  return {
    name: dependency.name,
    version: dependency.version,
    dependencies: dependency.dependencies,
    root,
    refs: root ? 1 : 0,
  };
}

function getRootDeps(manifestFile: PaketDependencies) {
  const rootDeps = {} as DepCollection;

  for (const group of manifestFile) {
    for (const dep of group.dependencies) {
      const current = dep as NugetDependency;
      if (current.name) {
        rootDeps[current.name] = {
          name: current.name,
          version: null as string,
          dependencies: null as DepCollection,
          root: true,
          refs: 1,
        } as DepTree;
      }
    }
  }

  return rootDeps;
}

function getResolvedDeps(lockFile: PaketLock, rootDeps: DepCollection) {
  const resolvedDeps = {} as DepCollection;
  for (const group of lockFile.groups) {
    const isDev = DEV_GROUPS.includes((group.name || '').toLowerCase());

    for (const dep of group.dependencies) {
      resolvedDeps[dep.name] = {
        name: dep.name,
        version: dep.version,
        dependencies: buildSubTree(dep.dependencies, group.dependencies, isDev),
        depType: isDev ? DepType.dev : DepType.prod,
        root: rootDeps[dep.name] ? true : false,
        refs: rootDeps[dep.name] ? 1 : 0,
      } as DepTree;
    }
  }
  return resolvedDeps;
}

function calculateReferences(node: any, dependencies: DepCollection) {
  for (const subName in node.dependencies) {
    if (node.dependencies.hasOwnProperty(subName)) {
      const sub = dependencies[subName] as DepTree;

      sub.refs += node.refs;

      // Do not propagate calculations if we already reach threshold for the node.
      if (sub.refs < FREQUENCY_THRESHOLD) {
        calculateReferences(sub, dependencies);
      }
    }
  }
}

function buildFrequentDepsSubtree(dependencies: DepCollection) {
  const tree = {
    name: 'meta-common-packages',
    version: 'meta',
    dependencies: {} as DepCollection,
  };

  getFrequentDependencies(dependencies).forEach((listItem: DepTree) => {
    const treeNode = buildTreeFromList(listItem, dependencies);
    tree.dependencies[treeNode.name] = treeNode;
  });

  return tree;
}

function getFrequentDependencies(dependencies: DepCollection) {
  const frequentDeps = [] as any;
  for (const depName in dependencies) {
    if (dependencies.hasOwnProperty(depName)) {
      const current = dependencies[depName] as DepTree;
      if (!current.root &&  current.refs >= FREQUENCY_THRESHOLD) {
        frequentDeps.push(current);
      }
    }
  }
  return frequentDeps;
}

function buildTreeFromList(listItem: DepTree, dependencies: DepCollection) {
  const tree = {
    name: listItem.name,
    version: listItem.version!,
    dependencies: {} as DepCollection,
  };

  for (const name in listItem.dependencies) {
    if (listItem.dependencies.hasOwnProperty(name)) {
      const subListItem = dependencies[name] as DepTree;

      if (!(subListItem.refs >= FREQUENCY_THRESHOLD)) {
        const subtree = buildTreeFromList(subListItem, dependencies);
        tree.dependencies[subtree.name] = subtree;
      }
    }
  }

  return tree;
}
