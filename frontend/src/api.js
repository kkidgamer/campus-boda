import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Axios interceptor: attach JWT access token & auto-refresh on 401
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          localStorage.setItem('access_token', res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const fetchRestaurants = () => api.get('/restaurants/').then(r => r.data);
export const fetchRestaurant = (id) => api.get(`/restaurants/${id}/`).then(r => r.data);
export const createRestaurant = (data) => api.post('/restaurants/', data).then(r => r.data);
export const updateRestaurant = (id, data) => api.put(`/restaurants/${id}/`, data).then(r => r.data);
export const deleteRestaurant = (id) => api.delete(`/restaurants/${id}/`).then(r => r.data);

export const fetchMenuItems = (params) => api.get('/menu-items/', { params }).then(r => r.data);
export const fetchMenuItem = (id) => api.get(`/menu-items/${id}/`).then(r => r.data);
export const createMenuItem = (data) => api.post('/menu-items/', data).then(r => r.data);

export const fetchOrders = (params) => api.get('/orders/', { params }).then(r => r.data);
export const fetchOrder = (id) => api.get(`/orders/${id}/`).then(r => r.data);
export const createOrder = (data) => api.post('/orders/', data).then(r => r.data);
export const updateOrder = (id, data) => api.put(`/orders/${id}/`, data).then(r => r.data);

export const fetchDeliveries = () => api.get('/deliveries/').then(r => r.data);
export const fetchReviews = (params) => api.get('/reviews/', { params }).then(r => r.data);
export const createReview = (data) => api.post('/reviews/', data).then(r => r.data);

export const fetchDashboard = () => api.get('/dashboard/').then(r => r.data);

export default api;
