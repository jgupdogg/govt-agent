// src/main.tsx - Simple entry point without react-router-dom
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import GovtAgent from './pages/GovtAgent';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <GovtAgent />
    </ThemeProvider>
  </React.StrictMode>
);
