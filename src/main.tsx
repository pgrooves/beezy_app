import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
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
    <App />
  </StrictMode>,
);
