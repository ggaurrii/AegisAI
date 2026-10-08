const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const role = typeof window !== 'undefined' ? localStorage.getItem('aquaops_role') || 'manager' : 'manager';
  const headers = {
    'Content-Type': 'application/json',
    'x-user-role': role,
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `API request failed with status ${res.status}`);
  }

  return res.json();
}
