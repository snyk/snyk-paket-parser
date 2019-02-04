import * as _ from 'lodash';

export {
  parse,
};

const traverse = (node: Node, json: any) => {
  if(node.children.length === 0) {
    json[node.data] = null;
  } else {
    json[node.data] = {};
    for (let i = 0; i < node.children.length; i++) {
      traverse(node.children[i], json[node.data]);
    }
  }
  return json;
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

// Note: this is not yet returning valid JSON
// it returns array of given tree
  toJSON () {
    return traverse(this, {});
  };
}

// parse space indented lines into json format
function parse (input: string,
                indent: string = '  ' /* two spaces */,
                lineSeparator: string = '\n') : object | null {
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
  let stackTop = root;

  const topnode = () => {
    return nodeStack[nodeStack.length - 1];
  }


  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      continue;
    }
    const indentCount = countIndents(lines[i]);

    if (indentCount >= 0) {
      while (indentCount - topnode().depth <= 0) {
        stackTop = nodeStack.pop();
      }

      // inserting and restructuring the tree
      const node = new Node(lines[i].trim(), nodeStack.length - 1);
      node.parent = topnode();
      node.parent.children.push(node);
      nodeStack.push(node);
    }
  }

  return root.toJSON();
}
