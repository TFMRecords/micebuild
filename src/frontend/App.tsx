import { useState, useRef, useEffect } from 'preact/hooks';
import { BaseOutputTemplate, Builder, SourceFS } from '../lib';

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const App = () => {
  const [filesMap, setFilesMap] = useState<Record<string, { content: string, size: number }>>({});
  const [dirName, setDirName] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [buildStatus, setBuildStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [autoCopy, setAutoCopy] = useState<boolean>(true);
  const [parseRequires, setParseRequires] = useState<boolean>(true);
  const [haltOnError, setHaltOnError] = useState<boolean>(true);
  const [toast, setToast] = useState<string>('');

  const toastTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast('');
    }, 2500);
  };

  const selectDirectory = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      setDirName(handle.name);
      const loadedFiles: Record<string, { content: string, size: number }> = {};

      async function traverse(dirHandle: any, currentPath = '') {
        for await (const entry of dirHandle.values()) {
          const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          if (entry.kind === 'file') {
            if (entry.name.endsWith('.lua')) {
              const file = await entry.getFile();
              const text = await file.text();
              loadedFiles[relativePath] = { content: text, size: file.size };
            }
          } else if (entry.kind === 'directory') {
            await traverse(entry, relativePath);
          }
        }
      }

      await traverse(handle);
      setFilesMap(loadedFiles);
      setBuildStatus('idle');
      setOutput('');
      setErrorMessage('');
      showToast(`Loaded ${Object.keys(loadedFiles).length} Lua files from ${handle.name}!`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || 'Error opening directory');
        setBuildStatus('error');
      }
    }
  };

  const buildProject = () => {
    const fileCount = Object.keys(filesMap).length;
    if (fileCount === 0) {
      setErrorMessage('Please select a directory containing .lua files first.');
      setBuildStatus('error');
      return;
    }

    // Check if init.lua exists in filesMap
    if (!filesMap['init.lua']) {
      setErrorMessage('Error: init.lua not found in the loaded folder. Please select a valid project root directory.');
      setBuildStatus('error');
      return;
    }

    try {
      const webFS: SourceFS = {
        preload() {
          return ['init'];
        },
        get(name: string) {
          const candidates = [
            name,
            name + '.lua',
            name + '/init.lua'
          ];
          for (const cand of candidates) {
            if (filesMap[cand]) {
              return {
                name: name,
                content: filesMap[cand].content,
              };
            }
          }
          return null;
        }
      };

      const builder = Builder(webFS, BaseOutputTemplate, parseRequires, haltOnError);
      const buildCode = builder();

      setOutput(buildCode);
      setBuildStatus('success');
      setErrorMessage('');

      if (autoCopy) {
        navigator.clipboard.writeText(buildCode);
        showToast('Build successful! Copied to clipboard.');
      } else {
        showToast('Build successful!');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Build compilation failed');
      setBuildStatus('error');
      setOutput('');
    }
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    showToast('Copied to clipboard!');
  };

  const downloadOutput = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '_build.lua';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded _build.lua!');
  };

  const fileEntries = Object.entries(filesMap);

  return (
    <div className="app-container">
      <header>
        <h1>
          Micebuild <span className="version-badge">v0.1.0</span>
        </h1>
        <div className="status-container">
          {buildStatus === 'idle' && (
            <span className="status-badge status-badge-idle">● Idle</span>
          )}
          {buildStatus === 'success' && (
            <span className="status-badge status-badge-success">✔ Build Successful</span>
          )}
          {buildStatus === 'error' && (
            <span className="status-badge status-badge-error">✖ Build Failed</span>
          )}
        </div>
      </header>

      <main className="dashboard-grid">
        {/* Left Side: Directory Picker & Config */}
        <div className="card">
          <div className="card-title">📁 Project Configuration</div>
          
          <div className="form-group">
            <button className="btn btn-secondary" onClick={selectDirectory}>
              Select Project Folder
            </button>
            {dirName && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Active Folder: <strong style={{ color: 'var(--color-primary)' }}>{dirName}</strong>
              </div>
            )}
          </div>

          {fileEntries.length > 0 && (
            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Loaded Files ({fileEntries.length})
              </label>
              <div className="file-list-container">
                {fileEntries.map(([path, file]) => (
                  <div className="file-item" key={path}>
                    <div className="file-info">
                      <span>📄</span>
                      <span>{path}</span>
                    </div>
                    <span className="file-size">{formatSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', gap: '0.8rem' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={parseRequires}
                onChange={(e) => setParseRequires(e.currentTarget.checked)}
              />
              Enable Static Require Analysis (Luaparse)
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={haltOnError}
                onChange={(e) => setHaltOnError(e.currentTarget.checked)}
              />
              Halt on Build/Runtime Errors
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autoCopy}
                onChange={(e) => setAutoCopy(e.currentTarget.checked)}
              />
              Auto-Copy Code on Build
            </label>
          </div>

          <button
            className="btn btn-primary"
            onClick={buildProject}
            disabled={fileEntries.length === 0}
          >
            Build Project
          </button>
        </div>

        {/* Right Side: Builder Log & Code Output */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span>🛠 Output Code</span>
            {output && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Size: {formatSize(new Blob([output]).size)}
              </span>
            )}
          </div>

          {errorMessage && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              color: 'var(--color-error)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap'
            }}>
              {errorMessage}
            </div>
          )}

          <div style={{ flex: 1 }}>
            {output ? (
              <div className="code-viewer-container">
                <div className="code-header-actions">
                  <span className="code-title">_build.lua</span>
                  <div className="code-actions-buttons">
                    <button className="btn btn-secondary btn-sm" onClick={copyToClipboard}>
                      📋 Copy Code
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={downloadOutput}>
                      📥 Download
                    </button>
                  </div>
                </div>
                <pre className="code-viewer-pre"><code>{output}</code></pre>
              </div>
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                border: '2px dashed var(--border-color)',
                borderRadius: '8px',
                minHeight: '400px'
              }}>
                No built code yet. Click "Build Project" to compile.
              </div>
            )}
          </div>
        </div>
      </main>

      {toast && (
        <div className="toast">
          <span>✨</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};

export default App;