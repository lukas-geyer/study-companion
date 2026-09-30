import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { init } from './state/store';
import { App } from './ui/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void init();

// Offline support: register the service worker when the page runs as a real web app (not in a preview frame).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && window.top === window.self) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
