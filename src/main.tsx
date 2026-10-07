import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { createServices } from '@/app/container';
import { markOfflineReady } from '@/app/offline';
import { SessionProvider } from '@/app/session';
import { App } from '@/ui/App';
import '@/ui/styles.css';

registerSW({ immediate: true, onOfflineReady: markOfflineReady }); // offline: caches the app and content packs
const services = createServices();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider services={services}>
      <App />
    </SessionProvider>
  </StrictMode>,
);
