import { execute } from "./lua";

export interface SourceFile {
  name: string;
  content: string;
}

export interface SourceFS {
  preload(): string[];
  get(name: string): SourceFile | null;
}

export interface BuilderArgs {
  preload: string[];
  modules: SourceFile[];
}

export interface IOutputBuilder {
  (params: BuilderArgs): string;
}

function ModuleCodeTemplate(module: SourceFile) {
  return `
["${module.name}"]=(function(require)
${module.content}
end)`;
}

function ModuleListTemplate(modules: SourceFile[]) {
  return modules.map(module => ModuleCodeTemplate(module)).join(",");
}

function PreloadTemplate(preload: string[]) {
  return preload.map(module => `"${module}"`).join(',');
}

export const BaseOutputTemplate: IOutputBuilder = function(params: BuilderArgs) {
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

export function Builder(fs: SourceFS, tpl: IOutputBuilder) {
  return () => {
    const preload = fs.preload();
    const files = execute(preload, (filename) => {
      return fs.get(filename);
    });
    const modules = files.map(file => fs.get(file));
    const result = tpl({
      modules,
      preload: preload
    });

    return result;
  }
}
