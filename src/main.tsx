import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import './styles.css';

/**
 * The one file allowed to reach for the DOM directly: mounting is inherently
 * host-specific and this file is replaced wholesale by the native entry point
 * at port time. Everything below it goes through src/lib/platform.
 */
const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');

createRoot(root).render(
  <StrictMode>
    {/* GitHub Pages serves the app from /<repo>/, so the router needs the same
        prefix Vite built against. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
