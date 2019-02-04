import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';

export {
  parseLockFile,
  // parseDependenciesFile,
};

/*
input:
NUGET
  remote: https://nuget.org/api/v2
    FSharp.Core (4.0.0.1)
      Newtonsoft.Json (7.0.1)
    UnionArgParser (0.6.3)

GITHUB
  remote: forki/FsUnit
    FsUnit.fs (81d27fd09575a32c4ed52eadb2eeac5f365b8348)

Group test
NUGET
  remote: https://nuget.org/api/v2
    FSharp.Core (4.0.0.1)
GITHUB
  remote: forki/FsUnit
    FsUnit.fs (81d27fd09575a32c4ed52eadb2eeac5f365b8348)
  remote: fsharp/FAKE
    src/app/FakeLib/Globbing/Globbing.fs

 */
function parseLockFile(path: string) {
  if (!fs.existsSync(path)) {
    throw new Error('No project file found at ' +
      `location: ${path}`);
  }

  const fileContents = fs.readFileSync(path, 'utf-8');
  let lines = fileContents.split('\n');

  // if (!lines[0].includes('GROUP')) {
  //   lines = ['GROUP main'].concat(lines); //put in a different array
  // }

  // algorithm
  // take group, repo type, repo link
  // call parseSpaceIndentedStructureToJSON for lines under those



}

/*
input:
NUGET
  remote: https://nuget.org/api/v2
    FSharp.Core (4.0.0.1)
      Newtonsoft.Json (7.0.1)
    UnionArgParser (0.6.3)
output:
{
  "group main": {
    "NUGET": {
    "remote: https://nuget.org/api/v2": {
      "FSharp.Core (4.0.0.1)": {
        "Newtonsoft.Json (7.0.1)": {}
      },
      "UnionArgParser (0.6.3)": {}
    }
  }
}

 */
function parseSpaceIndentedStructure (group: string[]) {
  // we are not processing non NUGET repos
  // if (group[0].trim() !== 'NUGET') {
  //   return null;
  // }

}

/*
input:
    FSharp.Core (4.0.0.1)
      Newtonsoft.Json (7.0.1)
    UnionArgParser (0.6.3)
 */
function parseGroupRepoDepenencies(rows: string[]) {

}

/*
input:
    FSharp.Core (4.0.0.1)
 */
function parseLockFileRow (row: string) {
  const rowParts = row.trim().split(' - restriction: ');
  const dependencyParts = rowParts[0].split(' ');

  return {
    name: dependencyParts[0],
    version: dependencyParts[1].slice(1, -1),
    restriction: rowParts[1],
  }
}


