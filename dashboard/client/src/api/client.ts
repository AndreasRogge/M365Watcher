import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Token provider — set by AuthProvider once initialized
let tokenProvider: (() => Promise<string | null>) | null = null;

export function setTokenProvider(provider: () => Promise<string | null>) {
  tokenProvider = provider;
}

// Request interceptor: attach bearer token when in user mode
api.interceptors.request.use(async (reqConfig) => {
  if (tokenProvider) {
    const token = await tokenProvider();
    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
  }
  return reqConfig;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

export default api;
