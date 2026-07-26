import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fc268_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fc268_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login       = (phone, password) => api.post('/auth/login',    { phone, password }).then(r => r.data);
export const register    = (data)            => api.post('/auth/register',  data).then(r => r.data);
export const getMe       = ()                => api.get('/auth/me').then(r => r.data);

// Packages
export const getPackages  = (params) => api.get('/packages',              { params }).then(r => r.data);
export const getPackage   = (id)     => api.get(`/packages/${id}`).then(r => r.data);
export const trackPackage = (num)    => api.get(`/packages/track/${num}`).then(r => r.data);
export const createPackage = (data)  => api.post('/packages', data).then(r => r.data);
export const setPin       = (id, lat, lng, notes) =>
  api.patch(`/packages/${id}/pin`, { latitude: lat, longitude: lng, deliveryNotes: notes }).then(r => r.data);
export const markDelivered = (id, data) =>
  api.patch(`/packages/${id}/deliver`, data).then(r => r.data);

// Dispatch
export const getDashboard      = ()         => api.get('/dispatch/dashboard').then(r => r.data);
export const logCustomsEntry   = (id, data) => api.patch(`/dispatch/packages/${id}/customs-entry`,   data).then(r => r.data);
export const logCustomsCleared = (id, data) => api.patch(`/dispatch/packages/${id}/customs-cleared`, data).then(r => r.data);
export const assignDriver      = (id, driverId) =>
  api.post(`/dispatch/packages/${id}/assign-driver`, { driverId }).then(r => r.data);
export const sendPinReminder   = (id) => api.post(`/dispatch/packages/${id}/send-pin-reminder`).then(r => r.data);
export const getDispatchDrivers = ()  => api.get('/dispatch/drivers').then(r => r.data);

// Location
export const postDriverLocation = (lat, lng) => api.post('/location', { lat, lng }).then(r => r.data);
export const getDriverLocations = ()         => api.get('/location/drivers').then(r => r.data);

// Drivers
export const getMyDeliveries = ()   => api.get('/drivers/my-deliveries').then(r => r.data);
export const startDelivery   = (id) => api.patch(`/drivers/packages/${id}/start-delivery`).then(r => r.data);

// Customers
export const getCustomers    = ()     => api.get('/customers').then(r => r.data);
export const createCustomer  = (data) => api.post('/customers', data).then(r => r.data);
export const createDriver    = (data) => api.post('/customers/driver', data).then(r => r.data);
