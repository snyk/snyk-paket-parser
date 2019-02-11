export enum Separator {
  SPACE = 'SPACE',
  COLON = 'COLON',
  NONE = 'NONE',
}

export interface Token {
  data: string;
  separator: Separator;
  quoted: boolean;
}

export function tokenize(input: string): Token[] {
  const tokenizer = new StringTokenizer(input);
  return tokenizer.parse();
}

class StringTokenizer {
  private ptr: number = 0;
  private buffer: string[] = [];

  constructor(private input: string) {

  }

  public parse(): Token[] {
    const result = [];
    let quoteOpened = false;

    for (; this.ptr < this.input.length; this.ptr++) {
      const c = this.input.charAt(this.ptr);

      if (this.isQuote()) {
        if (quoteOpened) {
          this.ptr++;
          result.push(this.createToken(true));
          quoteOpened = false;
        } else {
          quoteOpened = true;
        }
      } else if ((c === ' ' || c === '\t' || this.isColon()) && !quoteOpened) {
        result.push(this.createToken(false));
      } else {
        this.buffer.push(c);
        // Strip comments
        if (!quoteOpened && (
          (this.buffer.length === 2 && this.buffer[0] === '/' && this.buffer[1] === '/') ||
          (this.buffer.length === 1 && this.buffer[0] === '#'))) {

          if (result.length) {
            result[result.length - 1].separator = Separator.NONE;
          }

          if (quoteOpened) {
            throw new Error(`Can't parse input "${this.input}". Quotes not closed.`);
          }
          return result;
        }
      }
    }

    if (this.buffer.length) {
      result.push(this.createToken(false));
    }

    if (quoteOpened) {
      throw new Error(`Can't parse input "${this.input}". Quotes not closed.`);
    }

    return result;
  }

  private createToken(quoted: boolean): Token {
    const data = this.buffer.join('');
    this.buffer = [];
    return {
      data,
      quoted,
      separator: this.getSeparator(),
    };
  }

  // Check if current character is quote and it is not escaped.
  private isQuote() {
    const c = this.input.charAt(this.ptr);
    let escaped = false;

    if (c !== '"') {
      return false;
    }

    let j = this.ptr - 1;

    while (j >= 0) {
      const escapeChar = this.input.charAt(j);
      if (escapeChar === '\\') {
        escaped = !escaped;
      } else {
        break;
      }
      j--;
    }

    return !escaped;
  }

  // Check if current character is colon and it's not part of URL.
  private isColon() {
    const c = this.input.charAt(this.ptr);

    if (c !== ':') {
      return false;
    }

    if (this.ptr + 1 < this.input.length && this.input.charAt(this.ptr + 1) === '/') {
      return false;
    }

    return true;
  }

  // Get token separator.
  private getSeparator(): Separator {
    let sep = Separator.NONE;

    for (; this.ptr < this.input.length; this.ptr++) {
      const c = this.input.charAt(this.ptr);

      if (c === ' ' || c === '\t') {
        if (sep === Separator.NONE) {
          sep = Separator.SPACE;
        }
      } else if (c === ':') {
        sep = Separator.COLON;
      } else {
        // Move pointer one step back.
        this.ptr--;
        break;
      }
    }

    return sep;
  }
}
