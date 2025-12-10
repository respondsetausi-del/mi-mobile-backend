const API_BASE = 'https://mi-mobile-backend-1.onrender.com/api'

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token')
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })
  
  if (response.status === 401 || response.status === 403) {
    localStorage.clear()
    window.location.href = '/'
    throw new Error('Unauthorized')
  }
  
  return response
}

export async function apiGet(endpoint: string) {
  const res = await fetchWithAuth(endpoint)
  return res.json()
}

export async function apiPost(endpoint: string, data: any) {
  const res = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function apiPut(endpoint: string, data: any) {
  const res = await fetchWithAuth(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function apiDelete(endpoint: string) {
  const res = await fetchWithAuth(endpoint, {
    method: 'DELETE',
  })
  return res.json()
}
