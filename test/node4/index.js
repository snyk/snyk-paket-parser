// TODO: remove this file when we will drop node 4 support
// tslint:disable
const buildDepTreeFromFiles = require('../../dist').buildDepTreeFromFiles;
const join = require('path').join;
const readFileSync = require('fs').readFileSync;
const deepStrictEqual = require('assert').deepStrictEqual;

[
  'simple',
  'with-test-dependencies',
].forEach((fixtureName) => {
  buildDepTreeFromFiles(
    join(__dirname, '../tree/fixtures', fixtureName),
    'paket.dependencies',
    'paket.lock',
    true)
    .then((tree) => {
      const outData = readFileSync(join(__dirname, '../tree/fixtures', fixtureName, 'out.json'), 'utf8');
      const expectedOut = JSON.parse(outData);

      deepStrictEqual(tree, expectedOut);
      console.log(`✅ ${fixtureName}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
});
