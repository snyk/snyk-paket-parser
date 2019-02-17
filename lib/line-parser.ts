export class Line {
  public data: string;
  public indentation: number;

  constructor(data: string, indentation: number) {
    this.data = data;
    this.indentation = indentation;
  }
}

function countIndents(line: string, indent: string): number {
  const spaces = line.match(/^\s*/)[0].length;
  const count = spaces / indent.length;
  if (count % 1 !== 0) {
    throw new Error('Line indentation malformed');
  }
  return count;
}

// On windows machines first symbol of the file sometimes is special
// "ZERO WIDTH NO-BREAK SPACE". Remove it before continue processing because it
// could be counted as a space in `countIndents`.
//
// - https://en.wikipedia.org/wiki/Byte_order_mark
// - https://stackoverflow.com/questions/6784799/what-is-this-char-65279
function removeByteOrderMark(input: string): string {
  if (input.length > 0 && input.charAt(0) === '\uFEFF') {
    return input.substr(1);
  }
  return input;
}

// parse space indented lines into array of Lines
export function parseLines(
  input: string,
  indent: string = '  ' /* two spaces */,
  lineSeparator: RegExp = /\r?\n/, /* lines separated by \r\n on Windows */
): Line[] {

  const lines = removeByteOrderMark(input).split(lineSeparator);
  const result: Line[] = [];

  for (const line of lines) {
    const data = line.trim();

    if (data === '') { // GROUPS often separated by blank lines
      continue;
    }

    const indentation = countIndents(line, indent);

    result.push(new Line(data, indentation));
  }

  return result;
}
