import {tokenize, Separator} from '../lib/string-tokenizer';

it('quotes error', () => {
  try {
    tokenize('"nuget SourceLink.Create.CommandLine "2.8.1 copy_local: true"');
  } catch (e) {
    expect(e.message).toEqual('Can\'t parse input ""nuget SourceLink.Create' +
      '.CommandLine "2.8.1 copy_local: true"". Quotes not closed.');
  }

  expect.hasAssertions();
});

it('space and colon separator', () => {
  const res = tokenize('nuget SourceLink.Create.CommandLine 2.8.1 copy_local: true');

  expect(res).toEqual([
    {data: 'nuget', quoted: false, separator: Separator.SPACE},
    {data: 'SourceLink.Create.CommandLine', quoted: false, separator: Separator.SPACE},
    {data: '2.8.1', quoted: false, separator: Separator.SPACE},
    {data: 'copy_local', quoted: false, separator: Separator.COLON},
    {data: 'true', quoted: false, separator: Separator.NONE},
  ]);
});

it('quoted pasts', () => {
  const res = tokenize('"nuget SourceLink.Create.CommandLine" "2.8.1 copy_local: true"');

  expect(res).toEqual([
    {data: 'nuget SourceLink.Create.CommandLine', quoted: true, separator: Separator.SPACE},
    {data: '2.8.1 copy_local: true', quoted: true, separator: Separator.NONE},
  ]);
});

it('url and comment', () => {
  const res = tokenize('source http://myserver/nuget/api/v2 username: "%PRIVATE_FEED_USER%" ' +
    'password: "%PRIVATE_FEED_PASS%" authtype: "ntlm" // test');

  expect(res).toEqual([
    {data: 'source', quoted: false, separator: Separator.SPACE},
    {data: 'http://myserver/nuget/api/v2', quoted: false, separator: Separator.SPACE},
    {data: 'username', quoted: false, separator: Separator.COLON},
    {data: '%PRIVATE_FEED_USER%', quoted: true, separator: Separator.SPACE},
    {data: 'password', quoted: false, separator: Separator.COLON},
    {data: '%PRIVATE_FEED_PASS%', quoted: true, separator: Separator.SPACE},
    {data: 'authtype', quoted: false, separator: Separator.COLON},
    {data: 'ntlm', quoted: true, separator: Separator.NONE},
  ]);
});

it('sharp comment', () => {
  const res = tokenize('source http://myserver/nuget/api/v2 # test');

  expect(res).toEqual([
    {data: 'source', quoted: false, separator: Separator.SPACE},
    {data: 'http://myserver/nuget/api/v2', quoted: false, separator: Separator.NONE},
  ]);
});
