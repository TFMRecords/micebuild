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

let timeoutMs = 4000;
const timeoutIndex = process.argv.findIndex(arg => arg.startsWith('--timeout'));
if (timeoutIndex !== -1) {
  const arg = process.argv[timeoutIndex];
  if (arg.includes('=')) {
    const val = parseInt(arg.split('=')[1], 10);
    if (!isNaN(val)) timeoutMs = val;
  } else {
    const nextArg = process.argv[timeoutIndex + 1];
    if (nextArg) {
      const val = parseInt(nextArg, 10);
      if (!isNaN(val)) timeoutMs = val;
    }
  }
}

const builder = Builder(LocalFS, BaseOutputTemplate, parseRequires, haltOnError, timeoutMs);

try {
  const code = builder();
  fs.writeFileSync("_build.lua", code);
} catch (err: any) {
  console.error("\n--- Build Error ---");
  console.error(err.message || err);
  process.exit(1);
}
