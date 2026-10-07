// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { markOfflineReady } from '@/app/offline';
import { OfflineBadge } from './OfflineBadge';

afterEach(cleanup);

describe('OfflineBadge', () => {
  it('follows the service worker and the browser online/offline events', () => {
    render(<OfflineBadge />);
    expect(screen.getByRole('status').textContent).toMatch(/Not saved for offline use yet/);

    act(() => markOfflineReady());
    expect(screen.getByRole('status').textContent).toMatch(/Ready to work offline/);

    act(() => { fireEvent(window, new Event('offline')); });
    expect(screen.getByRole('status').textContent).toMatch(/Offline mode: working from files saved on this device/);

    act(() => { fireEvent(window, new Event('online')); });
    expect(screen.getByRole('status').textContent).toMatch(/Ready to work offline/);
  });
});
