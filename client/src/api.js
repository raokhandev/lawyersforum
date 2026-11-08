const TOKEN_KEY = 'lf_admin_token'

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const setToken = (t) =>
  t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY)

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed.')
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  authors: () => request('/api/authors'),
  author: (id) => request(`/api/authors/${id}`),
  articles: () => request('/api/articles'),
  article: (id) => request(`/api/articles/${id}`),
  login: (password) => request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),
  addAuthor: (body) => request('/api/admin/authors', { method: 'POST', body: JSON.stringify(body) }),
  addArticle: (body) => request('/api/admin/articles', { method: 'POST', body: JSON.stringify(body) }),
  deleteAuthor: (id) => request(`/api/admin/authors/${id}`, { method: 'DELETE' }),
  deleteArticle: (id) => request(`/api/admin/articles/${id}`, { method: 'DELETE' }),
}
