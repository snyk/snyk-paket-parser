import {startsWith} from 'lodash';
import {Line, parse as parseLines} from './line-parser';

const REPOSITORY_TYPES = ['HTTP', 'GIST', 'GIT', 'NUGET', 'GITHUB'];
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

interface LockResult {
  dependencies: ResolvedDependency [];
}

function parseOptions(optionsString: string): Option {
  const options = {} as Option;

  for (const option of optionsString.split(', ')) {
    const optionParts = option.split(': ');

    options[optionParts[0]] = optionParts[1];
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

export function parse(input: string): LockResult {
  const result = { dependencies: [] } as LockResult;
  const lines = parseLines(input);
  let context = {} as any;
  let dependency = null;
  let transitives = [];
  let oldIndentation = 0;

  for (const line of lines) {
    if (oldIndentation >= line.indentation && dependency) {
      dependency.dependencies = transitives;
      result.dependencies.push(dependency);
      dependency = null;
      transitives = [];
    }

    if (line.indentation === 0) {
      const upperCaseLine = line.data.toUpperCase();

      if (startsWith(upperCaseLine, GROUP)) {
        context = {};
        context.group = line.data.substr(GROUP.length).trim();
      } else if (REPOSITORY_TYPES.includes(upperCaseLine)) {
        context.repository = line.data;
      } else {
        const [optionName, optionValue] = line.data.split(':');

        if (!optionValue) {
          // TODO: Should we do something with it?
          continue;
        }

        context.options = context.options || {};
        context.options[optionName.trim().toLowerCase()] = optionValue.trim();
      }
    } else if (line.indentation === 1) {
      if (startsWith(line.data, REMOTE)) {
        const parts = line.data.split(':');

        if (parts[1]) {
          context.remote = parts[1].trim();
        }
      } else if (startsWith(line.data, SPECS)) {
        continue;
      }
    } else {
      const dep = parseDependencyLine(line);

      if (!dep) {
        continue;
      }
      Object.assign(dep.options, context.options);

      if (line.indentation === 2) { // Resolved Dependency
        dep.group = context.group;
        dep.remote = context.remote;
        dep.repository = context.repository;
        dependency = dep;
      } else { // Transitive Dependency
        transitives.push(dep);
      }
    }
    oldIndentation = line.indentation;
  }

  // handles final dependency
  if (dependency) {
    dependency.dependencies = transitives;
    result.dependencies.push(dependency);
    dependency = null;
  }

  return result;
}
