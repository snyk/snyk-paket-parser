import {parseLines} from './line-parser';

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

export interface NugetDependency extends Dependency {
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

  // Get position of first option.
  const firstOptionMatch = /\s*[^\s]+\s*:/.exec(line);
  let dependencyString = line;
  // let optionsString = '';

  if (firstOptionMatch) {
    // Split line by position of first option.
    dependencyString = line.substr(0, firstOptionMatch.index);
    // optionsString = line.substr(firstOptionMatch.index).trim();
  }

  dependencyString = dependencyString.replace(NUGET, '').trim();

  // Split by space between words. First chunk will be name of the dependency and all rest - version.
  const dependencyStringParts = dependencyString.split(/\s+/);

  result.name = dependencyStringParts[0];
  result.versionRange = dependencyStringParts.splice(1).join(' ');

  // TODO: parse options

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
  // Split URL and option string including possible comments.
  const urlRe = /^source ([^\s]+)(.*)$/i;
  const [, url, optionsString] = line.match(urlRe);

  // Options in this line is always double quoted.
  const options: Options = {};
  const optionsRe = /(.*?)\W*:\W*"(.*?)"/g;
  const optionsStringTrimmed = optionsString.trim();

  let matches = optionsRe.exec(optionsStringTrimmed);
  while (matches) {
    options[matches[1].trim()] = matches[2].trim();
    matches = optionsRe.exec(optionsStringTrimmed);
  }

  return {
    options,
    url,
  };
}

function parseGroupOption(line: string): [string, string] {
  // Line could be separated by space or by colon.
  // TODO: Think what to do with possible comment in the line.
  const result = line.match(/(\S+?)\s*(:|\s)\s*(.*)/);
  return [result[1] || '', result[3] || ''];
}

export function parseDependenciesFile(input: string): PaketDependencies {
  const lines = parseLines(input);
  const result: PaketDependencies = [];
  let group: DependencyGroup = {
    dependencies: [],
    name: null,
    options: {},
    sources: [],
  };

  for (const line of lines) {
    const isComment = !!COMMENTS.find((comment) => line.data.startsWith(comment));

    // Ignore commented lines.
    if (isComment) {
      continue;
    }

    if (line.data.startsWith(`${GROUP} `)) {
      result.push(group);
      group = {
        dependencies: [],
        name: line.data.replace(GROUP, '').trim(),
        options: {},
        sources: [],
      };
    } else if (line.data.startsWith(`${SOURCE} `)) {
      group.sources.push(parseSource(line.data));
    } else if (line.data.startsWith(`${GITHUB} `)) {
      group.dependencies.push(parseGithub(line.data));
    } else if (line.data.startsWith(`${NUGET} `)) {
      group.dependencies.push(parseNuget(line.data));
    } else if (line.data.startsWith(`${CLITOOL} `)) {
      // TODO
    } else if (line.data.startsWith(`${GIT} `)) {
      // TODO
    } else if (line.data.startsWith(`${GIST} `)) {
      // TODO
    } else if (line.data.startsWith(`${HTTP} `)) {
      // TODO
    } else {
      const [name, value] = parseGroupOption(line.data);
      group.options[name] = value;
    }
  }

  result.push(group);

  return result;
}
