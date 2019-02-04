import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import * as util from 'util';

import { parse } from './indent-parser';
export {
  parseLockFile,
};

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
export enum DepType {
  prod = 'prod',
  dev = 'dev',
}
/*
  As with other dotnet-deps-parser we assume this parser will get the manifestFileContents as a string
 */
function parseLockFile(manifestFileContents: string) {
  const depTree: PkgTree = {
    dependencies: {},
    hasDevDependencies: false,
    name: '',
    // version: '', does not exist
    // depType: isDev ? DepType.dev : DepType.prod,
  };

  // assume first content is always Main GROUP
  // parse from first line to next GROUP we find
  const groups = manifestFileContents.split(/[Gg][Rr][Oo][Uu][Pp] +/);
  let parsedGroups:any[] = [];

  for(let i = 0; i < groups.length; i++) {
    parsedGroups.push(parse(groups[i])); 
  }

  // console.log(util.inspect(parsedGroups, false, null, true));

  for(let i = 0; i < parsedGroups.length; i++){
    let currentDepGroup = parsedGroups[i].dependencies;
    _.forEach(currentDepGroup['NUGET'], function(deps, key) {
      _.forEach(deps, function(dep, key) {
        const parsed = parseLockFileRow(key);
        depTree.dependencies[parsed.name] = parsed;
      });
    });
  }

  return depTree;
}

function parseLockFileRow (row: string) : PkgNode{
  const rowParts = row.trim().split(' - restriction: ');
  const dependencyParts = rowParts[0].split(' ');

  return {
    name: dependencyParts[0],
    version: dependencyParts[1].slice(1, -1),
    restriction: rowParts[1],
  }
}


