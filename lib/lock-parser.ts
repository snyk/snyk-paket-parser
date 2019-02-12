import {startsWith} from 'lodash';
import {Line, parseLines} from './line-parser';

const REPOSITORY_TYPES = ['HTTP', 'GIST', 'GIT', 'NUGET', 'GITHUB']; // naming convention in paket's standard parser
const GROUP = 'GROUP';
const REMOTE = 'REMOTE';
const SPECS = 'SPECS';

interface Option {
  [name: string]: string | null;
}

export interface Dependency {
  name: string;
  version: string;
  options: Option;
  repository?: string;
  remote?: string;
  dependencies?: Dependency[];
}

export interface Group {
  name: string;
  repositories: {
    [name: string]: string[];
  };
  dependencies: Dependency[];
  options: Option;
  specs: boolean; // TODO: keeping as meta, but what to do with this?
}

export interface PaketLock {
  groups: Group[];
}

function parseOptions(optionsString: string): Option {
  const options = {} as Option;

  for (const option of optionsString.split(/, +/)) {
    const optionParts = option.split(/: +/);
    if (optionParts[0] !== '') {
      options[optionParts[0]] = optionParts[1];
    }
  }

  return options;
}

function parseDependencyLine(line: Line, isSubDependency: boolean): Dependency {
  const re = /^([^ ]+)\W+\(([^)]+)\)\W*(.*)$/;
  const match = line.data.match(re);

  const result: Dependency = {
    name: '',
    version: '',
    options: {},
  };

  if (!match && !isSubDependency) {
    throw new Error(`Malformed paket.lock file: Missing resolved version on ${line.data}`);
  }

  //    Octokit (0.10.0)
  //      Microsoft.Net.Http
  // For this case where there is no version in the transitive,
  // we are not yet sure it is valid but want to retain the data.
  if (!match) {
    result.name = line.data;
  } else {
    result.name =  match[1];
    result.version = match[2];
    result.options = parseOptions(match[3]);
  }

  if (!isSubDependency) {
    result.dependencies = [];
  }

  return result;
}

export function parseLockFile(input: string): PaketLock {
  const result = {
    groups: [],
  } as PaketLock;
  const lines = parseLines(input);
  let group = {
    name: null,
    repositories: {} as any,
    dependencies: [],
  } as Group;
  let depContext = {} as any;
  let dependency = null;

  for (const line of lines) {
    const upperCaseLine = line.data.toUpperCase();

    if (line.indentation === 0) { // group or group option
      if (startsWith(upperCaseLine, GROUP)) {
        result.groups.push(group);
        depContext = {};
        group = {
          name: line.data.substr(GROUP.length).trim(),
          repositories: {} as any,
          dependencies: [],
        } as Group;
      } else if (REPOSITORY_TYPES.includes(upperCaseLine)) {
        depContext.repository = line.data;
        group.repositories[line.data] = [];
      } else {
        const [optionName, optionValue] = line.data.split(':');
        group.options = group.options || {};
        // TODO: keeping null option values to know the option names
        // need to decide what to do with them
        group.options[optionName.trim()] = optionValue ? optionValue.trim() : null;
      }
    } else if (line.indentation === 1) { // remote or specs
      if (startsWith(upperCaseLine, REMOTE)) {
        const remote = line.data.substring(REMOTE.length + ':'.length).trim();
        if (remote) {
          depContext.remote = remote;
          group.repositories[depContext.repository].push(remote);
        }
      } else if (startsWith(upperCaseLine, SPECS)) {
        // TODO: for now we add the specs as boolean in meta
        group.specs = true;
      }
    } else {
      const dep = parseDependencyLine(line, line.indentation === 3);

      if (line.indentation === 2) { // Resolved Dependency
        dep.remote = depContext.remote;
        dep.repository = depContext.repository;
        dependency = dep;
      } else { // Transitive Dependency
        dependency.dependencies.push(dep);
      }
    }

    if (group && dependency && !group.dependencies.includes(dependency)) {
      group.dependencies.push(dependency);
    }
  }

  result.groups.push(group);

  return result;
}
