import { useSyncExternalStore } from 'react';
import { browserModel, type BrowserModelRuntime } from '@/adapters/ai/runtimes/browserModel';
import { isLowResourceDevice } from '@/adapters/ai';

const mb = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;

/** Settings card: download, use and remove the optional on-device model. */
export function ModelSettings({ runtime = browserModel, lowResource = isLowResourceDevice() }: { runtime?: BrowserModelRuntime; lowResource?: boolean }) {
  const st = useSyncExternalStore(runtime.subscribe, runtime.getState);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const pct = st.total > 0 ? Math.min(100, Math.round((st.loaded / st.total) * 100)) : undefined;

  return (
    <section className="card" aria-labelledby="set-model">
      <h2 id="set-model" style={{ marginTop: 0 }}>On-device AI model (optional)</h2>
      <p>
        NOVA works fully without it. The model only makes explanations and feedback sound more natural.
        It runs on this device. Downloading needs the internet once and uses storage (hundreds of MB). After that it works offline.
      </p>
      {lowResource && <p className="mu">This device has limited memory or CPU, so NOVA keeps using verified templates. That is the fast, reliable choice here.</p>}

      {st.status === 'not-downloaded' && (
        <div className="row">
          <button className="pri" type="button" disabled={lowResource || offline} onClick={() => { void runtime.download(); }}>Download model</button>
          {offline && <span className="mu">Connect to the internet to download.</span>}
        </div>
      )}
      {st.status === 'downloading' && (
        <div aria-live="polite">
          <progress max={100} value={pct} aria-label="Model download progress" />
          <p className="mu">Downloading{st.total > 0 ? `: ${mb(st.loaded)} of ${mb(st.total)}` : '...'} Keep this page open.</p>
        </div>
      )}
      {st.status === 'loading' && <p className="mu" aria-live="polite">Starting the model...</p>}
      {st.status === 'ready' && (
        <div aria-live="polite">
          <div className="box good">Model ready. NOVA is using it on this device.</div>
          <div className="row"><button type="button" onClick={() => { void runtime.remove(); }}>Remove model</button></div>
        </div>
      )}
      {st.status === 'error' && (
        <div aria-live="polite">
          <div className="box bad" role="alert">The model could not start, so NOVA is using templates. {st.message}</div>
          <div className="row">
            <button type="button" disabled={offline} onClick={() => { void runtime.remove().then(() => runtime.download()); }}>Try again</button>
          </div>
        </div>
      )}
    </section>
  );
}
