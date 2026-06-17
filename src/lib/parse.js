import 'luaparse';

export function findGlobalRequires(luaCode) {
  const ast = luaparse.parse(luaCode);
  const globalRequires = [];

  // Traverse AST to find global require calls
  function traverseNode(node) {
    if (node.type === 'CallStatement' && node.expression.type === 'MemberExpression') {
      const expression = node.expression;
      if (expression.base.type === 'Identifier' && expression.base.name === 'require' && expression.index.type === 'StringLiteral') {
        globalRequires.push(expression.index.value);
      }
    }

    // Recursively traverse all child nodes
    for (let key in node) {
      if (node[key] && typeof node[key] === 'object') {
        Array.isArray(node[key]) ? node[key].forEach(traverseNode) : traverseNode(node[key]);
      }
    }
  }

  traverseNode(ast);
  return globalRequires;
}