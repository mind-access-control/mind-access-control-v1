# Edge Function Usage Examples

## Updated ef-users Edge Function

The `ef-users` edge function now supports full pagination, filtering, and sorting that matches the UserService API.

## API Endpoints

### 1. Get Users with Pagination and Filtering

```typescript
// Basic pagination
GET /functions/v1/ef-users?page=1&limit=10

// With search
GET /functions/v1/ef-users?page=1&limit=10&search=john

// With role filter
GET /functions/v1/ef-users?page=1&limit=10&role=Manager

// With status filter
GET /functions/v1/ef-users?page=1&limit=10&status=Active

// With zone filter
GET /functions/v1/ef-users?page=1&limit=10&zone=Main Entrance

// With sorting
GET /functions/v1/ef-users?page=1&limit=10&sortBy=name&sortOrder=asc

// Combined filters
GET /functions/v1/ef-users?page=1&limit=10&search=john&role=Manager&status=Active&sortBy=created_at&sortOrder=desc
```

### 2. Get Single User

```typescript
GET /functions/v1/ef-users?id=user-uuid
```

### 3. Create User

```typescript
POST /functions/v1/ef-users
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "roleName": "User",
  "statusName": "Active",
  "accessZoneNames": ["Main Entrance"],
  "faceEmbedding": [/* 128 numbers */],
  "profilePictureUrl": "https://example.com/profile.jpg"
}
```

### 4. Update User

```typescript
PUT /functions/v1/ef-users?id=user-uuid
Content-Type: application/json

{
  "fullName": "John Smith Updated",
  "roleName": "Manager",
  "accessZoneNames": ["Main Entrance", "Office Area"]
}
```

### 5. Delete User

```typescript
DELETE /functions/v1/ef-users?id=user-uuid
```

## Response Format

### Paginated Response

```typescript
{
  "data": [
    {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "User",
      "accessZones": ["Main Entrance"],
      "faceEmbedding": [/* 128 numbers */],
      "profilePictureUrl": "https://example.com/profile.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "applied": {
      "page": 1,
      "limit": 10,
      "search": "john",
      "role": "Manager"
    },
    "available": {
      "roles": [
        { "id": "role-1", "name": "User" },
        { "id": "role-2", "name": "Manager" }
      ],
      "statuses": [
        { "id": "status-1", "name": "Active" },
        { "id": "status-2", "name": "Inactive" }
      ],
      "zones": [
        { "id": "zone-1", "name": "Main Entrance" },
        { "id": "zone-2", "name": "Office Area" }
      ]
    }
  }
}
```

### Single User Response

```typescript
{
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "User",
    "accessZones": ["Main Entrance"],
    "faceEmbedding": [/* 128 numbers */],
    "profilePictureUrl": "https://example.com/profile.jpg"
  }
}
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-based) |
| `limit` | number | 10 | Items per page (max 100) |
| `search` | string | - | Search by user name |
| `role` | string | - | Filter by role name |
| `status` | string | - | Filter by status name |
| `zone` | string | - | Filter by zone name |
| `sortBy` | string | 'created_at' | Sort field: 'name', 'email', 'role', 'status', 'created_at' |
| `sortOrder` | string | 'desc' | Sort order: 'asc' or 'desc' |
| `id` | string | - | Get single user by ID |

## Using with UserService

The edge function now perfectly matches the UserService API:

```typescript
import { UserService } from '@/lib/api';

// This will call the updated edge function with pagination
const response = await UserService.getUsers({
  page: 1,
  limit: 10,
  search: 'john',
  role: 'Manager',
  status: 'Active',
  zone: 'Main Entrance',
  sortBy: 'name',
  sortOrder: 'asc'
});

console.log('Users:', response.data);
console.log('Total:', response.pagination.total);
console.log('Page:', response.pagination.page);
console.log('Has next:', response.pagination.hasNext);
console.log('Available roles:', response.filters.available.roles);
```

## Error Handling

The edge function returns proper error responses:

```typescript
// 400 Bad Request
{
  "error": "Missing required fields in request body."
}

// 404 Not Found
{
  "error": "User not found."
}

// 409 Conflict
{
  "error": "User with this email is already registered."
}

// 500 Internal Server Error
{
  "error": "Database connection failed."
}
```

## Deployment

Deploy the updated edge function:

```bash
supabase functions deploy ef-users
```

The edge function now provides full CRUD operations with pagination, filtering, and sorting that matches your UserService API perfectly! 