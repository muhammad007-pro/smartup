import axios from 'axios';
import { getToken, clearAuth } from './auth';
import { navigationRef } from './navigation/navigationRef';

const api = axios.create({
  baseURL: 'https://smartup-production.up.railway.app',
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await clearAuth();
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }
    return Promise.reject(err);
  }
);

export async function uploadPhoto(uri) {
  const filename = uri.split('/').pop();
  const ext = filename.split('.').pop() || 'jpg';
  const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const form = new FormData();
  form.append('file', { uri, name: filename, type });

  const token = await getToken();
  const res = await fetch('https://smartup-production.up.railway.app/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error('Rasm yuklanmadi');
  const data = await res.json();
  return { url: data.url, public_id: data.public_id };
}

export default api;
