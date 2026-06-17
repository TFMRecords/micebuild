import luaparse from 'luaparse';

export function findGlobalRequires(luaCode) {
  const ast = luaparse.parse(luaCode, { encodingMode: 'x-user-defined' });
  const globalRequires = [];

  // Traverse AST to find require calls
  function traverseNode(node) {
    if (!node) return;

    if (node.type === 'CallExpression') {
      if (node.base.type === 'Identifier' && node.base.name === 'require') {
        if (node.arguments.length === 1 && node.arguments[0].type === 'StringLiteral') {
          const val = node.arguments[0].value;
          if (typeof val === 'string') {
            globalRequires.push(val);
          }
        }
      }
    } else if (node.type === 'StringCallExpression') {
      if (node.base.type === 'Identifier' && node.base.name === 'require') {
        if (node.argument.type === 'StringLiteral') {
          const val = node.argument.value;
          if (typeof val === 'string') {
            globalRequires.push(val);
          }
        }
      }
    }

    // Recursively traverse all child nodes
    for (let key in node) {
      if (node[key] && typeof node[key] === 'object') {
        if (Array.isArray(node[key])) {
          node[key].forEach(traverseNode);
        } else {
          traverseNode(node[key]);
        }
      }
    }
  }

  traverseNode(ast);
  return globalRequires;
}