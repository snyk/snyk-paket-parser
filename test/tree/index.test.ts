import {buildDepTreeFromFiles} from '../../lib';
import {join} from 'path';
import {readFileSync} from 'fs';

describe('dependencies parser', () => {
  for (const fixtureName of [
    'simple',
    'with-test-dependencies',
    'frequent-deps',
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

  it('no dev deps', async () => {
    const tree = await buildDepTreeFromFiles(
      join(__dirname, 'fixtures', 'with-test-dependencies'),
      'paket.dependencies',
      'paket.lock',
      false,
    );

    tree.name = 'test';

    const outData = readFileSync(
      join(__dirname, 'fixtures', 'with-test-dependencies', 'out-without-dev.json'),
      'utf8',
    );
    const expectedOut = JSON.parse(outData);

    expect(tree).toEqual(expectedOut);
  });

  it('strict out of sync', async () => {
    try {
      await buildDepTreeFromFiles(
        join(__dirname, 'fixtures', 'out-of-sync'),
        'paket.dependencies',
        'paket.lock',
        false,
        true,
      );
    } catch (e) {
      expect(e.message).toEqual('Dependency C was not found in paket.lock. ' +
        'Your paket.dependencies and paket.lock are probably out of sync. ' +
        'Please run "paket install" and try again.');
    }
    expect.hasAssertions();
  });

  it('not strict out of sync', async () => {
    const tree = await buildDepTreeFromFiles(
      join(__dirname, 'fixtures', 'out-of-sync'),
      'paket.dependencies',
      'paket.lock',
      false,
      false,
    );

    tree.name = 'test';

    const outData = readFileSync(join(__dirname, 'fixtures', 'out-of-sync', 'out.json'), 'utf8');
    const expectedOut = JSON.parse(outData);

    expect(tree).toEqual(expectedOut);
  });
});
