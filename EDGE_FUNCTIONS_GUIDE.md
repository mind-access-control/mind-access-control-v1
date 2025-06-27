# Edge Functions Guide

This guide explains how to use the new edge function utilities in the Mind Access Control System.

## 📁 **Files Created:**

### 1. `lib/constants.ts`
Contains all constants and configuration:
- Edge function URLs
- Authentication constants
- Error messages
- Helper functions for building URLs

### 2. `lib/edge-functions.ts`
Contains utility functions for calling edge functions:
- `callEdgeFunction()` - Generic function for authenticated requests
- `edgeFunctions` - Object with specific function calls

### 3. Updated `hooks/use-auth.ts`
Now uses the new utilities for cleaner code.

## 🚀 **How to Use:**

### **Basic Edge Function Call:**
```typescript
import { edgeFunctions } from "@/lib/edge-functions";

// Get user role by ID
const role = await edgeFunctions.getUserRoleById(userId);

// Get access zones
const zones = await edgeFunctions.getAccessZones();

// Get user roles
const roles = await edgeFunctions.getUserRoles();
```

### **Custom Edge Function Call:**
```typescript
import { callEdgeFunction } from "@/lib/edge-functions";
import { EDGE_FUNCTIONS } from "@/lib/constants";

// Custom call with parameters
const result = await callEdgeFunction(EDGE_FUNCTIONS.GET_USER_ROLE_BY_ID, {
  params: { userId: "123" }
});

// POST request with body
const result = await callEdgeFunction(EDGE_FUNCTIONS.REGISTER_NEW_USER, {
  method: "POST",
  body: { name: "John", email: "john@example.com" }
});
```

## 🔧 **Available Edge Functions:**

| Function         | Method | Description |
|------------------|--------|-------------|
| `getUserRoleById` | GET | Get user role by user ID |
| `getAccessZones` | GET | Get all access zones |
| `getUserRoles`   | GET | Get all user roles |
| `getUserStatuses` | GET | Get all user statuses |
| `registerNewUser` | POST | Register a new user |
| `validateUserFace` | POST | Validate user face |
| `ef-users`       | POST | User edit/delete operations |

## 🌍 **Environment Support:**

The utilities automatically handle different environments:

- **Local Development:** Uses `http://127.0.0.1:54321`
- **Production:** Uses `NEXT_PUBLIC_SUPABASE_URL` environment variable
- **Client-side:** Uses `window.location.origin`

## 🔐 **Authentication:**

All edge function calls automatically include:
- Current user's access token
- Proper headers
- Error handling

## 📝 **Example Usage in Components:**

```typescript
import { edgeFunctions } from "@/lib/edge-functions";
import { useState, useEffect } from "react";

export function MyComponent() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadZones() {
      try {
        const result = await edgeFunctions.getAccessZones();
        setZones(result);
      } catch (error) {
        console.error("Failed to load zones:", error);
      } finally {
        setLoading(false);
      }
    }

    loadZones();
  }, []);

  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {zones.map(zone => (
        <div key={zone.id}>{zone.name}</div>
      ))}
    </div>
  );
}
```

## 🛠 **Benefits:**

1. **Centralized Configuration:** All URLs in one place
2. **Type Safety:** TypeScript support for all functions
3. **Authentication:** Automatic token handling
4. **Error Handling:** Consistent error handling
5. **Environment Support:** Works in local and production
6. **Maintainability:** Easy to update and modify

## 🔄 **Migration from Old Code:**

### **Before:**
```typescript
const edgeFunctionUrl = `https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-user-role-by-id?userId=${userId}`;
const response = await fetch(edgeFunctionUrl, {
  method: "GET",
  headers: { "Content-Type": "application/json" }
});
```

### **After:**
```typescript
const roleResult = await edgeFunctions.getUserRoleById(userId);
```

This new approach is much cleaner, more maintainable, and provides better error handling! 