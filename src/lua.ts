import {
  to_jsstring,
  to_luastring,
  lua,
  lauxlib,
  lualib
} from "fengari";

import tfmapi from "./tfmapi";

interface RequireFunction {
  (fileName: string): {
    name: string,
    content: string,
  };
}

const thread_status = {
  LUA_OK:        0,
  LUA_YIELD:     1,
  LUA_ERRRUN:    2,
  LUA_ERRSYNTAX: 3,
  LUA_ERRMEM:    4,
  LUA_ERRGCMM:   5,
  LUA_ERRERR:    6
};

function to_errortype(code: number) {
  return Object.keys(thread_status).filter(error => thread_status[error] == code)[0] || code;
}

export function execute(preload: string[], require: RequireFunction) {
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

  function loadFile(fileName: string) {
    const { content, name } = require(fileName);

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

    return {
      parseStatus: to_errortype(parseStatus),
      runtimeStatus: to_errortype(runtimeStatus),
      errorMessage: message && to_jsstring(message),
    };
  }

  // Files loaded through require
  const loadedFiles = new Set<string>();

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
  const result = preload.map(loadFile);

  // Close lua state
  lua.lua_close(L);

  // Debug
  console.debug(result);
  console.debug("loadedFiles:", loadedFiles);

  return [...loadedFiles];
}
