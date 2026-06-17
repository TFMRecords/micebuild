import { useState } from 'preact/hooks';

import { BaseOutputTemplate, Builder, SourceFS } from '../lib';

const localFiles = {} as {
  [x: string]: string;
};

const WebFS : SourceFS = {
  preload() {
    return ['init'];
  },

  get(name: string) {
    if (localFiles[name]) {
      return {
        name,
        content: localFiles[name],
      }
    }
    return null;
  }
}

const builder = Builder(WebFS, BaseOutputTemplate);

const App = () => {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');

  localFiles['init'] = code;

  function build() {
    const buildCode = builder();
    setOutput(buildCode);
  }

  return (
    <div>
      <textarea onInput={(e) => setCode(e.currentTarget.value)}></textarea>
      <button onClick={build}>Build</button>
      <textarea disabled={true}>{output}</textarea>
    </div>
  );
};

export default App;