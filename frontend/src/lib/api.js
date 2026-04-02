import axios from 'axios';

export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const isNgrokBaseUrl = /\.ngrok(-free)?\.(app|dev|io)$/i.test(API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL
});

if (isNgrokBaseUrl) {
  api.defaults.headers.common['ngrok-skip-browser-warning'] = '1';
}

export default api;
