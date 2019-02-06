import * as _ from 'lodash';
import { parse, Node } from './indent-parser';

export { parseLockFile };

export interface Option {
  name: string;
  value: string;
}

export interface TransitiveDependency {
  name: string;
  versionRange: string;
  options: Option [];
}

export interface ResolvedDependency {
  name: string;
  version: string;
  options: Option [];
  repository: string;
  remote: string;
  subDependencies: TransitiveDependency [];
}

export interface LockFileRes {
  dependencies: ResolvedDependency [];
}

const REPO_TYPES = ['HTTP', 'GIST', 'GIT', 'NUGET', 'GITHUB', 'GIT'];
const GROUP_OPTIONS = ['RESTRICTION', 'TARGET_FRAMEWORK'];

// as with other dotnet-deps-parser we assume this parser will get the manifestFileContents as a string
function parseLockFile(manifestFileContents: string) {
  const depTree = {
    dependencies: {},
    hasDevDependencies: false,
    name: '',
  };
  // assume first content is always Main GROUP
  // parse from first line to next GROUP we find
  // perhaps we grab more intelligently around NUGET alone to help performance?\\
  const re = /^group\W+(.*)$/mi;
  const groups: string[] = manifestFileContents.split(/[\r\n](?=GROUP)/gi);
  const obj = {};
  // @ts-ignore
  console.log(groups);
  for (const group of groups) {
    let repo = '';
    let groupName = '';
    let lines = group.split('\n');

    if (REPO_TYPES.includes(lines[0])) {
      groupName = 'Main';
    }
    // first word in every group but the first one will be the name of the group -
    // make sure to check this when we support devDependencies separately from main deps

    // RESTRICTION
    // NUGET
    //   remote: https://nuget.org/api/v2
    //     FSharp.Core (4.0.0.1)
    //     Newtonsoft.Json (7.0.1)
    //       UnionArgParser (>=0.6.3)
    //     UnionArgParser (0.6.3)
    // GITHUB
    //   remote: forki/FsUnit

    // for (const repoType of REPO_TYPES) {
    //   // from line with no indent to next line with no indent
    //   const repo = group
    //     .substring(group.indexOf(repoType))
    //     .split(/(?:^\w+\n)|(?:\n\w+)/)[1];
    //   const parsedRepo = parse(repo);

    // }

  }

  // for (const group of groups) {
  //   const parsedGroup = parse(group);
  //   const currentDepGroup = parsedGroup.children;

  //   // absolutely not ideal another traversal to get NUGET
  //   // logic works for MVP only
  //   // TODO: make more performant
  //   _.forEach(currentDepGroup['NUGET'], (repo) => {
  //     _.forEach(repo, (dep, key: string) => {
  //       const parsed = parseLockFileRow(key);
  //       depTree.dependencies[parsed.name] = parsed;
  //     });
  //   });
  // }

  return depTree;
}

function parseLockFileRow(row: string): any {
  const rowParts = row.trim().split(' - ');
  // if (rowParts.length < 1) {

  // }
  const dependencyParts = rowParts[0].split(' ');

  return {
    name: dependencyParts[0],
    version: dependencyParts[1].slice(1, -1),
    options: parseOptions(rowParts[1]),
  };
}

function parseOptions(optionsString: string): Option [] {
  const options = [];
  for (const option of optionsString.split(', ')) {
    const optionParts = option.split(': ');
    options.push({
      name: optionParts[0],
      value: optionParts[1],
    });
  }
  return options;
}
