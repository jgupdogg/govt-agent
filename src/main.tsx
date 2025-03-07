// src/main.tsx - Simple entry point without react-router-dom
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import SolanaTraders from './pages/SolanaTraders';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SolanaTraders />
    </ThemeProvider>
  </React.StrictMode>
);
