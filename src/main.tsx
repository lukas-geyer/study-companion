import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { isNative } from './native';
import { init } from './state/store';
import { App } from './ui/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void init();

// Offline support: register the service worker when the page runs as a real web app (not in a preview frame,
// not in the iOS app, which has all its files on the device anyway).
if (!isNative && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && window.top === window.self) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
