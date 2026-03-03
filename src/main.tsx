import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { VisitsProvider } from './context/VisitsContext';
import App from './App';
import './styles/global.css';
import './styles/animations.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <VisitsProvider>
          <App />
        </VisitsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
