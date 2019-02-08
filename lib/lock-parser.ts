import {startsWith} from 'lodash';
import {Line, parse as parseLines} from './line-parser';
import * as util from 'util';

const REPOSITORY_TYPES = ['HTTP', 'GIST', 'GIT', 'NUGET', 'GITHUB']; // naming convention in paket's standard parser
const GROUP = 'GROUP';
const REMOTE = 'remote';
const SPECS = 'specs';

interface Option {
  [name: string]: string;
}

interface Dependency {
  name: string;
  version: string;
  options: Option;
}

interface ResolvedDependency extends Dependency {
  repository: string;
  remote: string;
  group: string;
  dependencies: Dependency[];
}

export interface Group {
  name: string;
  repositories: {
    [name: string]: string[];
  };
  dependencies: ResolvedDependency[];
  options: Option;
}

export interface PaketLock {
  [name: string]: Group;
}

function parseOptions(optionsString: string): Option {
  const options = {} as Option;

  for (const option of optionsString.split(', ')) {
    const optionParts = option.split(': ');
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
  const result = {} as PaketLock;
  const lines = parseLines(input);
  let group = {
    name: 'main',
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

    if (line.indentation === 0) {
      const upperCaseLine = line.data.toUpperCase();

      if (startsWith(upperCaseLine, GROUP)) {
        result[group.name] = group;
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

        if (!optionValue) {
          // TODO: Should we do something with it?
          continue;
        }

        group.options = group.options || {};
        group.options[optionName.trim().toLowerCase()] = optionValue.trim().toLowerCase();
      }
    } else if (line.indentation === 1) {
      if (startsWith(line.data, REMOTE)) {
        const remote = line.data.match(/(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/);
        if (remote && remote[0]) {
          depContext.remote = remote[0];
          group.repositories[depContext.repository].push(remote[0]);
        }
      } else if (startsWith(line.data, SPECS)) {
        // TODO: We should do something with this, but what?
        continue;
      }
    } else {
      const dep = parseDependencyLine(line);

      if (!dep) {
        continue;
      }

      if (line.indentation === 2) { // Resolved Dependency
        dep.group = group.name;
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
  result[group.name] = group;

  return result;
}
