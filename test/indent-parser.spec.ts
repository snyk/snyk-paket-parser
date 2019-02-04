
import {
  parse,
  Node,
} from '../dist/indent-parser';

const packageLockContents = `NUGET
remote: https://nuget.org/api/v2
  FSharp.Core (4.0.0.1)
  Newtonsoft.Json (7.0.1)
    UnionArgParser (0.6.3)`;

const parsedLock = {
  // tbd
}

describe('Store Actions', () => {
  // beforeEach(() => {
  //   // do the parsing & prettyprinting here
  // });

  it('does stuff', () => {

    const output = parse (``);
    console.log(output);
    expect(1).toBe(1);
  });
});
