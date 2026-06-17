import { execute } from "./lua";
import { findGlobalRequires } from "./parse";

function ModuleCodeTemplate(module) {
  return `
["${module.name}"]=(function(require)
${module.content}
end)`;
}

function ModuleListTemplate(modules) {
  return modules.map(module => ModuleCodeTemplate(module)).join(",");
}

function PreloadTemplate(preload) {
  return preload.map(module => `"${module}"`).join(',');
}

export function BaseOutputTemplate(params) {
  return `local modules = {${ModuleListTemplate(params.modules)}}
local preload = {${PreloadTemplate(params.preload)}}
local cache = {}
local tostring = tostring
local error = error
local function require(name)
if not cache[name] then
if not modules[name] then
error("Module not found: " .. tostring(name))
return
end
cache[name] = modules[name](require)
end
return cache[name]
end
for i=1, #preload do
require(preload[i])
end`.trim();
}

export function Builder(fs, tpl, parseRequires) {
  return () => {
    const preload = fs.preload();
    const files = execute(preload, (filename) => {
      return fs.get(filename);
    });

    if (parseRequires) {
      const visited = new Set(files);
      const queue = [...files];
      while (queue.length > 0) {
        const file = queue.shift();
        const sourceFile = fs.get(file);
        if (sourceFile && sourceFile.content) {
          const requires = findGlobalRequires(sourceFile.content);
          for (const req of requires) {
            if (req && typeof req === 'string' && !visited.has(req)) {
              visited.add(req);
              queue.push(req);
              files.push(req);
            }
          }
        }
      }
    }

    const modules = files.map(file => fs.get(file)).filter(Boolean);
    const result = tpl({
      modules,
      preload: preload
    });

    return result;
  }
}