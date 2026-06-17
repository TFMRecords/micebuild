#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

import { BaseOutputTemplate, Builder, SourceFS } from '../lib';

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

const haltOnError = !process.argv.includes('--no-halt') && !process.argv.includes('--halt=false');
const parseRequires = process.argv.includes('--parse-requires') || process.argv.includes('--static-requires');

const builder = Builder(LocalFS, BaseOutputTemplate, parseRequires, haltOnError);

try {
  const code = builder();
  fs.writeFileSync("_build.lua", code);
} catch (err: any) {
  console.error("\n--- Build Error ---");
  console.error(err.message || err);
  process.exit(1);
}
