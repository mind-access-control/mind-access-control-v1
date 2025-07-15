// Import types from the types file
import type { Column } from '@/lib/api/types';
import { EMPTY_STRING } from '@/lib/constants';

// 3. CSV Template Content
export const csvTemplateContent = `Full Name,Email Address,User Role,Job Title,Access Zones,Photo URL
John Doe,john.doe@example.com,Admin,Security Officer,"Main Entrance,Server Room,Zone A",https://example.com/photos/john.jpg
Jane Smith,jane.smith@example.com,User,Software Engineer,"Main Entrance,Zone B",https://example.com/photos/jane.jpg
`;

// 4. Zones Data
export const zones = [
  { id: 1, name: 'Main Entrance' },
  { id: 2, name: 'Zone A' },
  { id: 3, name: 'Zone B' },
  { id: 4, name: 'Server Room' },
  { id: 5, name: 'Warehouse' },
  { id: 6, name: 'Executive Suite' },
  { id: 7, name: 'Cafeteria' },
];

// 5. Cameras Data
export const cameras = [
  { id: 1, name: 'Camera 1', zone: 'Main Entrance', location: 'Front Door' },
  { id: 2, name: 'Camera 2', zone: 'Zone A', location: 'North Corner' },
  { id: 3, name: 'Camera 3', zone: 'Server Room', location: 'Server Rack 3' },
  { id: 4, name: 'Camera 4', zone: 'Warehouse', location: 'Loading Dock' },
];

// 6. Risk Score Data
export const riskScore = {
  score: 23,
  status: 'low' as 'low' | 'moderate' | 'high',
};

// 7. KPI Data
export const kpiData = {
  totalUsers: 247,
  activeZones: 12,
  accessesToday: 89,
  activeAlerts: 2,
  anomalousAttempts: 3,
  successRate: 94.2,
};

// 8. Suspicious Users Data
export const suspiciousUsers = [
  {
    id: 'sus1',
    name: 'Unknown Person A',
    riskScore: 85,
    status: 'high',
    lastSeen: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    location: 'Server Room',
    attempts: 3,
    faceImage: 'https://i.pravatar.cc/150?img=11',
  },
  {
    id: 'sus2',
    name: 'Unknown Person B',
    riskScore: 65,
    status: 'moderate',
    lastSeen: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    location: 'Main Entrance',
    attempts: 2,
    faceImage: 'https://i.pravatar.cc/150?img=12',
  },
  {
    id: 'sus3',
    name: 'Unknown Person C',
    riskScore: 45,
    status: 'low',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    location: 'Parking Lot',
    attempts: 1,
    faceImage: 'https://i.pravatar.cc/150?img=13',
  },
];

// 9. AI Recommendations Data
export const aiRecommendations = [
  {
    id: 'rec1',
    type: 'Access Control',
    description: 'Block access for user with multiple failed attempts at Server Room',
    priority: 'High',
    status: 'Pending',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    action: 'Block Access',
    confidence: 0.95,
  },
  {
    id: 'rec2',
    type: 'User Management',
    description: 'Review and update access zones for user with unusual access patterns',
    priority: 'Medium',
    status: 'Pending',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    action: 'Review Access',
    confidence: 0.82,
  },
  {
    id: 'rec3',
    type: 'Security Alert',
    description: 'Investigate multiple access attempts during non-business hours',
    priority: 'High',
    status: 'Pending',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    action: 'Investigate',
    confidence: 0.88,
  },
];

// 10. Observed Users Data
export const observedUsers = [
  {
    id: 'obs1',
    firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    lastSeen: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    tempAccesses: 3,
    accessedZones: ['Main Entrance', 'Parking Lot'],
    status: 'Pending Review',
    aiAction: 'Monitor',
    confidence: 0.85,
    faceImage: 'https://i.pravatar.cc/150?img=8',
  },
  {
    id: 'obs2',
    firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    lastSeen: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
    tempAccesses: 5,
    accessedZones: ['Main Entrance', 'Office Area'],
    status: 'High Risk',
    aiAction: 'Block Access',
    confidence: 0.92,
    faceImage: 'https://i.pravatar.cc/150?img=9',
  },
  {
    id: 'obs3',
    firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), // 1 hour ago
    lastSeen: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    tempAccesses: 2,
    accessedZones: ['Main Entrance'],
    status: 'Low Risk',
    aiAction: 'Allow Access',
    confidence: 0.78,
    faceImage: 'https://i.pravatar.cc/150?img=10',
  },
];

// 12. UI Configuration Data
export const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users', label: 'User Management' },
  { id: 'logs', label: 'Access Logs' },
  { id: 'settings', label: 'Settings' },
];

export const columns: Column[] = [
  { key: 'photoUrl', label: 'Face', sortable: false },
  { key: 'id', label: 'Temporary ID', sortable: true },
  { key: 'firstSeen', label: 'First Seen', sortable: true },
  { key: 'lastSeen', label: 'Last Seen', sortable: true },
  { key: 'tempAccesses', label: 'Temp Accesses', sortable: true },
  { key: 'accessedZones', label: 'Accessed Zones', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'aiAction', label: 'AI Suggested Action', sortable: true },
  { key: 'actions', label: 'Admin Actions', sortable: false },
];

// Column definition for this table specifically
export const logColumns: Column[] = [
  { key: 'timestamp', label: 'Timestamp', sortable: true },
  { key: 'user', label: 'User Name', sortable: true },
  { key: 'email', label: 'User Email', sortable: true },
  { key: 'role', label: 'User Role', sortable: true },
  { key: 'zone', label: 'Zone', sortable: true },
  { key: 'method', label: 'Method', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'aiDetails', label: 'AI Details', sortable: false },
];
// 13. Chart Colors
export const PIE_COLORS = ['#ef4444', '#f59e42', '#6366f1', '#a3e635'];

// 14. Empty/Initial Data
export const summaryData = {};
export const recentAccesses: any[] = [];
export const recentLogs: any[] = [];
export const trendData: any[] = [];
export const failureCauseData: any[] = [];

// 15. Default States
export const defaultNewCamera = {
  name: EMPTY_STRING,
  zone: EMPTY_STRING,
  location: EMPTY_STRING,
};

 // Predefined categories for zones
 export const zoneCategories = ['Employee', 'Visitor', 'Management', 'Security', 'Maintenance', 'Guest', 'Contractor', 'Other'];

// Export all mock data as a single object for easy importing
export const mockData = {  
  csvTemplateContent,
  zones,
  cameras,
  riskScore,
  kpiData,
  suspiciousUsers,
  aiRecommendations,
  observedUsers,
  tabs,
  columns,
  PIE_COLORS,
  summaryData,
  recentAccesses,
  recentLogs,
  trendData,
  failureCauseData,
  defaultNewCamera,
  zoneCategories,
};
