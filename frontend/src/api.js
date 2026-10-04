export const API = "http://127.0.0.1:8000";

export function apiFetch(path, options = {}) {
  const url = /^https?:\/\//.test(path) ? path : `${API}${path}`;
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
}
