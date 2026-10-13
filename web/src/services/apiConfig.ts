// apiConfig.ts - Centralized API Endpoint Resolution
// Uses relative path "" by default (works with Vite proxy, custom domains, and tunnels)
// Can be overridden via VITE_API_BASE environment variable for separated hosting.

export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
