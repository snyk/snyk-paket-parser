import {buildDepTreeFromFiles} from '../../lib';
import {join} from 'path';
import {readFileSync} from 'fs';

describe('dependencies parser', () => {
  for (const fixtureName of [
    // 'simple',
    'with-test-dependencies',
  ]) {
    it(fixtureName, async () => {
      const tree = await buildDepTreeFromFiles(
        join(__dirname, 'fixtures', fixtureName),
        'paket.dependencies',
        'paket.lock',
        true,
      );

      tree.name = 'test';

      const outData = readFileSync(join(__dirname, 'fixtures', fixtureName, 'out.json'), 'utf8');
      const expectedOut = JSON.parse(outData);

      expect(tree).toEqual(expectedOut);
    });
  }
});
