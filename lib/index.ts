import { parseLockFile, PaketLock } from './lock-parser';
import * as path from 'path';
import * as fs from 'fs';

interface DepTree {
  name: string;
  version: string;
  dependencies: {
    [dep: string]: DepTree;
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

function parse(manifestFileContents: string, lockFileContents: string, includeDev = false): DepTree {
  // parse manifestFileContents here too when the time comes
  const lockFile = parseLockFile(lockFileContents);
  return buildDependencyTree(lockFile, includeDev);
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
  /* manifestFile: PaketManifest, */ lockFile: PaketLock, includeDev: boolean = false,
) {
  const depTree = {
    dependencies: {},
    name: '',
    version: '',
  } as DepTree;

  for (const group of lockFile.groups) {
    const isDev = group.name === 'build' || group.name === 'test' || group.name === 'tests';
    if (isDev && !includeDev) {
      continue;
    }

    for (const dep of group.dependencies) {
      depTree.dependencies[dep.name] = {
        depType: isDev ? DepType.dev : DepType.prod,
        dependencies: buildSubTree(dep.dependencies),
        name: dep.name,
        version: dep.version,
      };
    }
  }
  
  return depTree;
}

function buildSubTree(dependency: any) {
  const subTree: {[dep: string]: DepTree} = {};

  for (const dep of dependency) {
    subTree[dep.name] = {
      dependencies: {},
      name: dep.name,
      version: dep.version,
    };
  }

  return subTree;
}
