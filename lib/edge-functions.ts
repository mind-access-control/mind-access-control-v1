import { supabase } from "@/lib/supabase";
import { buildEdgeFunctionUrl, EDGE_FUNCTIONS } from "@/lib/constants";

// Utility function to make authenticated requests to edge functions
export const callEdgeFunction = async (
  functionPath: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    params?: Record<string, string>;
  } = {}
) => {
  const { method = 'GET', body, params } = options;
  
  // Get the current session for authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No active session found');
  }

  const url = buildEdgeFunctionUrl(functionPath, params);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestOptions);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Specific edge function calls
export const edgeFunctions = {
  // Get user role by ID
  getUserRoleById: (userId: string) => 
    callEdgeFunction(EDGE_FUNCTIONS.GET_USER_ROLE_BY_ID, { params: { userId } }),

  // Get access zones
  getAccessZones: () => 
    callEdgeFunction(EDGE_FUNCTIONS.GET_ACCESS_ZONES),

  // Get user roles
  getUserRoles: () => 
    callEdgeFunction(EDGE_FUNCTIONS.GET_USER_ROLES),

  // Get user statuses
  getUserStatuses: () => 
    callEdgeFunction(EDGE_FUNCTIONS.GET_USER_STATUSES),

  // Register new user
  registerNewUser: (userData: any) => 
    callEdgeFunction(EDGE_FUNCTIONS.REGISTER_NEW_USER, { 
      method: 'POST', 
      body: userData 
    }),

  // Validate user face
  validateUserFace: (faceData: any) => 
    callEdgeFunction(EDGE_FUNCTIONS.VALIDATE_USER_FACE, { 
      method: 'POST', 
      body: faceData 
    }),

  // Users edit/delete operations
  ef_users: (operation: string, data: any) => {
    switch (operation) {
      case 'list':
        return callEdgeFunction(EDGE_FUNCTIONS.EF_USERS, { method: 'GET' });
      case 'create':
        return callEdgeFunction(EDGE_FUNCTIONS.EF_USERS, { 
          method: 'POST', 
          body: data 
        });
      case 'update':
        return callEdgeFunction(EDGE_FUNCTIONS.EF_USERS, { 
          method: 'PUT', 
          body: data,
          params: { id: data.userId }
        });
      case 'delete':
        return callEdgeFunction(EDGE_FUNCTIONS.EF_USERS, { 
          method: 'DELETE',
          params: { id: data.userId }
        });
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
}; 