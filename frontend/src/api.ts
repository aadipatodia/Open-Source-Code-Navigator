// Axios client and error helper for talking to the FastAPI backend.
import axios, { AxiosError } from 'axios';

/** Backend API base URL. Set REACT_APP_API_BASE on Vercel (e.g. https://your-app.onrender.com). */
export const API_BASE =
  process.env.REACT_APP_API_BASE?.replace(/\/$/, '') || 'http://localhost:8000';

/** Pre-configured axios instance pointing at the backend. */
export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 120_000,
});

/** Extract a human-readable message from an axios error, or return the fallback. */
export function getApiError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;

  const err = error as AxiosError<{ detail?: string | Array<{ msg?: string }> }>;

  if (err.code === 'ECONNABORTED') {
    return 'Request timed out. The backend may be waking up on Render — wait a minute and try again.';
  }
  if (!err.response) {
    return API_BASE.includes('localhost')
      ? 'Cannot reach the API. Set REACT_APP_API_BASE to your Render URL on Vercel and redeploy.'
      : 'Cannot reach the API. Check that the Render backend is running.';
  }

  const detail = err.response.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg).filter(Boolean).join(', ') || fallback;
  }
  return fallback;
}
