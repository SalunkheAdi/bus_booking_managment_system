const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  me: () => request('/auth/me'),
  getDemoAccounts: () => request('/auth/demo-accounts'),

  // Trips
  searchTrips: (origin, destination, date) => {
    const params = new URLSearchParams();
    if (origin) params.append('origin', origin);
    if (destination) params.append('destination', destination);
    if (date) params.append('date', date);
    return request(`/trips/search?${params.toString()}`);
  },
  getCities: () => request('/trips/cities'),
  getTripDetails: (id) => request(`/trips/${id}`),
  getTripSeats: (id) => request(`/trips/${id}/seats`),

  // Bookings
  createBooking: (bookingData) => request('/bookings', { method: 'POST', body: JSON.stringify(bookingData) }),
  getMyBookings: () => request('/bookings/my-bookings'),
  getBookingByPnr: (pnr) => request(`/bookings/pnr/${encodeURIComponent(pnr)}`),
  previewCancellation: (id) => request(`/bookings/${id}/cancellation-preview`),
  cancelBooking: (id, customNow) => request(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ customNow }) }),

  // Operator
  getOperators: () => request('/operators/operators'),
  getBuses: () => request('/operators/buses'),
  createBus: (busData) => request('/operators/buses', { method: 'POST', body: JSON.stringify(busData) }),
  getRoutes: () => request('/operators/routes'),
  createRoute: (routeData) => request('/operators/routes', { method: 'POST', body: JSON.stringify(routeData) }),
  getOperatorTrips: () => request('/operators/trips'),
  createTripSchedule: (tripData) => request('/operators/trips', { method: 'POST', body: JSON.stringify(tripData) }),

  // Reports
  getPassengerManifest: (tripId) => request(`/reports/manifest/${tripId}`),
  getOccupancyReport: () => request(`/reports/occupancy`),
  getBookingSummary: () => request(`/reports/summary`),
  getAuditLogs: () => request(`/reports/audit-logs`),

  // Admin
  getCancellationRules: () => request('/admin/cancellation-rules'),
  updateCancellationRule: (id, ruleData) => request(`/admin/cancellation-rules/${id}`, { method: 'PUT', body: JSON.stringify(ruleData) })
};
