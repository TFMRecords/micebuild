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

    const content = fs.readFileSync(name + ".lua");

    return {
      name: name,
      content: content.toString(),
    };
  }
}

const builder = Builder(LocalFS, BaseOutputTemplate);
const code = builder();

fs.writeFileSync("_build.lua", code);
