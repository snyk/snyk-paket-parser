import {
  parseLockFile,
} from '../lib/index';

const input = 
`NUGET
  remote: https://nuget.org/api/v2
    FSharp.Core (4.0.0.1)
    Newtonsoft.Json (7.0.1)
      UnionArgParser (0.6.3)
GITHUB
  remote: forki/FsUnit
    FsUnit.fs (81d27fd09575a32c4ed52eadb2eeac5f365b8348)
  remote: fsharp/FAKE
    src/app/FakeLib/Globbing/Globbing.fs (991bea743c5d5e8eec0defc7338a89281ed3f51a)
  remote: fsprojects/Chessie
    src/Chessie/ErrorHandling.fs (1f23b1caeb1f87e750abc96a25109376771dd090)

GROUP Test
NUGET
  remote: https://nuget.org/api/v2
    NUnit (2.6.4)
    NUnit.Runners (2.6.4)
`;

describe('indent parse', () => {
  it('correctly returns flat tree containing children', () => {
    const output = parseLockFile(input);
    // expect(output).toEqual({ dependencies:
    //   { 'FSharp.Core':
    //      { name: 'FSharp.Core',
    //        version: '4.0.0.1',
    //        restriction: undefined },
    //     'Newtonsoft.Json':
    //      { name: 'Newtonsoft.Json',
    //        version: '7.0.1',
    //        restriction: undefined },
    //     NUnit: { name: 'NUnit', version: '2.6.4', restriction: undefined },
    //     'NUnit.Runners':
    //      { name: 'NUnit.Runners',
    //        version: '2.6.4',
    //        restriction: undefined } },
    //  hasDevDependencies: false,
    //  name: '' });
  });
});
