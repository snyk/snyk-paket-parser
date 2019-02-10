import { readFileSync } from 'fs';
import { join } from 'path';
import { parseLockFile } from '../../lib/lock-parser';

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
      const output = parseLockFile(lockFileData);
      expect(output).toEqual(expectedOutput);
    });
  }
});
