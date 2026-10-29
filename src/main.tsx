import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initCapacitorAndroidBridge } from './utils/capacitorBridge';

// Initialize Capacitor Android Native Bridge (API URL routing, hardware back button, status bar)
initCapacitorAndroidBridge();

// Prevent accidental mobile pinch-to-zoom / minimize so the webapp stays locked to the viewport
if (typeof window !== 'undefined') {
  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
  document.addEventListener('gesturestart', (event) => {
    event.preventDefault();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
