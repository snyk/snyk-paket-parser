import { parse, buildDependencyTree } from '../lib/index';
import { join } from 'path';
import { readFileSync } from 'fs';
import * as util from 'util';

describe('dependencies parser', () => {
  for (const fixtureName of [
    'simple-http',
  ]) {
    it(fixtureName, () => {
      const depData = JSON.parse(
        readFileSync(join(__dirname, 'fixtures', fixtureName, 'dependencies-out.json'), 'utf8'),
      );
      const lockData = JSON.parse(
        readFileSync(join(__dirname, 'fixtures', fixtureName, 'lock-out.json'), 'utf8'),
      );
      const parsed = JSON.parse(
        readFileSync(join(__dirname, 'fixtures', fixtureName, 'parsed.json'), 'utf8'),
      );
      const tree =  buildDependencyTree(depData, lockData, false);
      expect(tree).toEqual(parsed);
    });
  }
});
