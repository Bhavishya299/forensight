/*
 * API service — the single Axios instance for every backend call.
 *
 * Attaches the JWT access token to each request and, on a 401,
 * transparently attempts a single refresh-token rotation before
 * retrying the original request. If refresh also fails the session is
 * cleared and the caller is redirected to /login.
 */

import axios from 'axios'
import { getToken, clearSession, refreshSession } from './auth.js'

const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL,
})

// Request interceptor — attach the bearer token when present.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — single-flight refresh on 401, then retry once.
let refreshing = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (!original || error.response?.status !== 401 || original._retried) {
      return Promise.reject(error)
    }

    // Never refresh in response to the refresh call itself — an expired or
    // revoked refresh token must fail fast so refreshSession() can clean up.
    if (String(original.url || '').includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    original._retried = true

    if (!refreshing) {
      refreshing = refreshSession().finally(() => {
        refreshing = null
      })
    }

    const ok = await refreshing
    if (!ok) {
      clearSession()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    const token = getToken()
    if (!token) {
      clearSession()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
    original.headers = original.headers || {}
    original.headers.Authorization = `Bearer ${token}`
    return api(original)
  }
)

export default api
