import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Chart as ChartJS, registerables } from 'chart.js';
import App from './App';
import './index.css';

ChartJS.register(...registerables);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/board-report-app">
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
