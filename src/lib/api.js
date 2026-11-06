// Small fetch wrapper for the SalesQuest API. Throws ApiError on non-2xx.
export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error || `Request failed (${status})`)
    this.status = status
    this.data = data
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

export const post = (path, body = {}) => api(path, { method: 'POST', body })
export const put = (path, body = {}) => api(path, { method: 'PUT', body })
