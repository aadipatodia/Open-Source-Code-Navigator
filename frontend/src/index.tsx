// src/index.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // <--- Ensure this path is correct
import './index.css';

// Import necessary wrappers
import { AuthProvider } from '@descope/react-sdk';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Ensure AuthProvider is the top-level wrapper */}
      <AuthProvider projectId="P31mU1cnuUKnOhciYLxjwMcIKqbM">
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);