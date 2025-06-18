export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const API_ENDPOINTS = {
  access: {
    logs: `${API_BASE_URL}/access/logs`,
    zones: `${API_BASE_URL}/access/zones`,
    updateStatus: `${API_BASE_URL}/access/status`,
    createZone: `${API_BASE_URL}/access/zones`,
  },
  users: {
    list: `${API_BASE_URL}/users`,
    create: `${API_BASE_URL}/users`,
    update: (id: string) => `${API_BASE_URL}/users/${id}`,
    delete: (id: string) => `${API_BASE_URL}/users/${id}`,
  },
}; 