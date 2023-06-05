#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

import { BaseOutputTemplate, Builder, SourceFS } from './builder';

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

const builder = Builder(LocalFS, BaseOutputTemplate);
const code = builder();

fs.writeFileSync("_build.lua", code);
