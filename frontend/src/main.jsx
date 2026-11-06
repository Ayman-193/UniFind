import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import { ToastProvider } from './components/ui.jsx';
// Fonts are bundled with the app (no Google Fonts request), so it looks the same offline.
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/public-sans/index.css';
import '@fontsource-variable/public-sans/wght-italic.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
