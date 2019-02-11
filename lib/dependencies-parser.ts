import {startsWith} from 'lodash';
import {parse as parseLines} from './line-parser';
import {Separator, tokenize} from './string-tokenizer';

const COMMENTS = ['#', '//'];
const GROUP = 'group';
const SOURCE = 'source';
// https://fsprojects.github.io/Paket/dependencies-file.html#Sources
const GITHUB = 'github';
const NUGET = 'nuget';
const CLITOOL = 'clitool';
const GIT = 'git';
const GIST = 'gist';
const HTTP = 'http';

interface Options {
  [name: string]: string;
}

interface Source {
  url: string;
  options: Options;
}

interface DependencyGroup {
  name: string | null;
  options: Options;
  sources: Source[];
  dependencies: Dependency[];
}

interface Dependency {
  source: string;
}

interface GithubDependency extends Dependency {
  source: 'github';
  repo: string;
  file: string;
  version: string;
  token: string;
}

interface NugetDependency extends Dependency {
  source: 'nuget';
  name: string;
  versionRange: string;
  options: Options;
}

export interface PaketDependencies extends Array<DependencyGroup> {
}

function parseNuget(line: string): NugetDependency {
  const result: NugetDependency = {
    name: '',
    options: {},
    source: 'nuget',
    versionRange: '',
  };

  const tokens = tokenize(line);

  result.name = tokens[1].data;

  let i = 2;

  for (; i < tokens.length; i++) {
    if ([Separator.SPACE, Separator.NONE].includes(tokens[i].separator)) {
      if (result.versionRange) {
        result.versionRange += ' ' + tokens[i].data;
      } else {
        result.versionRange = tokens[i].data;
      }
    } else {
      break;
    }
  }

  // TODO: uncomment code below and update fixtures
  // let optionName = '';
  //
  // for (; i < tokens.length; i++) {
  //   if (tokens[i].separator === Separator.COLON) {
  //     optionName = tokens[i].data;
  //   } else {
  //     if (result.options[optionName]) {
  //       result.options[optionName] += ' ' + tokens[i].data;
  //     } else {
  //       result.options[optionName] = tokens[i].data;
  //     }
  //   }
  // }

  return result;
}

// https://fsprojects.github.io/Paket/github-dependencies.html
function parseGithub(line: string): GithubDependency {
  const re = /"[^"]*"|\S+/g;
  const parts = line.match(re).splice(1);
  const [repo, version] = parts[0].split(':');

  return {
    file: parts[1] || '',
    repo,
    source: 'github',
    token: parts[2] || '',
    version: version || '',
  };
}

// https://fsprojects.github.io/Paket/nuget-dependencies.html#NuGet-feeds
function parseSource(line: string): Source {
  const tokens = tokenize(line);
  const result: Source = {
    options: {},
    url: tokens[1].data,
  };
  let optionName = '';

  for (let i = 2; i < tokens.length; i++) {
    if (tokens[i].separator === Separator.COLON) {
      optionName = tokens[i].data;
    } else {
        if (result.options[optionName]) {
          result.options[optionName] += ' ' + tokens[i].data;
        } else {
          result.options[optionName] = tokens[i].data;
        }
    }
  }

  return result;
}

function parseGroupOption(line: string): [string, string] {
  const tokens = tokenize(line);
  let value = '';

  for (let i = 1; i < tokens.length; i++) {
    if (value) {
      value += ' ' + tokens[i].data;
    } else {
      value = tokens[i].data;
    }
  }

  return [tokens[0].data, value];
}

export function parse(input: string): PaketDependencies {
  const lines = parseLines(input);
  const result: PaketDependencies = [];
  let group: DependencyGroup = {
    dependencies: [],
    name: null,
    options: {},
    sources: [],
  };

  for (const line of lines) {
    const isComment = !!COMMENTS.find((comment) => startsWith(line.data, comment));

    // Ignore commented lines.
    if (isComment) {
      continue;
    }

    if (startsWith(line.data, `${GROUP} `)) {
      result.push(group);
      group = {
        dependencies: [],
        name: line.data.replace(GROUP, '').trim(),
        options: {},
        sources: [],
      };
    } else if (startsWith(line.data, `${SOURCE} `)) {
      group.sources.push(parseSource(line.data));
    } else if (startsWith(line.data, `${GITHUB} `)) {
      group.dependencies.push(parseGithub(line.data));
    } else if (startsWith(line.data, `${NUGET} `)) {
      group.dependencies.push(parseNuget(line.data));
    } else if (startsWith(line.data, `${CLITOOL} `)) {
      // TODO
    } else if (startsWith(line.data, `${GIT} `)) {
      // TODO
    } else if (startsWith(line.data, `${GIST} `)) {
      // TODO
    } else if (startsWith(line.data, `${HTTP} `)) {
      // TODO
    } else {
      const [name, value] = parseGroupOption(line.data);
      group.options[name] = value;
    }
  }

  result.push(group);

  return result;
}
