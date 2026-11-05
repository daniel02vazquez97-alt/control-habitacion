const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  codigo: string;
  detalles?: unknown;
  status: number;

  constructor(status: number, codigo: string, mensaje: string, detalles?: unknown) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, { ...options, headers });

  // Manejo de expiración de token y renovación transparente
  if (response.status === 401 && !endpoint.includes('/auth/')) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const { access_token } = await refreshRes.json();
          localStorage.setItem('token', access_token);
          headers['Authorization'] = `Bearer ${access_token}`;
          response = await fetch(url, { ...options, headers });
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.hash = '#/login';
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.hash = '#/login';
      }
    }
  }

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { mensaje: response.statusText };
    }

    throw new ApiError(
      response.status,
      errorData.codigo || `HTTP_${response.status}`,
      errorData.mensaje || 'Error en la petición al servidor',
      errorData.detalles,
    );
  }

  // Manejar 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
