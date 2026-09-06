// src/lib/api.js — thin fetch client for the KrishiSetu backend
const BASE = import.meta.env.VITE_API_URL || 'https://coat-websites-eating-tracked.trycloudflare.com'

function getToken() {
  try {
    const raw = localStorage.getItem('krishisetu-auth')
    if (!raw) return null
    return JSON.parse(raw)?.state?.token || null
  } catch {
    return null
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

export const api = {
  base: BASE,
  // auth
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/api/auth/me'),
  // listings
  getListings: () => request('/api/listings'),
  createListing: (payload) => request('/api/listings', { method: 'POST', body: payload }),
  deleteListing: (id) => request(`/api/listings/${id}`, { method: 'DELETE' }),
  bid: (id) => request(`/api/listings/${id}/bid`, { method: 'POST', body: {} }),
  buyBulk: (id, qty, address) => request(`/api/listings/${id}/buy`, { method: 'POST', body: { qty, address } }),
  // orders + notifications
  getOrders: () => request('/api/orders'),
  getOrder: (id) => request(`/api/orders/${id}`),
  trackOrder: (id) => request(`/api/orders/${id}/track`),
  setShipStatus: (id, ship_status) => request(`/api/orders/${id}/ship`, { method: 'POST', body: { ship_status } }),
  setOrderStatus: (id, status) => request(`/api/orders/${id}/status`, { method: 'POST', body: { status } }),
  deleteOrder: (id) => request(`/api/orders/${id}`, { method: 'DELETE' }),
  escrowSummary: () => request('/api/escrow/summary'),
  getNotifications: () => request('/api/notifications'),
  markRead: () => request('/api/notifications/read', { method: 'POST', body: {} }),
  // b2c + payment
  checkout: (items) => request('/api/checkout', { method: 'POST', body: { items } }),
  createPayment: (amount) => request('/api/payment/create-order', { method: 'POST', body: { amount } }),
  // AI grading (Gemini vision)
  gradeImage: (image, mimeType, crop) => request('/api/grade', { method: 'POST', body: { image, mimeType, crop } }),
}

export default api
