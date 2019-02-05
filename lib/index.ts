import * as _ from 'lodash';
import { parse } from './indent-parser';

export { parseLockFile };

export interface PkgNode {
  name: string;
  version: string;
  restriction: string;
  // ignoring for now - addressing later
  // depType?: DepType;
  // targetFrameworks?: string[];
}

export interface PkgTree {
  name: string;
  dependencies: {
    [dep: string]: PkgNode;
  };
  hasDevDependencies?: boolean;
}

// as with other dotnet-deps-parser we assume this parser will get the manifestFileContents as a string
function parseLockFile(manifestFileContents: string) {
  const depTree: PkgTree = {
    dependencies: {},
    hasDevDependencies: false,
    name: '',
  };

  // assume first content is always Main GROUP
  // parse from first line to next GROUP we find
  // perhaps we grab more intelligently around NUGET alone to help performance?
  const groups = manifestFileContents.split(/[Gg][Rr][Oo][Uu][Pp] +/);

  for (const group of groups) {
    const parsedGroup = parse(group);
    const currentDepGroup = parsedGroup.dependencies;

    // absolutely not ideal another traversal to get NUGET
    // logic works for MVP only
    // TODO: make more performant
    _.forEach(currentDepGroup['NUGET'], (deps) => {
      _.forEach(deps, (dep, key: string) => {
        const parsed = parseLockFileRow(key);
        depTree.dependencies[parsed.name] = parsed;
      });
    });
  }

  return depTree;
}

function parseLockFileRow(row: string): PkgNode {
  const rowParts = row.trim().split(' - restriction: ');
  const dependencyParts = rowParts[0].split(' ');

  return {
    name: dependencyParts[0],
    version: dependencyParts[1].slice(1, -1),
    restriction: rowParts[1],
  };
}
