import * as _ from 'lodash';

export {
  parse,
};

// TODO: sort out consistent interface usage
export interface ParsedTree {
  [dep: string]: {
    'NUGET': object;
  };
}

// possibly unnecessary repeated parsing without
// taking advantage of local knowledge of paket.lock particulars
const traverse = (node: Node, json: any) => {
  if (node.children.length === 0) {
    json[node.data] = null;
  } else {
    json[node.data] = {};
    for (const child of node.children) {
      traverse(child, json[node.data]);
    }
  }
  return json;
};

class Node {
  public parent: Node | null;
  public data: string;
  public depth: number;
  public children: Node [];

  constructor(data: any, depth: any) {
    this.parent = null;
    this.data = data;
    this.depth = depth;
    this.children = [];
  }

  public toJSON() {
    return traverse(this, {});
  }
}

// parse space indented lines into json format
function parse(
  input: string,
  indent: string = '  ' /* two spaces */,
  lineSeparator: string = '\n'): ParsedTree | null {
  const lines = input.split(lineSeparator); // for testing

  const countIndents = (line: string) => {
    const count = (line.length - _.trimStart(line).length) / indent.length;
    if (count % 1 !== 0) {
      throw new Error('Line indentation malformed');
    }
    return count;
  };

  const root = new Node('dependencies', -1);
  const nodeStack = [root];

  const stackTop = () => {
    return nodeStack[nodeStack.length - 1];
  };

  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    const indentCount = countIndents(line);

    if (indentCount >= 0) {
      while (indentCount - stackTop().depth <= 0) {
        nodeStack.pop();
      }

      // inserting and restructuring the tree
      const node = new Node(line.trim(), nodeStack.length - 1);
      node.parent = stackTop();
      node.parent.children.push(node);
      nodeStack.push(node);
    }
  }

  return root.toJSON();
}
