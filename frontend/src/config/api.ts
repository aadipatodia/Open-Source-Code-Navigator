/** Backend API base URL. Set REACT_APP_API_BASE on Vercel (e.g. https://your-app.onrender.com). */
export const API_BASE =
  process.env.REACT_APP_API_BASE?.replace(/\/$/, '') || 'http://localhost:8000';
