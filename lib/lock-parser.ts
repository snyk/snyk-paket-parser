import {startsWith} from 'lodash';
import {Line, parse as parseLines} from './line-parser';
import * as util from 'util';

const REPOSITORY_TYPES = ['HTTP', 'GIST', 'GIT', 'NUGET', 'GITHUB']; // naming convention in paket's standard parser
const GROUP = 'GROUP';
const REMOTE = 'REMOTE';
const SPECS = 'SPECS';

interface Option {
  [name: string]: string | null;
}

interface Dependency {
  name: string;
  version: string;
  options: Option;
}

interface ResolvedDependency extends Dependency {
  repository: string;
  remote: string;
  dependencies: Dependency[];
}

export interface Group {
  name: string;
  repositories: {
    [name: string]: string[];
  };
  dependencies: ResolvedDependency[];
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

function parseDependencyLine(line: Line): any {
  const re = /^([^ ]+)\W+\(([^)]+)\)\W*(.*)$/;
  const match = line.data.match(re);

  if (!match) {
    return null;
  }

  return {
    name: match[1],
    options: parseOptions(match[3]),
    version: match[2],
  };
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
  let transitives = [];
  let oldIndentation = 0;

  for (const line of lines) {
    if (oldIndentation >= line.indentation && dependency) {
      dependency.dependencies = transitives;
      group.dependencies.push(dependency);
      dependency = null;
      transitives = [];
    }

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
      const dep = parseDependencyLine(line);

      if (!dep) {
        continue;
      }

      if (line.indentation === 2) { // Resolved Dependency
        dep.remote = depContext.remote;
        dep.repository = depContext.repository;
        dependency = dep;
      } else { // Transitive Dependency
        transitives.push(dep);
      }
    }
    oldIndentation = line.indentation;
  }

  // handles final dependency & group
  if (dependency) {
    dependency.dependencies = transitives;
    group.dependencies.push(dependency);
    dependency = null;
    transitives = [];
  }
  result.groups.push(group);

  return result;
}
