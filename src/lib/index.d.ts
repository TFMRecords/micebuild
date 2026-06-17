interface RequireFunction {
  (fileName: string): {
    name: string,
    content: string,
  };
}

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

export function BaseOutputTemplate(params: BuilderArgs): string;
export function Builder(fs: SourceFS, tpl: IOutputBuilder, parseRequires?: boolean);
