import {parseLockFile, PaketLock, Dependency} from './lock-parser';
import {parseDependenciesFile, PaketDependencies, NugetDependency} from './dependencies-parser';
import * as path from 'path';
import * as fs from 'fs';
import {InvalidUserInputError} from './errors';

export interface DepTree {
  name: string;
  version: string;
  dependencies: {
    [dep: string]: {};
  };
  depType?: DepType;
  hasDevDependencies?: boolean;
  cyclic?: boolean;
  targetFrameworks?: string[];
}

export enum DepType {
  prod = 'prod',
  dev = 'dev',
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

  const tree = buildDependencyTree(manifestFile, lockFile, includeDev);

  tree.name = defaultManifestFileName;

  return tree;
}

function buildDependencyTree(
  manifestFile: PaketDependencies,
  lockFile: PaketLock,
  includeDev: boolean = false,
) {
  const depTree = {
    dependencies: {},
    name: '',
    version: '',
  } as DepTree;

  const dependencies: { [dep: string]: {} } = {};

  for (const group of manifestFile) {
    for (const dep of group.dependencies) {
      const current = dep as NugetDependency;
      if (current.name) {
        dependencies[current.name] = {
          name: current.name,
        };
      }
    }
  }

  for (const group of lockFile.groups) {
    const isDev = ['build', 'test', 'tests'].includes((group.name || '').toLowerCase());

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
  const subTree: { [dep: string]: {} } = {};

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
