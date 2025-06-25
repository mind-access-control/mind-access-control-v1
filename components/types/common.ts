// Define a common interface for objects with ID and Name (like zones and statuses)
export interface ItemWithNameAndId {
    id: string;
    name: string;
}

// Define the type for an observed user for the frontend
// THIS IS THE SINGLE SOURCE OF TRUTH FOR THIS INTERFACE
export interface ObservedUser {
    id: string;
    firstSeen: string;
    lastSeen: string;
    tempAccesses: number;
    accessedZones: ItemWithNameAndId[]; // Array de objetos {id, name}
    status: ItemWithNameAndId; // Objeto {id, name}
    aiAction: string | null; // <-- DEBE SER string | null
    confidence: number;
    faceImage: string | null;
}

// Tipos para el ordenamiento de la tabla
export type ObservedUserSortField =
    | "id"
    | "firstSeen"
    | "lastSeen"
    | "tempAccesses"
    | "accessedZones"
    | "status"
    | "aiAction";
export type SortDirection = "asc" | "desc";
