// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BrowserModelRuntime, type FromWorker, type ToWorker, type WorkerLike } from '@/adapters/ai/runtimes/browserModel';
import { ModelSettings } from './ModelSettings';

afterEach(cleanup);

class W implements WorkerLike {
  onmessage: WorkerLike['onmessage'] = null; onerror: WorkerLike['onerror'] = null;
  postMessage(_m: ToWorker) { /* the test sends replies by hand */ } // eslint-disable-line @typescript-eslint/no-unused-vars
  terminate() { /* nothing to stop */ }
  emit(m: FromWorker) { this.onmessage?.({ data: m }); }
}
const setup = () => {
  const w = new W();
  const store = new Map<string, string>();
  const rt = new BrowserModelRuntime(() => w, { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); }, removeItem: (k) => { store.delete(k); } }, 'm', 'q4', '/ort/');
  return { w, rt };
};

describe('ModelSettings', () => {
  it('explains the download, shows progress, then ready, then remove', async () => {
    const { w, rt } = setup();
    render(<ModelSettings runtime={rt} lowResource={false} />);
    expect(screen.getByText(/works fully without it/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Download model' }));
    expect(screen.getByLabelText('Model download progress')).toBeTruthy();
    act(() => w.emit({ type: 'progress', loaded: 5 * 1024 * 1024, total: 10 * 1024 * 1024 }));
    expect(screen.getByText(/5 MB of 10 MB/)).toBeTruthy();
    act(() => w.emit({ type: 'loaded' }));
    expect(screen.getByText(/Model ready/)).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Remove model' })); });
    expect(screen.getByRole('button', { name: 'Download model' })).toBeTruthy();
  });

  it('on a low-resource device the download is switched off and templates are explained', () => {
    const { rt } = setup();
    render(<ModelSettings runtime={rt} lowResource />);
    expect((screen.getByRole('button', { name: 'Download model' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/keeps using verified templates/)).toBeTruthy();
  });

  it('shows a plain error and a retry button when the model cannot start', () => {
    const { w, rt } = setup();
    render(<ModelSettings runtime={rt} lowResource={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download model' }));
    act(() => w.emit({ type: 'error', message: 'Failed to fetch' }));
    expect(screen.getByRole('alert').textContent).toContain('using templates');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
