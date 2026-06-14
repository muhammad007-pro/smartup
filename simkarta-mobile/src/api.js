import axios from 'axios';
import { getToken } from './auth';

const api = axios.create({
  baseURL: 'https://smartup-production.up.railway.app',
  timeout: 10000,
});

// Har bir so'rovga JWT tokenni avtomatik qo'shish
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
