import * as _ from 'lodash';

export {
  parse,
  Node,
};

class Node {
  parent: Node | null;
  data: string;
  depth: number;
  children: Node [];

  constructor (data: any, depth: any) {
    this.parent = null;
    this.data = data;
    this.depth = depth;
    this.children = [];
  }

  // TODO pretty-print
}

// parse space indented lines into json format
function parse (input: string,
                indent: string = '  ' /* two spaces */,
                lineSeparator: string = '\n') : object | null {
  const lines = input.split(lineSeparator);

  const countIndents = (line: string) => {
    const count = (line.length - _.trimStart(line).length) / indent.length;
    if (count % 1 !== 0) {
      throw new Error('Line indentation malformed');
    }
    return count;
  };

  const root = new Node('root', -1);
  const nodeStack = [root];

  for (let i = 0; i < lines.length; i++) {
    const indentCount = countIndents(lines[i]);

    if (indentCount >= 0) {
      let stackTop = root;
      while (indentCount - stackTop.depth <= 0) {
        stackTop = nodeStack.pop();
      }

      // inserting and restructuring the tree
      const node = new Node(lines[i].trim(), nodeStack.length - 1);
      node.parent = stackTop;
      node.parent.children.push(node);
      nodeStack.push(node);
    }
  }

  return root;
}
