import { readFileSync } from 'fs';
import { join } from 'path';
import {PaketLock, parseLockFile} from '../../lib/lock-parser';

function loadFixture(fixtureName: string) {
  const lockFile = readFileSync(
    join(__dirname, 'fixtures', fixtureName, 'paket.lock'),
    'utf8',
  );
  const outputFile = readFileSync(
    join(__dirname, 'fixtures', fixtureName, 'out.json'),
    'utf8',
  );
  return {
    expectedOutput: JSON.parse(outputFile),
    lockFileData: lockFile,
  };
}

function buildOptions(options: any) {
  let opts = [];

  if (!options || Object.keys(options).length === 0) {
    return '';
  }

  for (const optionName of Object.keys(options)) {
    opts.push(`${optionName}: ${options[optionName]}`);
  }

  return ' - ' + opts.join(', ');
}

function checkValidDependencyTree (paketLock: PaketLock, lockFileData: string) {
  for (const group of paketLock.groups) {
    for (const dep of group.dependencies) {
      let text = `    ${dep.name} (${dep.version})${buildOptions(dep.options)}\n`;

      for (const sd of dep.dependencies || []) {
        let version = sd.version ? ` (${sd.version})` : '';
        text += `      ${sd.name}${version}${buildOptions(sd.options)}\n`;
      }

      expect(lockFileData).toContain(text);
    }
  }
}

describe('.parseLockFile() works', () => {
  for (const fixtureName of [
    'additional-global-options',
    'dependency-multiple-options',
    // 'git-and-github', TODO: commented out because we do not support GIT repos yet.
    'global-restriction',
    'multiple-remotes',
    'restriction-and-multiple-remotes',
    'restriction-overwrite',
    'simple-github',
    'specs-nuget-and-github',
    'synthetic-nuget-github-nuget',
    'three-groups',
    'simple-dep-name-group',
  ]) {
    it(`correctly parse ${fixtureName}`, () => {
      const {lockFileData, expectedOutput} = loadFixture(fixtureName);
      const paketLock = parseLockFile(lockFileData);

      checkValidDependencyTree(paketLock, lockFileData);
      expect(paketLock).toEqual(expectedOutput);
    });
  }
});
