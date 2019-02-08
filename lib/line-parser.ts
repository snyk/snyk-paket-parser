import { trimStart } from 'lodash';

export class Line {
  public data: string;
  public indentation: number;

  constructor(data: string, indentation: number) {
    this.data = data;
    this.indentation = indentation;
  }
}

function countIndents(line: string, indent: string): number {
  const count = (line.length - trimStart(line).length) / indent.length;
  if (count % 1 !== 0) {
    throw new Error('Line indentation malformed');
  }
  return count;
}

// parse space indented lines into array of Lines
export function parse(
  input: string,
  indent: string = '  ' /* two spaces */,
  lineSeparator: RegExp = /\r?\n/, /* lines separated by \r\n on Windows */
): Line[] {

  const lines = input.split(lineSeparator);
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
