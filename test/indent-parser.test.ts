
import {
  parse,
} from '../lib/indent-parser';
import * as util from 'util';

const fullPacketLockContents = `
RESTRICTION: || (== net45) (== portable-net45+win8+wp8+wpa81)
NUGET
  remote: https://nuget.org/api/v2
    FSharp.Core (4.0.0.1)
    Newtonsoft.Json (7.0.1)
      UnionArgParser (>=0.6.3)
    UnionArgParser (0.6.3)
GITHUB
  remote: forki/FsUnit
    FsUnit.fs (81d27fd09575a32c4ed52eadb2eeac5f365b8348)
  remote: fsharp/FAKE
    src/app/FakeLib/Globbing/Globbing.fs (991bea743c5d5e8eec0defc7338a89281ed3f51a)
  remote: fsprojects/Chessie
    src/Chessie/ErrorHandling.fs (1f23b1caeb1f87e750abc96a25109376771dd090)

group test
NUGET
  remote: https://nuget.org/api/v2
    UnionArgParser (>=0.6.3)
    UnionArgParser (0.6.3)
  
`;

describe('indent parse', () => {
  it('correctly returns null children under dependencies', () => {

    const output = parse ('');
    expect(output).toEqual({ dependencies: null });
  });

  fit('correctly returns parsed indented tree with whitespace', () => {

    const output = parse (fullPacketLockContents);
    console.log(output);
    console.log(JSON.stringify(output));
    console.log(JSON.parse(JSON.stringify(output)));
    console.log(util.inspect(JSON.parse(JSON.stringify(output)), false, null, true))
    // expect(output).toEqual({ dependencies:
    //     { NUGET:
    //         { 'remote: https://nuget.org/api/v2':
    //             { 'FSharp.Core (4.0.0.1)': null,
    //               'Newtonsoft.Json (7.0.1)': { 'UnionArgParser (0.6.3)': null } } },
    //       GITHUB:
    //         { 'remote: forki/FsUnit':
    //             { 'FsUnit.fs (81d27fd09575a32c4ed52eadb2eeac5f365b8348)': null },
    //           'remote: fsharp/FAKE':
    //             { 'src/app/FakeLib/Globbing/Globbing.fs (991bea743c5d5e8eec0defc7338a89281ed3f51a)': null },
    //           'remote: fsprojects/Chessie':
    //             { 'src/Chessie/ErrorHandling.fs (1f23b1caeb1f87e750abc96a25109376771dd090)': null } } } }
    // );
  });
});

