import { parseLockFile, PaketLock, ResolvedDependency } from './lock-parser';
import { parseDependenciesFile, PaketDependencies, NugetDependency } from './dependencies-parser';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';

interface DepTree {
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

enum DepType {
  prod = 'prod',
  dev = 'dev',
}

export function parse(manifestFileContents: string, lockFileContents: string, includeDev = false): DepTree {
  // parse manifestFileContents here too when the time comes
  const depFile = parseDependenciesFile(manifestFileContents);
  const lockFile = parseLockFile(lockFileContents);
  return buildDependencyTree(depFile, lockFile, includeDev);
}

function parseFromFile(
  root: string,
  manifestFilePath: string,
  lockFilePath: string,
  includeDev = false,
): DepTree {
  if (!root || !manifestFilePath || !lockFilePath) {
    throw new Error('Missing required parameters for parseFromFile()');
  }

  const manifestFileFullPath = path.resolve(root, manifestFilePath);
  const lockFileeFullPath = path.resolve(root, lockFilePath);

  if (!fs.existsSync(manifestFileFullPath)) {
    throw new Error('No paket.dependencies file found at ' +
      `location: ${manifestFileFullPath}`);
  }
  if (!fs.existsSync(lockFileeFullPath)) {
    throw new Error('No paket.lock file found at ' +
      `location: ${lockFileeFullPath}`);
  }

  const manifestFileContents = fs.readFileSync(manifestFileFullPath, 'utf-8');
  const lockFileContents = fs.readFileSync(manifestFileFullPath, 'utf-8');

  return parse(manifestFileContents, manifestFileContents, includeDev);
}

export function buildDependencyTree(
  manifestFile: PaketDependencies, lockFile: PaketLock, includeDev: boolean = false,
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
    const isDev = group.name === 'build' || group.name === 'test' || group.name === 'tests';
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

function buildSubTree(dependencies: any, groupDeps: ResolvedDependency[], isDev: boolean) {
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
