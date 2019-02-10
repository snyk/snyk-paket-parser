import {parse} from '../../lib/dependencies-parser';
import {join} from 'path';
import {readFileSync} from 'fs';

describe('dependencies parser', () => {
  for (const fixtureName of [
    'additional-options',
    'cli-tools-in-groups',
    'default-group-indentation',
    'framework-with-colon',
    'framework-without-colon',
    'group-options',
    'groups-with-indentation',
    'options-with-no-space',
    'restriction',
    'sharp-comments',
    'slash-comments',
    'source-with-auth',
    'version-indentation',
    'version-one-equal-sign',
    'version-option',
    'version-range-and-restriction',
  ]) {
    it(fixtureName, () => {
      const depData = readFileSync(join(__dirname, 'fixtures', fixtureName, 'paket.dependencies'), 'utf8');
      const outData = readFileSync(join(__dirname, 'fixtures', fixtureName, 'out.json'), 'utf8');
      const expectedOut = JSON.parse(outData);
      const out = parse(depData);

      expect(out).toEqual(expectedOut);
    });
  }
});
