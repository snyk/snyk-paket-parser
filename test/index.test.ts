import {parse} from '../lib/lock-parser';
import {readFileSync} from 'fs';

// dummy test to add jest setup
describe('test', () => {
  it('jest setup', () => {
    const file = readFileSync('./test/parse-lock/fixtures/specs-nuget-and-github/paket.lock', 'utf8');
    const parsed = parse(file);
    console.log(file);
    console.log(parsed);
    console.log(JSON.stringify(parsed, null, 2));
    expect(1).toBe(1);
  });
});
