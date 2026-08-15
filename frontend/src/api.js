import axios from 'axios';

// Campus Boda Express API (backend serves /api/v1 on port 5000 by default).
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/v1';

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
          const res = await axios.post(`${API_BASE}/auth/refresh`, {
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

// ---- System ----
export const fetchHealth = () => api.get('/health').then((r) => r.data);

// ---- Auth (Phase 2 endpoints — /auth/*) ----
export const loginUser = (data) => api.post('/auth/login', data).then((r) => r.data);
export const registerUser = (data) => api.post('/auth/register', data).then((r) => r.data);
export const fetchProfile = () => api.get('/auth/profile').then((r) => r.data);

// ---- My profile (Phase 5 — /users/me) ----
export const fetchMyProfile = () => api.get('/users/me').then((r) => r.data);
export const updateMyProfile = (data) => api.put('/users/me', data).then((r) => r.data);
export const changeMyPassword = (data) => api.patch('/users/me/password', data).then((r) => r.data);

// ---- Emergency contacts ----
export const fetchEmergencyContacts = () => api.get('/users/me/emergency-contacts').then((r) => r.data);
export const addEmergencyContact = (data) => api.post('/users/me/emergency-contacts', data).then((r) => r.data);
export const updateEmergencyContact = (contactId, data) =>
  api.put(`/users/me/emergency-contacts/${contactId}`, data).then((r) => r.data);
export const deleteEmergencyContact = (contactId) =>
  api.delete(`/users/me/emergency-contacts/${contactId}`).then((r) => r.data);

// ---- Campuses ----
export const fetchCampuses = () => api.get('/campuses').then((r) => r.data);
export const fetchPickupPoints = (campusId) =>
  api.get(`/campuses/${campusId}/pickup-points`).then((r) => r.data);

// ---- Fares ----
export const fetchFareQuote = (params) => api.get('/fares/quote', { params }).then((r) => r.data);
export const fetchCampusFare = (campusId) =>
  api.get(`/fares/campus/${campusId}`).then((r) => r.data);

// ---- Passengers ----
export const fetchPassengerProfile = (id) => api.get(`/passengers/${id}`).then((r) => r.data);
export const updatePassengerProfile = (id, data) =>
  api.put(`/passengers/${id}`, data).then((r) => r.data);

// ---- Riders ----
export const fetchRiderProfile = (id) => api.get(`/riders/${id}`).then((r) => r.data);
export const fetchMyRiderProfile = () => api.get('/riders/me').then((r) => r.data);
export const updateRiderStatus = (data) =>
  api.patch('/riders/me/status', data).then((r) => r.data);

// ---- Rides ----
export const requestRide = (data) => api.post('/rides', data).then((r) => r.data);
export const fetchRides = (params) => api.get('/rides', { params }).then((r) => r.data);
export const fetchRide = (id) => api.get(`/rides/${id}`).then((r) => r.data);
export const fetchAvailableRides = () => api.get('/rides/available').then((r) => r.data);
export const fetchActiveRide = () => api.get('/rides/active').then((r) => r.data);
export const acceptRide = (id) => api.post(`/rides/${id}/accept`).then((r) => r.data);
export const arriveRide = (id) => api.post(`/rides/${id}/arrive`).then((r) => r.data);
export const startRide = (id) => api.post(`/rides/${id}/start`).then((r) => r.data);
export const completeRide = (id, data) => api.post(`/rides/${id}/complete`, data).then((r) => r.data);
export const cancelRide = (id) => api.post(`/rides/${id}/cancel`).then((r) => r.data);

// ---- Payments ----
export const fetchPayments = (params) => api.get('/payments', { params }).then((r) => r.data);
export const initiatePayment = (data) => api.post('/payments', data).then((r) => r.data);
export const simulateConfirmPayment = (id) =>
  api.post(`/payments/${id}/simulate-confirm`).then((r) => r.data);

// ---- Reviews / Complaints / Emergencies / Notifications ----
export const fetchReviews = (params) => api.get('/reviews', { params }).then((r) => r.data);
export const createReview = (data) => api.post('/reviews', data).then((r) => r.data);
export const fetchComplaints = (params) => api.get('/complaints', { params }).then((r) => r.data);
export const createComplaint = (data) => api.post('/complaints', data).then((r) => r.data);
export const fetchEmergencies = (params) => api.get('/emergencies', { params }).then((r) => r.data);
export const fetchNotifications = () => api.get('/notifications').then((r) => r.data);
export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((r) => r.data);

// ---- Admin ----
export const fetchAdminStats = () => api.get('/admin/stats').then((r) => r.data);

export const fetchAdminCampuses = (params) => api.get('/admin/campuses', { params }).then((r) => r.data);
export const createCampus = (data) => api.post('/admin/campuses', data).then((r) => r.data);
export const updateCampus = (id, data) => api.put(`/admin/campuses/${id}`, data).then((r) => r.data);
export const deleteCampus = (id) => api.delete(`/admin/campuses/${id}`).then((r) => r.data);

export const fetchAdminPickupPoints = (params) => api.get('/admin/pickup-points', { params }).then((r) => r.data);
export const createPickupPoint = (data) => api.post('/admin/pickup-points', data).then((r) => r.data);
export const updatePickupPoint = (id, data) => api.put(`/admin/pickup-points/${id}`, data).then((r) => r.data);
export const deletePickupPoint = (id) => api.delete(`/admin/pickup-points/${id}`).then((r) => r.data);

export const fetchAdminUsers = (params) => api.get('/admin/users', { params }).then((r) => r.data);
export const updateUserStatus = (id, data) => api.patch(`/admin/users/${id}/status`, data).then((r) => r.data);

export const fetchAdminRides = (params) => api.get('/admin/rides', { params }).then((r) => r.data);
export const fetchAdminPayments = (params) => api.get('/admin/payments', { params }).then((r) => r.data);

export const fetchAdminComplaints = (params) => api.get('/admin/complaints', { params }).then((r) => r.data);
export const updateComplaint = (id, data) => api.patch(`/admin/complaints/${id}`, data).then((r) => r.data);

export const fetchAdminRiders = (params) => api.get('/admin/riders', { params }).then((r) => r.data);
export const verifyRider = (userId, data) => api.patch(`/admin/riders/${userId}/verify`, data).then((r) => r.data);
export const createAdminRider = (data) => api.post('/admin/riders', data).then((r) => r.data);
export const addRiderMotorcycle = (userId, data) =>
  api.post(`/admin/riders/${userId}/motorcycles`, data).then((r) => r.data);
export const deleteRiderMotorcycle = (userId, motorcycleId) =>
  api.delete(`/admin/riders/${userId}/motorcycles/${motorcycleId}`).then((r) => r.data);

export const fetchAdminFares = () => api.get('/admin/fares').then((r) => r.data);
export const createAdminFare = (data) => api.post('/admin/fares', data).then((r) => r.data);
export const updateAdminFare = (campusId, data) => api.put(`/admin/fares/${campusId}`, data).then((r) => r.data);

export default api;
