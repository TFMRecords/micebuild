import luaparse from 'luaparse';

// Re-encode a normal UTF-8 JS string into the byte-per-code-unit form
// that luaparse's 'x-user-defined' encoding mode expects.
function toXUserDefined(str) {
  const bytes = new TextEncoder().encode(str); // Uint8Array of UTF-8 bytes
  let out = '';
  for (const b of bytes) {
    out += String.fromCharCode(b < 0x80 ? b : 0xF700 + b);
  }
  return out;
}

// Reverse it, e.g. for reading StringLiteral.value back as real text.
function fromXUserDefined(str) {
  const bytes = new Uint8Array(
    Array.from(str).map(ch => {
      const code = ch.codePointAt(0);
      return code >= 0xF780 && code <= 0xF7FF ? code - 0xF700 : code;
    })
  );
  return new TextDecoder('utf-8').decode(bytes);
}

export function findGlobalRequires(luaCode) {
  const ast = luaparse.parse(toXUserDefined(luaCode), { encodingMode: 'x-user-defined' });
  const globalRequires = [];

  function traverseNode(node) {
    if (!node) return;
    if (node.type === 'CallExpression') {
      if (node.base.type === 'Identifier' && node.base.name === 'require') {
        if (node.arguments.length === 1 && node.arguments[0].type === 'StringLiteral') {
          const val = node.arguments[0].value;
          if (typeof val === 'string') globalRequires.push(fromXUserDefined(val));
        }
      }
    } else if (node.type === 'StringCallExpression') {
      if (node.base.type === 'Identifier' && node.base.name === 'require') {
        if (node.argument.type === 'StringLiteral') {
          const val = node.argument.value;
          if (typeof val === 'string') globalRequires.push(fromXUserDefined(val));
        }
      }
    }
    for (let key in node) {
      if (node[key] && typeof node[key] === 'object') {
        Array.isArray(node[key]) ? node[key].forEach(traverseNode) : traverseNode(node[key]);
      }
    }
  }

  traverseNode(ast);
  return globalRequires;
}
