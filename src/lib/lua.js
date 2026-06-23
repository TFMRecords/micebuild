import {
  to_jsstring,
  to_luastring,
  lua,
  lauxlib,
  lualib
} from "fengari";

import tfmapi from "./tfmapi";
import { findGlobalRequires } from "./parse";

const thread_status = {
  LUA_OK:        0,
  LUA_YIELD:     1,
  LUA_ERRRUN:    2,
  LUA_ERRSYNTAX: 3,
  LUA_ERRMEM:    4,
  LUA_ERRGCMM:   5,
  LUA_ERRERR:    6
};

function to_errortype(code) {
  return Object.keys(thread_status).filter(error => thread_status[error] == code)[0] || code;
}

export function execute(preload, require, parseRequires, haltOnError = true) {
  // New lua state
  const L = lauxlib.luaL_newstate();

  // Load lua libs
  lualib.luaL_openlibs(L);

  // Register JS-native bit32 preload package
  lua.lua_getglobal(L, to_luastring("package"));
  lua.lua_getfield(L, -1, to_luastring("preload"));

  lua.lua_pushjsfunction(L, (L) => {
    lua.lua_newtable(L);

    const to32 = (L, idx) => {
      return lua.lua_tonumber(L, idx) | 0;
    };

    const reg = (name, fn) => {
      lua.lua_pushjsfunction(L, fn);
      lua.lua_setfield(L, -2, to_luastring(name));
    };

    reg("bnot", (L) => {
      const a = to32(L, 1);
      lua.lua_pushnumber(L, (~a) >>> 0);
      return 1;
    });

    reg("band", (L) => {
      const n = lua.lua_gettop(L);
      if (n === 0) {
        lua.lua_pushnumber(L, 4294967295);
        return 1;
      }
      let res = to32(L, 1);
      for (let i = 2; i <= n; i++) {
        res = res & to32(L, i);
      }
      lua.lua_pushnumber(L, res >>> 0);
      return 1;
    });

    reg("bor", (L) => {
      const n = lua.lua_gettop(L);
      if (n === 0) {
        lua.lua_pushnumber(L, 0);
        return 1;
      }
      let res = to32(L, 1);
      for (let i = 2; i <= n; i++) {
        res = res | to32(L, i);
      }
      lua.lua_pushnumber(L, res >>> 0);
      return 1;
    });

    reg("bxor", (L) => {
      const n = lua.lua_gettop(L);
      if (n === 0) {
        lua.lua_pushnumber(L, 0);
        return 1;
      }
      let res = to32(L, 1);
      for (let i = 2; i <= n; i++) {
        res = res ^ to32(L, i);
      }
      lua.lua_pushnumber(L, res >>> 0);
      return 1;
    });

    reg("btest", (L) => {
      const n = lua.lua_gettop(L);
      let res = -1;
      if (n > 0) {
        res = to32(L, 1);
        for (let i = 2; i <= n; i++) {
          res = res & to32(L, i);
        }
      }
      lua.lua_pushboolean(L, res !== 0);
      return 1;
    });

    reg("lshift", (L) => {
      const a = to32(L, 1);
      let b = lua.lua_tointeger(L, 2);
      if (b < 0) {
        b = -b;
        if (b >= 32) {
          lua.lua_pushnumber(L, 0);
        } else {
          lua.lua_pushnumber(L, (a >>> b) >>> 0);
        }
      } else if (b >= 32) {
        lua.lua_pushnumber(L, 0);
      } else {
        lua.lua_pushnumber(L, (a << b) >>> 0);
      }
      return 1;
    });

    reg("rshift", (L) => {
      const a = to32(L, 1);
      let b = lua.lua_tointeger(L, 2);
      if (b < 0) {
        b = -b;
        if (b >= 32) {
          lua.lua_pushnumber(L, 0);
        } else {
          lua.lua_pushnumber(L, (a << b) >>> 0);
        }
      } else if (b >= 32) {
        lua.lua_pushnumber(L, 0);
      } else {
        lua.lua_pushnumber(L, (a >>> b) >>> 0);
      }
      return 1;
    });

    reg("arshift", (L) => {
      const a = to32(L, 1);
      let b = lua.lua_tointeger(L, 2);
      if (b < 0) {
        b = -b;
        if (b >= 32) {
          lua.lua_pushnumber(L, 0);
        } else {
          lua.lua_pushnumber(L, (a << b) >>> 0);
        }
      } else if (b >= 32) {
        if (a < 0) {
          lua.lua_pushnumber(L, 4294967295);
        } else {
          lua.lua_pushnumber(L, 0);
        }
      } else {
        lua.lua_pushnumber(L, (a >> b) >>> 0);
      }
      return 1;
    });

    reg("lrotate", (L) => {
      const a = to32(L, 1);
      let b = lua.lua_tointeger(L, 2) % 32;
      if (b < 0) b += 32;
      if (b === 0) {
        lua.lua_pushnumber(L, a >>> 0);
      } else {
        const rotated = (a << b) | (a >>> (32 - b));
        lua.lua_pushnumber(L, rotated >>> 0);
      }
      return 1;
    });

    reg("rrotate", (L) => {
      const a = to32(L, 1);
      let b = lua.lua_tointeger(L, 2) % 32;
      if (b < 0) b += 32;
      if (b === 0) {
        lua.lua_pushnumber(L, a >>> 0);
      } else {
        const rotated = (a >>> b) | (a << (32 - b));
        lua.lua_pushnumber(L, rotated >>> 0);
      }
      return 1;
    });

    reg("extract", (L) => {
      const a = to32(L, 1);
      const f = lua.lua_tointeger(L, 2);
      const w = (lua.lua_gettop(L) < 3 || lua.lua_isnil(L, 3)) ? 1 : lua.lua_tointeger(L, 3);
      if (f < 0 || w <= 0 || f + w > 32) {
        return lauxlib.luaL_error(L, to_luastring("trying to access non-existent bits"));
      }
      const mask = w === 32 ? -1 : (1 << w) - 1;
      lua.lua_pushnumber(L, ((a >>> f) & mask) >>> 0);
      return 1;
    });

    reg("replace", (L) => {
      const a = to32(L, 1);
      const v = to32(L, 2);
      const f = lua.lua_tointeger(L, 3);
      const w = (lua.lua_gettop(L) < 4 || lua.lua_isnil(L, 4)) ? 1 : lua.lua_tointeger(L, 4);
      if (f < 0 || w <= 0 || f + w > 32) {
        return lauxlib.luaL_error(L, to_luastring("trying to access non-existent bits"));
      }
      const mask = w === 32 ? -1 : (1 << w) - 1;
      const cleared = a & ~(mask << f);
      const inserted = (v & mask) << f;
      lua.lua_pushnumber(L, (cleared | inserted) >>> 0);
      return 1;
    });

    return 1;
  });
  lua.lua_setfield(L, -2, to_luastring("bit32"));
  lua.lua_pop(L, 2);

  // Handle js errors
  lua.lua_atnativeerror(L, L => {
    console.error("Lua native error:", lua.lua_touserdata(L, 1))
    return 1;
  });

  // Load tfm api
  let apiStatus = lauxlib.luaL_loadbuffer(L, to_luastring(tfmapi()), null, "tfmapi");

  // Show tfmapi script errors
  if (apiStatus !== lua.LUA_OK) {
    const message = lua.lua_tostring(L, -1);
    console.debug("tfmapi", to_errortype(apiStatus), message && to_jsstring(message));
    throw new Error("tfmapi error");
  }

  apiStatus = lua.lua_pcall(L, 0, 0, 0);
  if (apiStatus !== lua.LUA_OK) {
    const message = lua.lua_tostring(L, -1);
    console.debug("tfmapi-runtime", to_errortype(apiStatus), message && to_jsstring(message));
  }

  const libraries = {};

  function loadFile(fileName) {
    const fileResult = require(fileName);
    if (!fileResult) {
      if (haltOnError) {
        throw new Error(`File not found: ${fileName}`);
      }
      return {
        parseStatus: "LUA_ERRERR",
        runtimeStatus: "LUA_ERRERR",
        errorMessage: `File not found: ${fileName}`
      };
    }
    const { content, name } = fileResult;

    if (libraries[name]) {
      libraries[name](L);
      return;
    }

    const code = to_luastring(content);
    const chunkName = to_luastring(name + ".lua");

    loadedFiles.add(name);

    const parseStatus = lauxlib.luaL_loadbuffer(L, code, code.length, chunkName);
    let runtimeStatus;

    if (parseStatus === lua.LUA_OK) {
      runtimeStatus = lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0);

      if (runtimeStatus === lua.LUA_OK) {
        libraries[name] = lua.lua_toproxy(L, -1);
      }
    }

    const message = lua.lua_tostring(L, -1);
    const errMessage = message && to_jsstring(message);

    if (haltOnError) {
      if (parseStatus !== lua.LUA_OK) {
        throw new Error(`Syntax error in ${name}.lua:\n${errMessage}`);
      }
      if (runtimeStatus !== lua.LUA_OK) {
        throw new Error(`Runtime error in ${name}.lua:\n${errMessage}`);
      }
    }

    return {
      parseStatus: to_errortype(parseStatus),
      runtimeStatus: to_errortype(runtimeStatus),
      errorMessage: errMessage,
    };
  }

  // Files loaded through require
  const loadedFiles = new Set();

  // New require function
  lua.lua_pushjsfunction(L, (L) => {
    const param = lua.lua_tostring(L, -1);

    if (param) {
      loadFile(to_jsstring(param));
    }

    return 1;
  });
  lua.lua_setglobal(L, to_luastring("require"));

  // Clear stack
  lua.lua_settop(L, 0);

  // Load preload list
  preload.forEach(loadFile);

  // If static analysis is enabled, load statically resolved requires recursively
  if (parseRequires) {
    const queue = [...loadedFiles];
    while (queue.length > 0) {
      const file = queue.shift();
      const fileResult = require(file);
      if (fileResult && fileResult.content) {
        const requires = findGlobalRequires(fileResult.content);
        for (const req of requires) {
          if (req && typeof req === 'string' && !loadedFiles.has(req)) {
            loadFile(req);
            queue.push(req);
          }
        }
      }
    }
  }

  // Close lua state
  lua.lua_close(L);

  // Debug
  console.debug("loadedFiles:", loadedFiles);

  return [...loadedFiles];
}
