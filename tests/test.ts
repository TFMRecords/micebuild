import * as fs from "fs";
import path from "path";

import { BaseOutputTemplate, Builder, SourceFS } from '../src/lib';

process.chdir(path.resolve(__dirname, "./example"));

const LocalFS : SourceFS = {
  preload() {
    return ['init'];
  },

  get(name: string) {
    if (path.relative("", name).includes('..')) {
      throw new Error("Invalid require path: " + name);
    }

    let filepath = name;

    if (fs.existsSync(filepath) && fs.lstatSync(filepath).isDirectory()) {
      filepath = path.join(filepath, "init.lua");
    } else {
      filepath += ".lua";
    }

    const content = fs.readFileSync(filepath);

    return {
      name: name,
      content: content.toString(),
    };
  }
}

const builder = Builder(LocalFS, BaseOutputTemplate, true);
const code = builder();

fs.writeFileSync("_build.lua", code);

console.log("\n--- Verification Assertions ---");
if (code.includes('["lays/string/splitChar"]')) {
  console.log("SUCCESS: require via luaparser is working!");
} else {
  console.error("FAILURE: require via luaparser is NOT working!");
  process.exit(1);
}
