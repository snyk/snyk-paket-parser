import {parse} from '../lib/line-parser';

it('parse', () => {
  const input = '\t\ta\r\n    b\nc';
  const out = parse(input);

  expect(out).toHaveLength(3);
  expect(out[0].data).toEqual('a');
  expect(out[0].indentation).toEqual(1);
  expect(out[1].data).toEqual('b');
  expect(out[1].indentation).toEqual(2);
  expect(out[2].data).toEqual('c');
  expect(out[2].indentation).toEqual(0);
});

it('parse indentation malformed', () => {
  const input = ' test';
  try {
    parse(input);
  } catch (e) {
    expect(e.message).toEqual('Line indentation malformed');
  }
  expect.hasAssertions();
});
