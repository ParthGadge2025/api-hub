// Empty in local dev and Docker (same origin). Set VITE_API_URL when the server is hosted elsewhere.
export const API = import.meta.env.VITE_API_URL || "";
