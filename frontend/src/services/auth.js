import api from './api.js'

const ACCESS_KEY = 'forensight.accessToken'
const REFRESH_KEY = 'forensight.refreshToken'
const USER_KEY = 'forensight.user'

function safeGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage unavailable */
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function getToken() {
  return safeGet(ACCESS_KEY)
}

export function getUser() {
  try {
    const raw = safeGet(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(payload) {
  if (!payload) return
  if (payload.accessToken) safeSet(ACCESS_KEY, payload.accessToken)
  if (payload.refreshToken) safeSet(REFRESH_KEY, payload.refreshToken)
  if (payload.user) safeSet(USER_KEY, JSON.stringify(payload.user))
}

export function clearSession() {
  safeRemove(ACCESS_KEY)
  safeRemove(REFRESH_KEY)
  safeRemove(USER_KEY)
}

export function isAuthenticated() {
  return Boolean(getToken())
}

export async function login(loginId, password) {
  const res = await api.post('/auth/login', { loginId, password })
  setSession(res.data)
  return res.data
}

export async function logout() {
  const refreshToken = safeGet(REFRESH_KEY)
  try {
    if (refreshToken) await api.post('/auth/logout', { refreshToken })
  } catch {
    /* best effort */
  }
  clearSession()
}

export async function refreshSession() {
  const refreshToken = safeGet(REFRESH_KEY)
  if (!refreshToken) return null
  try {
    const res = await api.post('/auth/refresh', { refreshToken })
    setSession(res.data)
    return res.data
  } catch {
    clearSession()
    return null
  }
}
