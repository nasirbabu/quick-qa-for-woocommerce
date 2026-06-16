import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';

const container = document.getElementById('quick-qa-root');
if (container) {
  createRoot(container).render(<App />);
}
