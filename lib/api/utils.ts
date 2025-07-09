// ============================================================================
// API UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper function to get a human-readable name from a TypeScript type
 */
function getTypeName<T>(): string {
  // Try to extract type name from constructor
  try {
    // This is a fallback - we'll use a more robust approach
    return 'item';
  } catch {
    return 'item';
  }
}

/**
 * Generic function to extract data from API responses that may have nested data structures.
 * Handles multiple patterns:
 * - Direct data: response.data
 * - Nested data: response.data.data
 * - Named properties: response.data.roles, response.data.statuses, etc.
 *
 * @param response - The API response object
 * @param propertyName - Optional property name to extract (e.g., 'roles', 'statuses')
 * @returns The extracted data of type T
 * @throws Error if no valid data structure is found
 */
export function extractData<T>(response: any, propertyName?: string): T {
  // If property name is provided, try to extract from named property
  if (propertyName && response.data && typeof response.data === 'object' && propertyName in response.data) {
    return response.data[propertyName] as T;
  }

  // Check if data is nested (response.data.data)
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data as T;
  }

  // Check if data is direct (response.data)
  if (response.data !== undefined) {
    return response.data as T;
  }

  throw new Error('Invalid response structure: no data found');
}

/**
 * Validates that the extracted data is an array and returns it.
 * Useful for list endpoints that should return arrays.
 *
 * @param response - The API response object
 * @param propertyName - Optional property name to extract (e.g., 'roles', 'statuses')
 * @returns The extracted array data
 * @throws Error if data is not an array or not found
 */
export function extractArrayData<T>(response: any, propertyName?: string): T[] {
  const data = extractData<T[]>(response, propertyName);

  if (!Array.isArray(data)) {
    // Try to get a meaningful name from the property name or use a generic one
    const itemName = propertyName ? propertyName.slice(0, -1) : 'items'; // Remove 's' from plural
    throw new Error(`Invalid response structure: expected array of ${itemName}`);
  }

  return data;
}

/**
 * Validates that the extracted data is a single object and returns it.
 * Useful for single item endpoints.
 *
 * @param response - The API response object
 * @param propertyName - Optional property name to extract
 * @returns The extracted object data
 * @throws Error if data is not an object or not found
 */
export function extractObjectData<T>(response: any, propertyName?: string): T {
  const data = extractData<T>(response, propertyName);

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    // Try to get a meaningful name from the property name or use a generic one
    const itemName = propertyName || 'item';
    throw new Error(`Invalid response structure: expected ${itemName} object`);
  }

  return data;
}

/**
 * Extracts data from named properties in the response (e.g., data.roles, data.statuses).
 * This is specifically for APIs that return objects with named array properties.
 *
 * @param response - The API response object
 * @param propertyName - The property name to extract (e.g., 'roles', 'statuses', 'zones')
 * @returns The extracted array data
 * @throws Error if the property is not found or not an array
 */
export function extractNamedArrayData<T>(response: any, propertyName: string): T[] {
  return extractArrayData<T>(response, propertyName);
}
