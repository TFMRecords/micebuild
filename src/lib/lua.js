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
