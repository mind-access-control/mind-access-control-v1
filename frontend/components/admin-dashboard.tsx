"use client";

import React from "react";

import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Shield,
  Zap,
  TrendingUp,
  Upload,
  Search,
  Edit,
  Trash2,
  LogOut,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Camera,
  SlidersHorizontal,
  AlertTriangle,
  Lightbulb,
  Eye,
  ArrowRight,
  UserCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CameraCapture } from "@/components/camera-capture";
// Add these imports at the top of the file with the other imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// --- AI-ENHANCED DASHBOARD COMPONENTS ---
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Mock data for demonstration
const summaryData = {
  totalUsers: 247,
  activeZones: 12,
  accessesToday: 89,
  successRate: 94.2,
};

const recentAccesses = [
  {
    id: 1,
    timestamp: "2025-01-10 14:32",
    user: "John Smith",
    status: "Success",
  },
  {
    id: 2,
    timestamp: "2025-01-10 14:28",
    user: "Sarah Johnson",
    status: "Success",
  },
  {
    id: 3,
    timestamp: "2025-01-10 14:15",
    user: "Mike Wilson",
    status: "Failure",
  },
  {
    id: 4,
    timestamp: "2025-01-10 14:02",
    user: "Emily Davis",
    status: "Success",
  },
  {
    id: 5,
    timestamp: "2025-01-10 13:45",
    user: "Robert Brown",
    status: "Success",
  },
];

// Updated user data with new fields
const initialUsers = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@company.com",
    role: "Admin",
    jobTitle: "Security Officer",
    accessZones: ["Main Entrance", "Server Room", "Zone A"],
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "User",
    jobTitle: "Software Engineer",
    accessZones: ["Main Entrance", "Zone B"],
  },
  {
    id: 3,
    name: "Mike Wilson",
    email: "mike.wilson@company.com",
    role: "User",
    jobTitle: "Human Resources",
    accessZones: ["Main Entrance"],
  },
  {
    id: 4,
    name: "Emily Davis",
    email: "emily.davis@company.com",
    role: "Admin",
    jobTitle: "Operations Manager",
    accessZones: ["Main Entrance", "Warehouse", "Zone A", "Zone B"],
  },
];

const accessLogs = [
  {
    id: 1,
    timestamp: "2025-01-10 14:32",
    user: "John Smith",
    email: "john.smith@company.com",
    role: "Admin",
    jobTitle: "Security Officer",
    zone: "Main Entrance",
    status: "Successful",
    method: "Facial",
  },
  {
    id: 2,
    timestamp: "2025-01-10 14:28",
    user: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "User",
    jobTitle: "Software Engineer",
    zone: "Zone B",
    status: "Successful",
    method: "Facial",
  },
  {
    id: 3,
    timestamp: "2025-01-10 14:15",
    user: "Mike Wilson",
    email: "mike.wilson@company.com",
    role: "User",
    jobTitle: "Human Resources",
    zone: "Server Room",
    status: "Failed",
    method: "Facial",
  },
  {
    id: 4,
    timestamp: "2025-01-10 14:02",
    user: "Emily Davis",
    email: "emily.davis@company.com",
    role: "Admin",
    jobTitle: "Operations Manager",
    zone: "Warehouse",
    status: "Successful",
    method: "Manual",
  },
  {
    id: 5,
    timestamp: "2025-01-10 13:45",
    user: "Robert Brown",
    email: "robert.brown@company.com",
    role: "User",
    jobTitle: "Marketing Specialist",
    zone: "Main Entrance",
    status: "Successful",
    method: "Facial",
  },
  {
    id: 6,
    timestamp: "2025-01-10 13:30",
    user: "John Smith",
    email: "john.smith@company.com",
    role: "Admin",
    jobTitle: "Security Officer",
    zone: "Server Room",
    status: "Successful",
    method: "Facial",
  },
  {
    id: 7,
    timestamp: "2025-01-10 12:15",
    user: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "User",
    jobTitle: "Software Engineer",
    zone: "Main Entrance",
    status: "Successful",
    method: "Facial",
  },
  {
    id: 8,
    timestamp: "2025-01-10 11:45",
    user: "Emily Davis",
    email: "emily.davis@company.com",
    role: "Admin",
    jobTitle: "Operations Manager",
    zone: "Zone A",
    status: "Failed",
    method: "Facial",
  },
  {
    id: 9,
    timestamp: "2025-01-10 10:30",
    user: "Mike Wilson",
    email: "mike.wilson@company.com",
    role: "User",
    jobTitle: "Human Resources",
    zone: "Main Entrance",
    status: "Successful",
    method: "Manual",
  },
  {
    id: 10,
    timestamp: "2025-01-10 09:15",
    user: "Robert Brown",
    email: "robert.brown@company.com",
    role: "User",
    jobTitle: "Marketing Specialist",
    zone: "Cafeteria",
    status: "Successful",
    method: "Facial",
  },
  {
    id: 11,
    timestamp: "2025-01-10 08:45",
    user: "John Smith",
    email: "john.smith@company.com",
    role: "Admin",
    jobTitle: "Security Officer",
    zone: "Executive Suite",
    status: "Failed",
    method: "Facial",
  },
  {
    id: 12,
    timestamp: "2025-01-10 08:30",
    user: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "User",
    jobTitle: "Software Engineer",
    zone: "Zone B",
    status: "Successful",
    method: "Manual",
  },
  {
    id: 13,
    timestamp: "2025-01-10 08:15",
    user: "Mike Wilson",
    email: "mike.wilson@company.com",
    role: "User",
    jobTitle: "Human Resources",
    zone: "Main Entrance",
    status: "Successful",
    method: "Facial",
  },
  {
    id: 14,
    timestamp: "2025-01-10 08:00",
    user: "Emily Davis",
    email: "emily.davis@company.com",
    role: "Admin",
    jobTitle: "Operations Manager",
    zone: "Warehouse",
    status: "Failed",
    method: "Facial",
  },
  {
    id: 15,
    timestamp: "2025-01-10 07:45",
    user: "Robert Brown",
    email: "robert.brown@company.com",
    role: "User",
    jobTitle: "Marketing Specialist",
    zone: "Main Entrance",
    status: "Successful",
    method: "Facial",
  },
];

// Access zones options
const accessZonesOptions = [
  "Main Entrance",
  "Zone A",
  "Zone B",
  "Server Room",
  "Warehouse",
  "Executive Suite",
  "Cafeteria",
];

// Job title options
const jobTitleOptions = [
  "Software Engineer",
  "Product Manager",
  "Security Officer",
  "Human Resources",
  "Marketing Specialist",
  "Operations Manager",
  "IT Administrator",
  "Executive",
];

// CSV template content
const csvTemplateContent = `Full Name,Email Address,User Role,Job Title,Access Zones,Photo URL
John Doe,john.doe@example.com,Admin,Security Officer,"Main Entrance,Server Room,Zone A",https://example.com/photos/john.jpg
Jane Smith,jane.smith@example.com,User,Software Engineer,"Main Entrance,Zone B",https://example.com/photos/jane.jpg
`;

type SortField = "name" | "email" | "role" | "jobTitle";
type SortDirection = "asc" | "desc";

// Access logs sorting types
type LogSortField =
  | "timestamp"
  | "user"
  | "email"
  | "role"
  | "jobTitle"
  | "zone"
  | "method"
  | "status";

// Summary sorting types
type SummarySortField =
  | "user"
  | "email"
  | "firstAccess"
  | "lastAccess"
  | "totalAccesses"
  | "successRate";

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // User management state
  const [users, setUsers] = useState(initialUsers);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingAccessZones, setEditingAccessZones] = useState<string[]>([]);
  const [editingAccessZonesOpen, setEditingAccessZonesOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // Bulk upload state
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // New form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("");
  const [selectedAccessZones, setSelectedAccessZones] = useState<string[]>([]);
  const [accessZonesOpen, setAccessZonesOpen] = useState(false);

  // Add these state variables after the existing state declarations
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [csvIsDragging, setCsvIsDragging] = useState(false);

  // Add a new state variable for the camera modal
  const [cameraOpen, setCameraOpen] = useState(false);

  // Access Logs filtering state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  // Access Logs sorting and pagination state
  const [logSortField, setLogSortField] = useState<LogSortField>("timestamp");
  const [logSortDirection, setLogSortDirection] =
    useState<SortDirection>("desc");
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [logItemsPerPage, setLogItemsPerPage] = useState(10);

  // Summary sorting and filtering state
  const [summarySortField, setSummarySortField] =
    useState<SummarySortField>("user");
  const [summarySortDirection, setSummarySortDirection] =
    useState<SortDirection>("asc");
  const [summarySearchTerm, setSummarySearchTerm] = useState("");
  const [summaryStatusFilter, setSummaryStatusFilter] = useState("all");

  // Add these new state variables after the other state declarations
  const [activeSettingsTab, setActiveSettingsTab] = useState("zones");
  const [zones, setZones] = useState([
    { id: 1, name: "Main Entrance" },
    { id: 2, name: "Zone A" },
    { id: 3, name: "Zone B" },
    { id: 4, name: "Server Room" },
    { id: 5, name: "Warehouse" },
    { id: 6, name: "Executive Suite" },
    { id: 7, name: "Cafeteria" },
  ]);
  const [cameras, setCameras] = useState([
    { id: 1, name: "Camera 1", zone: "Main Entrance", location: "Front Door" },
    { id: 2, name: "Camera 2", zone: "Zone A", location: "North Corner" },
    { id: 3, name: "Camera 3", zone: "Server Room", location: "Server Rack 3" },
    { id: 4, name: "Camera 4", zone: "Warehouse", location: "Loading Dock" },
  ]);
  const [newZoneName, setNewZoneName] = useState("");
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editingZoneName, setEditingZoneName] = useState("");
  const [zoneToDelete, setZoneToDelete] = useState<any>(null);
  const [zoneDeleteModalOpen, setZoneDeleteModalOpen] = useState(false);

  const [newCamera, setNewCamera] = useState({
    name: "",
    zone: "",
    location: "",
  });
  const [editingCameraId, setEditingCameraId] = useState<number | null>(null);
  const [editingCamera, setEditingCamera] = useState<any>(null);
  const [cameraToDelete, setCameraToDelete] = useState<any>(null);
  const [cameraDeleteModalOpen, setCameraDeleteModalOpen] = useState(false);

  // --- AI-ENHANCED DASHBOARD STATE & DATA ---
  // Place these inside the AdminDashboard component, before the return
  const [riskScore] = useState<{
    score: number;
    status: "low" | "moderate" | "high";
  }>({
    score: 23,
    status: "low",
  });
  const [kpiData] = useState({
    totalUsers: 247,
    activeZones: 12,
    accessesToday: 89,
    activeAlerts: 2,
    anomalousAttempts: 3,
    successRate: 94.2,
  });
  const [suspiciousUsers, setSuspiciousUsers] = useState([
    {
      id: 1,
      name: "Mike Wilson",
      photoUrl: "/avatars/mike.jpg",
      timestamp: "2025-01-10 14:15",
      reason: "Multiple failed attempts in restricted zone",
      suggestion: "Review user permissions",
    },
    {
      id: 2,
      name: "Emily Davis",
      photoUrl: "/avatars/emily.jpg",
      timestamp: "2025-01-10 11:45",
      reason: "Off-hours access",
      suggestion: "Investigate activity",
    },
    {
      id: 3,
      name: "Robert Brown",
      photoUrl: "/avatars/robert.jpg",
      timestamp: "2025-01-10 09:15",
      reason: "Possible impersonation attempt",
      suggestion: "Consider temporary lockout",
    },
  ]);
  const [aiRecommendations, setAIRecommendations] = useState([
    {
      id: 1,
      text: "Review access configuration for Server Room (high failure rate)",
    },
    { id: 2, text: "Consider updating inactive user profiles" },
    { id: 3, text: "Increase monitoring for off-hours access" },
  ]);
  const [recentLogs, setRecentLogs] = useState<
    {
      id: number;
      timestamp: string;
      user: string;
      zone: string;
      status: "Success" | "Failure";
      aiClassification?: string;
    }[]
  >([
    {
      id: 1,
      timestamp: "2025-01-10 14:32",
      user: "John Smith",
      zone: "Main Entrance",
      status: "Success",
    },
    {
      id: 2,
      timestamp: "2025-01-10 14:28",
      user: "Sarah Johnson",
      zone: "Zone B",
      status: "Success",
    },
    {
      id: 3,
      timestamp: "2025-01-10 14:15",
      user: "Mike Wilson",
      zone: "Server Room",
      status: "Failure",
      aiClassification: "Unauthorized",
    },
    {
      id: 4,
      timestamp: "2025-01-10 14:02",
      user: "Emily Davis",
      zone: "Warehouse",
      status: "Success",
    },
    {
      id: 5,
      timestamp: "2025-01-10 13:45",
      user: "Robert Brown",
      zone: "Main Entrance",
      status: "Failure",
      aiClassification: "Possible Impersonation",
    },
  ]);
  const [trendData] = useState([
    { date: "Mon", alerts: 1, aiPrediction: 2 },
    { date: "Tue", alerts: 2, aiPrediction: 2 },
    { date: "Wed", alerts: 3, aiPrediction: 3 },
    { date: "Thu", alerts: 2, aiPrediction: 2 },
    { date: "Fri", alerts: 4, aiPrediction: 5 },
    { date: "Sat", alerts: 2, aiPrediction: 3 },
    { date: "Sun", alerts: 1, aiPrediction: 1 },
  ]);
  const [failureCauseData] = useState([
    { name: "Unauthorized", value: 4 },
    { name: "Face Not Recognized", value: 3 },
    { name: "Possible Impersonation", value: 2 },
    { name: "Technical Issue", value: 1 },
  ]);
  const [aiDetailsUser, setAIDetailsUser] = useState(null);
  const [aiDetailsLog, setAIDetailsLog] = useState(null);
  const [aiRecDetails, setAIRecDetails] = useState(null);

  // 1. Add 'observedUsers' state and simulated data after the other state declarations
  const [observedUsers] = useState([
    {
      id: "TMP-001",
      photoUrl: "",
      firstSeen: "2025-01-10 08:15",
      lastSeen: "2025-01-10 14:32",
      tempAccesses: 5,
      accessedZones: ["Main Entrance", "Zone A"],
      status: "active_temporal",
      aiAction: "Register User",
    },
    {
      id: "TMP-002",
      photoUrl: "",
      firstSeen: "2025-01-10 09:00",
      lastSeen: "2025-01-10 13:45",
      tempAccesses: 3,
      accessedZones: ["Zone B"],
      status: "in_review_admin",
      aiAction: "Extend Temporary Access",
    },
    {
      id: "TMP-003",
      photoUrl: "",
      firstSeen: "2025-01-09 17:20",
      lastSeen: "2025-01-10 10:30",
      tempAccesses: 2,
      accessedZones: ["Warehouse"],
      status: "expired",
      aiAction: "Block User",
    },
  ]);

  // 1. Define types for observed user sort fields
  const observedUserSortFields = [
    "id",
    "firstSeen",
    "lastSeen",
    "tempAccesses",
    "accessedZones",
    "status",
    "aiAction",
  ] as const;
  type ObservedUserSortField = (typeof observedUserSortFields)[number];

  // 2. Update observedSortField and logsSortField types
  const [observedSortField, setObservedSortField] =
    useState<ObservedUserSortField>("id");
  const [observedSortDirection, setObservedSortDirection] = useState<
    "asc" | "desc"
  >("asc");
  const [logsSortField, setLogsSortField] = useState<LogSortField>("timestamp");
  const [logsSortDirection, setLogsSortDirection] =
    useState<SortDirection>("desc");

  // 3. Add index signature to observed user type for sorting
  // (If observedUsers is typed, add: [key: string]: any; to its type)
  // If not, cast aValue and bValue to any in the sort function
  const sortedObservedUsers = [...observedUsers].sort((a, b) => {
    let aValue = (a as any)[observedSortField];
    let bValue = (b as any)[observedSortField];
    if (Array.isArray(aValue)) aValue = aValue.join(", ");
    if (Array.isArray(bValue)) bValue = bValue.join(", ");
    if (typeof aValue === "string" && typeof bValue === "string") {
      if (observedSortDirection === "asc") return aValue.localeCompare(bValue);
      else return bValue.localeCompare(aValue);
    }
    if (typeof aValue === "number" && typeof bValue === "number") {
      if (observedSortDirection === "asc") return aValue - bValue;
      else return bValue - aValue;
    }
    return 0;
  });

  // 4. Fix observedUserDetails state type
  const [observedUserDetails, setObservedUserDetails] = useState<
    null | (typeof observedUsers)[0]
  >(null);

  // 3. Sorting logic for recent logs
  const sortedRecentLogs = [...recentLogs].sort((a, b) => {
    let aValue = (a as any)[logsSortField];
    let bValue = (b as any)[logsSortField];
    if (logsSortField === "timestamp") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    if (typeof aValue === "string" && typeof bValue === "string") {
      if (logsSortDirection === "asc") return aValue.localeCompare(bValue);
      else return bValue.localeCompare(aValue);
    }
    if (typeof aValue === "number" && typeof bValue === "number") {
      if (logsSortDirection === "asc") return aValue - bValue;
      else return bValue - aValue;
    }
    return 0;
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        processImageFile(file);
      }
    }
  };

  // Add these CSV drag handlers after the existing image drag handlers
  const handleCsvDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setCsvIsDragging(true);
  };

  const handleCsvDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setCsvIsDragging(false);
  };

  const handleCsvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setCsvIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv")) {
        setSelectedCsvFile(file);
      }
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearCsvFile = () => {
    setSelectedCsvFile(null);
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await signOut();
      if (error) {
        console.error("Error logging out:", error);
        return;
      }
      onLogout();
    } catch (err) {
      console.error("Unexpected error during logout:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    } else {
      setEmailError(null);
      return true;
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail) {
      validateEmail(newEmail);
    } else {
      setEmailError(null);
    }
  };

  const toggleAccessZone = (zone: string) => {
    setSelectedAccessZones((prev) =>
      prev.includes(zone)
        ? prev.filter((item) => item !== zone)
        : [...prev, zone]
    );
  };

  const toggleEditingAccessZone = (zone: string) => {
    setEditingAccessZones((prev) =>
      prev.includes(zone)
        ? prev.filter((item) => item !== zone)
        : [...prev, zone]
    );
  };

  // Update the handleSaveUser function to properly check validation and add debugging

  const handleSaveUser = () => {
    console.log("Save User clicked");
    console.log("Current form state:", {
      fullName,
      email,
      emailError,
      selectedRole,
      selectedJobTitle,
      selectedAccessZones,
      selectedImage,
    });

    const isEmailValid = validateEmail(email);

    // Check each required field and log which ones are missing
    const missingFields = [];
    if (!fullName) missingFields.push("Full Name");
    if (!isEmailValid) missingFields.push("Valid Email");
    if (!selectedRole) missingFields.push("User Role");
    if (!selectedJobTitle) missingFields.push("Job Title");
    if (selectedAccessZones.length === 0) missingFields.push("Access Zones");
    if (!selectedImage) missingFields.push("Photo");

    if (missingFields.length > 0) {
      console.log("Missing required fields:", missingFields);
      return;
    }

    const newUser = {
      id: users.length + 1,
      name: fullName,
      email,
      role: selectedRole,
      jobTitle: selectedJobTitle,
      accessZones: selectedAccessZones,
    };

    console.log("Adding new user:", newUser);
    setUsers([...users, newUser]);

    // Reset form
    setFullName("");
    setEmail("");
    setEmailError(null);
    setSelectedRole("");
    setSelectedJobTitle("");
    setSelectedAccessZones([]);
    setSelectedImage(null);
    setImagePreview(null);

    console.log("Form reset complete");
  };

  // Sorting functionality
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Access logs sorting functionality
  const handleLogSort = (field: LogSortField) => {
    if (logSortField === field) {
      setLogSortDirection(logSortDirection === "asc" ? "desc" : "asc");
    } else {
      setLogSortField(field);
      setLogSortDirection("asc");
    }
  };

  // Summary sorting functionality
  const handleSummarySort = (field: SummarySortField) => {
    if (summarySortField === field) {
      setSummarySortDirection(summarySortDirection === "asc" ? "desc" : "asc");
    } else {
      setSummarySortField(field);
      setSummarySortDirection("asc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortDirection === "asc") {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  // Add this after the sortedUsers logic
  const filteredUsers = sortedUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.jobTitle.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [userSearchTerm]);

  // Reset to first page when items per page changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Reset log page when search term or filters change
  React.useEffect(() => {
    setLogCurrentPage(1);
  }, [
    searchTerm,
    selectedUser,
    selectedZone,
    selectedStatus,
    selectedMethod,
    dateFrom,
    dateTo,
  ]);

  // Edit functionality
  const startEditing = (user: any) => {
    setEditingUserId(user.id);
    setEditingUser({ ...user });
    setEditingAccessZones([...user.accessZones]);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingUser(null);
    setEditingAccessZones([]);
  };

  const saveEditing = () => {
    const updatedUser = { ...editingUser, accessZones: editingAccessZones };
    setUsers(
      users.map((user) => (user.id === editingUserId ? updatedUser : user))
    );
    setEditingUserId(null);
    setEditingUser(null);
    setEditingAccessZones([]);
  };

  const updateEditingUser = (field: string, value: any) => {
    setEditingUser({ ...editingUser, [field]: value });
  };

  // Delete functionality
  const openDeleteModal = (user: any) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    setUsers(users.filter((user) => user.id !== userToDelete.id));
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  // Bulk upload functionality
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      setSelectedCsvFile(file);
    }
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([csvTemplateContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user_upload_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processBulkUpload = () => {
    if (!selectedCsvFile) {
      setUploadStatus("error");
      setUploadMessage("Please select a CSV file first");
      return;
    }

    setUploadStatus("processing");
    setUploadMessage("Processing users...");

    // Simulate processing delay
    setTimeout(() => {
      setUploadStatus("success");
      setUploadMessage("Successfully processed 5 users");

      // Add some mock users to demonstrate success
      const newUsers = [
        {
          id: users.length + 1,
          name: "Alex Johnson",
          email: "alex.johnson@example.com",
          role: "User",
          jobTitle: "Marketing Specialist",
          accessZones: ["Main Entrance", "Cafeteria"],
        },
        {
          id: users.length + 2,
          name: "Taylor Smith",
          email: "taylor.smith@example.com",
          role: "Admin",
          jobTitle: "IT Administrator",
          accessZones: ["Main Entrance", "Server Room", "Zone A"],
        },
      ];

      setUsers([...users, ...newUsers]);

      // Reset after 3 seconds
      setTimeout(() => {
        setBulkUploadModalOpen(false);
        setSelectedCsvFile(null);
        setUploadStatus("idle");
        setUploadMessage("");
      }, 3000);
    }, 2000);
  };

  // Filter logs based on all criteria
  const filteredLogs = useMemo(() => {
    return accessLogs.filter((log) => {
      // Apply all filters
      if (selectedUser && selectedUser !== "all" && log.user !== selectedUser)
        return false;
      if (selectedZone && selectedZone !== "all" && log.zone !== selectedZone)
        return false;
      if (
        selectedStatus &&
        selectedStatus !== "all" &&
        log.status !== selectedStatus
      )
        return false;
      if (
        selectedMethod &&
        selectedMethod !== "all" &&
        log.method !== selectedMethod
      )
        return false;

      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          log.user.toLowerCase().includes(searchLower) ||
          log.email.toLowerCase().includes(searchLower) ||
          log.zone.toLowerCase().includes(searchLower) ||
          log.status.toLowerCase().includes(searchLower) ||
          log.method.toLowerCase().includes(searchLower) ||
          log.jobTitle.toLowerCase().includes(searchLower)
        );
      }

      // Date filtering (simplified - in real app you'd parse dates properly)
      if (dateFrom || dateTo) {
        const logDate = log.timestamp.split(" ")[0]; // Get date part
        if (dateFrom && logDate < dateFrom) return false;
        if (dateTo && logDate > dateTo) return false;
      }

      return true;
    });
  }, [
    searchTerm,
    selectedUser,
    selectedZone,
    selectedStatus,
    selectedMethod,
    dateFrom,
    dateTo,
  ]);

  // Sort filtered logs
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let aValue: any = a[logSortField];
      let bValue: any = b[logSortField];

      // Special case for timestamp sorting
      if (logSortField === "timestamp") {
        // Convert to comparable format (this is simplified)
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (logSortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredLogs, logSortField, logSortDirection]);

  // Paginate sorted logs
  const logTotalPages = Math.ceil(sortedLogs.length / logItemsPerPage);
  const logStartIndex = (logCurrentPage - 1) * logItemsPerPage;
  const logEndIndex = logStartIndex + logItemsPerPage;
  const paginatedLogs = sortedLogs.slice(logStartIndex, logEndIndex);

  // Prepare user summary data
  const userSummaryData = useMemo(() => {
    const summaryData = Array.from(
      new Set(accessLogs.map((log) => log.user))
    ).map((userName) => {
      const userLogs = accessLogs.filter((log) => log.user === userName);
      const userEmail = userLogs[0]?.email || "";
      const firstAccess = userLogs.reduce((earliest, log) =>
        log.timestamp < earliest.timestamp ? log : earliest
      );
      const lastAccess = userLogs.reduce((latest, log) =>
        log.timestamp > latest.timestamp ? log : latest
      );

      // Count accesses per zone
      const zoneAccesses = userLogs.reduce((acc, log) => {
        acc[log.zone] = (acc[log.zone] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Count successful and failed accesses
      const successful = userLogs.filter(
        (log) => log.status === "Successful"
      ).length;
      const failed = userLogs.filter((log) => log.status === "Failed").length;
      const totalAccesses = userLogs.length;
      const successRate =
        totalAccesses > 0 ? (successful / totalAccesses) * 100 : 0;

      return {
        user: userName,
        email: userEmail,
        firstAccess: firstAccess.timestamp,
        lastAccess: lastAccess.timestamp,
        zoneAccesses,
        successful,
        failed,
        totalAccesses,
        successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal place
      };
    });

    return summaryData;
  }, []);

  // Filter and sort summary data
  const filteredSummaryData = useMemo(() => {
    return userSummaryData
      .filter((summary) => {
        // Apply search filter
        if (summarySearchTerm) {
          const searchLower = summarySearchTerm.toLowerCase();
          return (
            summary.user.toLowerCase().includes(searchLower) ||
            summary.email.toLowerCase().includes(searchLower)
          );
        }

        // Apply status filter
        if (summaryStatusFilter === "successful" && summary.successful === 0)
          return false;
        if (summaryStatusFilter === "failed" && summary.failed === 0)
          return false;

        return true;
      })
      .sort((a, b) => {
        let aValue: any = a[summarySortField];
        let bValue: any = b[summarySortField];

        // Special case for timestamp sorting
        if (
          summarySortField === "firstAccess" ||
          summarySortField === "lastAccess"
        ) {
          // Convert to comparable format
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (summarySortDirection === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [
    userSummaryData,
    summarySortField,
    summarySortDirection,
    summarySearchTerm,
    summaryStatusFilter,
  ]);

  // Add a new function to handle captured photos from the camera
  const handleCameraCapture = (imageData: string) => {
    setImagePreview(imageData);

    // Convert the base64 string to a File object
    fetch(imageData)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], "camera-capture.jpg", {
          type: "image/jpeg",
        });
        setSelectedImage(file);
      });
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "users", label: "User Management" },
    { id: "logs", label: "Access Logs" },
    { id: "settings", label: "Settings" },
  ];

  // Add these functions after the other function declarations

  // Zone Management Functions
  const handleAddZone = () => {
    if (!newZoneName.trim()) return;

    const newZone = {
      id: zones.length > 0 ? Math.max(...zones.map((z) => z.id)) + 1 : 1,
      name: newZoneName.trim(),
    };

    setZones([...zones, newZone]);
    setNewZoneName("");
  };

  const startEditingZone = (zone: any) => {
    setEditingZoneId(zone.id);
    setEditingZoneName(zone.name);
  };

  const cancelEditingZone = () => {
    setEditingZoneId(null);
    setEditingZoneName("");
  };

  const saveEditingZone = () => {
    if (!editingZoneName.trim()) return;

    setZones(
      zones.map((zone) =>
        zone.id === editingZoneId
          ? { ...zone, name: editingZoneName.trim() }
          : zone
      )
    );

    // Also update zone references in cameras
    const oldZoneName = zones.find((z) => z.id === editingZoneId)?.name;
    if (oldZoneName) {
      setCameras(
        cameras.map((camera) =>
          camera.zone === oldZoneName
            ? { ...camera, zone: editingZoneName.trim() }
            : camera
        )
      );
    }

    setEditingZoneId(null);
    setEditingZoneName("");
  };

  const openZoneDeleteModal = (zone: any) => {
    setZoneToDelete(zone);
    setZoneDeleteModalOpen(true);
  };

  const confirmZoneDelete = () => {
    setZones(zones.filter((zone) => zone.id !== zoneToDelete.id));

    // Remove zone from cameras or set to empty
    setCameras(
      cameras.map((camera) =>
        camera.zone === zoneToDelete.name ? { ...camera, zone: "" } : camera
      )
    );

    setZoneDeleteModalOpen(false);
    setZoneToDelete(null);
  };

  const cancelZoneDelete = () => {
    setZoneDeleteModalOpen(false);
    setZoneToDelete(null);
  };

  // Camera Management Functions
  const handleAddCamera = () => {
    if (!newCamera.name.trim() || !newCamera.zone) return;

    const newCameraObj = {
      id: cameras.length > 0 ? Math.max(...cameras.map((c) => c.id)) + 1 : 1,
      name: newCamera.name.trim(),
      zone: newCamera.zone,
      location: newCamera.location.trim(),
    };

    setCameras([...cameras, newCameraObj]);
    setNewCamera({ name: "", zone: "", location: "" });
  };

  const startEditingCamera = (camera: any) => {
    setEditingCameraId(camera.id);
    setEditingCamera({ ...camera });
  };

  const cancelEditingCamera = () => {
    setEditingCameraId(null);
    setEditingCamera(null);
  };

  const saveEditingCamera = () => {
    if (!editingCamera.name.trim() || !editingCamera.zone) return;

    setCameras(
      cameras.map((camera) =>
        camera.id === editingCameraId
          ? {
              ...camera,
              name: editingCamera.name.trim(),
              zone: editingCamera.zone,
              location: editingCamera.location.trim(),
            }
          : camera
      )
    );

    setEditingCameraId(null);
    setEditingCamera(null);
  };

  const openCameraDeleteModal = (camera: any) => {
    setCameraToDelete(camera);
    setCameraDeleteModalOpen(true);
  };

  const confirmCameraDelete = () => {
    setCameras(cameras.filter((camera) => camera.id !== cameraToDelete.id));
    setCameraDeleteModalOpen(false);
    setCameraToDelete(null);
  };

  const cancelCameraDelete = () => {
    setCameraDeleteModalOpen(false);
    setCameraToDelete(null);
  };

  // --- AI-ENHANCED DASHBOARD COMPONENTS ---
  // RiskScoreCard
  const riskColors: Record<"low" | "moderate" | "high", string> = {
    low: "bg-green-100 text-green-700",
    moderate: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };
  function RiskScoreCard({
    score,
    status,
  }: {
    score: number;
    status: "low" | "moderate" | "high";
  }) {
    const color = riskColors[status];
    const statusText = {
      low: "Low Risk",
      moderate: "Moderate Risk",
      high: "Security Alert",
    }[status];
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl shadow-lg p-6 w-full md:w-72 ${color}`}
      >
        <div className="relative flex items-center justify-center mb-2">
          <svg className="w-20 h-20">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke={
                status === "low"
                  ? "#22c55e"
                  : status === "moderate"
                  ? "#eab308"
                  : "#ef4444"
              }
              strokeWidth="8"
              fill="none"
              strokeDasharray={2 * Math.PI * 36}
              strokeDashoffset={2 * Math.PI * 36 * (1 - score / 100)}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
            />
            <text
              x="50%"
              y="54%"
              textAnchor="middle"
              className="fill-current text-2xl font-bold"
              fill="#111827"
              dy=".3em"
            >
              {score}
            </text>
          </svg>
        </div>
        <div className="text-lg font-semibold">{statusText}</div>
        <div className="text-xs text-gray-500 mb-1">AI-Driven Analysis</div>
        <div className="flex items-center gap-1 text-xs">
          {status === "low" && <Check className="w-4 h-4 text-green-500" />}
          {status === "moderate" && <Zap className="w-4 h-4 text-yellow-500" />}
          {status === "high" && <Shield className="w-4 h-4 text-red-500" />}
          <span>
            {status === "low"
              ? "All systems normal"
              : status === "moderate"
              ? "Monitor for unusual activity"
              : "Immediate review required"}
          </span>
        </div>
      </div>
    );
  }

  // KpiCard
  function KpiCard({
    icon,
    label,
    value,
    highlight = false,
    alert = false,
  }: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    highlight?: boolean;
    alert?: boolean;
  }) {
    return (
      <div
        className={`flex items-center rounded-xl shadow-lg p-6 bg-white w-full ${
          alert
            ? "border-2 border-red-500 bg-red-50 animate-pulse"
            : highlight
            ? "border-2 border-yellow-400 bg-yellow-50"
            : ""
        }`}
      >
        <div className="w-12 h-12 flex items-center justify-center text-teal-600">
          {icon}
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-600">{label}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
      </div>
    );
  }

  // SecurityAlertCard
  function SecurityAlertCard({ count }: { count: number }) {
    return (
      <KpiCard
        icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
        label="Active Security Alerts (AI)"
        value={count}
        alert={count > 0}
      />
    );
  }

  // SuspiciousUserList
  function SuspiciousUserList({
    users,
    onDetails,
  }: {
    users: {
      id: number;
      name: string;
      photoUrl?: string;
      timestamp: string;
      reason: string;
      suggestion: string;
    }[];
    onDetails: (user: any) => void;
  }) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center mb-2">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="font-semibold text-lg">
            Highlighted Suspicious Users
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="py-2 px-2 text-left">User</th>
                <th className="py-2 px-2 text-left">Timestamp</th>
                <th className="py-2 px-2 text-left">AI-Detected Reason</th>
                <th className="py-2 px-2 text-left">AI Suggestion</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-red-50 transition">
                  <td className="py-2 px-2 flex items-center gap-2">
                    {u.photoUrl ? (
                      <div className="relative w-8 h-8">
                        <img
                          src={u.photoUrl}
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            // Hide the broken image
                            (e.target as HTMLImageElement).style.display =
                              "none";
                            // Show the fallback icon
                            const fallback =
                              e.currentTarget.parentElement?.querySelector(
                                ".fallback-icon"
                              );
                            if (fallback) {
                              (fallback as HTMLElement).style.display = "block";
                            }
                          }}
                        />
                        <div className="fallback-icon hidden absolute inset-0">
                          <UserCircle2 className="w-8 h-8 text-gray-400" />
                        </div>
                      </div>
                    ) : (
                      <UserCircle2 className="w-8 h-8 text-gray-400" />
                    )}
                    <span className="font-medium">{u.name}</span>
                  </td>
                  <td className="py-2 px-2">{u.timestamp}</td>
                  <td className="py-2 px-2 text-red-700">{u.reason}</td>
                  <td className="py-2 px-2 text-teal-700">{u.suggestion}</td>
                  <td className="py-2 px-2">
                    <button
                      className="text-blue-600 hover:underline flex items-center gap-1"
                      onClick={() => onDetails(u)}
                    >
                      <Eye className="w-4 h-4" /> Details
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-4">
                    No suspicious users detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // AIRecommendationList
  function AIRecommendationList({
    recommendations,
    onAction,
  }: {
    recommendations: { id: number; text: string }[];
    onAction: (rec: any) => void;
  }) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center mb-2">
          <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
          <span className="font-semibold text-lg">
            AI-Generated Security Recommendations
          </span>
        </div>
        <ul className="space-y-2">
          {recommendations.map((rec) => (
            <li
              key={rec.id}
              className="flex items-center justify-between bg-yellow-50 rounded p-2"
            >
              <span className="text-gray-700">{rec.text}</span>
              <button
                className="text-blue-600 hover:underline flex items-center gap-1"
                onClick={() => onAction(rec)}
              >
                <ArrowRight className="w-4 h-4" /> View Details
              </button>
            </li>
          ))}
          {recommendations.length === 0 && (
            <li className="text-center text-gray-400 py-4">
              No recommendations at this time.
            </li>
          )}
        </ul>
      </div>
    );
  }

  // AccessLogTable
  function AccessLogTable({
    logs,
    onAIDetails,
    logsSortField,
    logsSortDirection,
    setLogsSortField,
    setLogsSortDirection,
  }: {
    logs: {
      id: number;
      timestamp: string;
      user: string;
      zone: string;
      status: "Success" | "Failure";
      aiClassification?: string;
    }[];
    onAIDetails: (log: any) => void;
    logsSortField: LogSortField;
    logsSortDirection: SortDirection;
    setLogsSortField: React.Dispatch<React.SetStateAction<LogSortField>>;
    setLogsSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  }) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-2">
          Recent Activity & Failure Detection (AI)
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="py-2 px-2 text-left">Timestamp</th>
                <th className="py-2 px-2 text-left">User Name</th>
                <th className="py-2 px-2 text-left">Access Zone</th>
                <th className="py-2 px-2 text-left">Status</th>
                <th className="py-2 px-2 text-left">AI Classification</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="py-2 px-2">{log.timestamp}</td>
                  <td className="py-2 px-2">{log.user}</td>
                  <td className="py-2 px-2">{log.zone}</td>
                  <td className="py-2 px-2">
                    <Badge
                      variant={
                        log.status === "Success" ? "default" : "destructive"
                      }
                      className={
                        log.status === "Success"
                          ? "bg-green-100 text-green-800"
                          : ""
                      }
                    >
                      {log.status}
                    </Badge>
                  </td>
                  <td className="py-2 px-2">
                    {log.status === "Failure" ? (
                      <span className="text-red-700">
                        {log.aiClassification}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {log.status === "Failure" && (
                      <button
                        className="text-blue-600 hover:underline flex items-center gap-1"
                        onClick={() => onAIDetails(log)}
                      >
                        <Eye className="w-4 h-4" /> AI Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-4">
                    No recent access attempts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // SecurityTrendsChart
  function SecurityTrendsChart({
    data,
  }: {
    data: { date: string; alerts: number; aiPrediction: number }[];
  }) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-2">
          Security Incident Trend
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="alerts"
              stroke="#ef4444"
              name="Active Alerts"
            />
            <Line
              type="monotone"
              dataKey="aiPrediction"
              stroke="#6366f1"
              strokeDasharray="5 5"
              name="AI Prediction"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // FailureCauseChart
  const PIE_COLORS = ["#ef4444", "#f59e42", "#6366f1", "#a3e635"];
  function FailureCauseChart({
    data,
  }: {
    data: { name: string; value: number }[];
  }) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-2">
          Failure Rate by AI-Classified Cause
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label
            >
              {data.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={PIE_COLORS[idx % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // AIDetailsModal
  function AIDetailsModal({
    open,
    onClose,
    details,
  }: {
    open: boolean;
    onClose: () => void;
    details: any;
  }) {
    if (!details) return null;
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Failure Analysis</DialogTitle>
            <DialogDescription>
              <div className="mb-2">
                <strong>User:</strong> {details.user}
                <br />
                <strong>Timestamp:</strong> {details.timestamp}
                <br />
                <strong>Zone:</strong> {details.zone}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <strong>AI Classification:</strong> {details.aiClassification}
            </div>
            <div>
              <strong>Recognition Confidence:</strong> {details.confidence}%
            </div>
            <div>
              <strong>Matched Known Face:</strong> {details.matchedFace}
            </div>
            <div>
              <strong>Unusual Timeframe:</strong> {details.unusualTime}
            </div>
            <div>
              <strong>AI Suggestion:</strong> {details.suggestion}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  // --- END AI-ENHANCED DASHBOARD COMPONENTS ---

  // 2. Add state for secondary dashboard tab
  const [dashboardTab, setDashboardTab] = useState("overview");

  // Define the column type
  type Column = {
    key: string;
    label: string;
    sortable?: boolean;
  };

  // Define the columns with proper typing
  const columns: Column[] = [
    { key: "photoUrl", label: "Face", sortable: false },
    { key: "id", label: "Temporary ID", sortable: true },
    { key: "firstSeen", label: "First Seen", sortable: true },
    { key: "lastSeen", label: "Last Seen", sortable: true },
    { key: "tempAccesses", label: "Temp Accesses", sortable: true },
    { key: "accessedZones", label: "Accessed Zones", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "aiAction", label: "AI Suggested Action", sortable: true },
    { key: "actions", label: "Admin Actions", sortable: false },
  ];

  // Add this function at the component level, before the return statement
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (userId: number, photoUrl: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [photoUrl]: true,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                <div className="w-4 h-4 bg-white rounded opacity-90"></div>
              </div>
              <h1 className="text-xl font-bold text-white">
                Access Control System
              </h1>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-white hover:bg-white/10"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>Loading...</>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-teal-600 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Secondary Tab Navigation */}
            <div className="mb-6">
              <nav className="flex space-x-6">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "observed", label: "Observed Users" },
                  { id: "logs", label: "Detailed Logs" },
                  { id: "analytics", label: "Analytics" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDashboardTab(tab.id)}
                    className={`text-sm font-medium transition-colors duration-200 ${
                      dashboardTab === tab.id
                        ? "text-green-400 border-b-2 border-green-400 pb-1 font-semibold"
                        : "text-purple-200 hover:text-purple-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Overview Tab */}
            {dashboardTab === "overview" && (
              <>
                {/* Header / Security Executive Summary */}
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Facial Access Control Dashboard - Security Overview
                  </h2>
                  <p className="text-indigo-200">
                    AI-powered insights for proactive security management
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div className="col-span-1">
                    <RiskScoreCard
                      score={riskScore.score}
                      status={riskScore.status}
                    />
                  </div>
                  <KpiCard
                    icon={<Users className="w-8 h-8" />}
                    label="Total Users"
                    value={kpiData.totalUsers}
                  />
                  <KpiCard
                    icon={<Shield className="w-8 h-8" />}
                    label="Active Zones"
                    value={kpiData.activeZones}
                  />
                  <KpiCard
                    icon={<Zap className="w-8 h-8" />}
                    label="Accesses Today"
                    value={kpiData.accessesToday}
                  />
                  <SecurityAlertCard count={kpiData.activeAlerts} />
                  <KpiCard
                    icon={<AlertTriangle className="w-8 h-8 text-yellow-500" />}
                    label="Anomalous Attempts (AI)"
                    value={kpiData.anomalousAttempts}
                    highlight={kpiData.anomalousAttempts > 0}
                  />
                  <KpiCard
                    icon={<TrendingUp className="w-8 h-8" />}
                    label="Success Rate"
                    value={`${kpiData.successRate}%`}
                  />
                </div>
                {/* Anomalous Events & AI Suggestions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SuspiciousUserList
                    users={suspiciousUsers}
                    onDetails={setAIDetailsUser}
                  />
                  <AIRecommendationList
                    recommendations={aiRecommendations}
                    onAction={setAIRecDetails}
                  />
                </div>
              </>
            )}

            {/* Observed Users Tab */}
            {dashboardTab === "observed" && (
              <>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Observed Users
                  </h2>
                  <p className="text-indigo-200">
                    Monitor and manage users detected by the system but not yet
                    registered.
                  </p>
                </div>
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
                    <div className="text-sm text-gray-600 mb-1">
                      New Observed Users (Today)
                    </div>
                    <div className="text-3xl font-bold text-teal-600">2</div>
                  </div>
                  <div
                    className={`rounded-xl shadow-lg p-6 flex flex-col items-center bg-white ${
                      observedUsers.filter(
                        (u) => u.status === "in_review_admin"
                      ).length > 2
                        ? "border-2 border-red-500 bg-red-50 animate-pulse"
                        : ""
                    }`}
                  >
                    <div className="text-sm text-gray-600 mb-1">
                      Observed Users Pending Review
                    </div>
                    <div className="text-3xl font-bold text-red-600">
                      {
                        observedUsers.filter(
                          (u) => u.status === "in_review_admin"
                        ).length
                      }
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
                    <div className="text-sm text-gray-600 mb-1">
                      Observed Users (This Week)
                    </div>
                    <div className="text-3xl font-bold text-blue-600">5</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
                    <div className="text-sm text-gray-600 mb-1">
                      Total Observed Users
                    </div>
                    <div className="text-3xl font-bold text-gray-800">
                      {observedUsers.length}
                    </div>
                  </div>
                </div>
                {/* Observed Users Table */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <div className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-500" /> Observed Users
                    Requiring Action
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 border-b">
                          {columns.map((col) => (
                            <th
                              key={col.key}
                              className={`py-2 px-2 text-left ${
                                col.sortable ? "cursor-pointer select-none" : ""
                              }`}
                              onClick={() => {
                                if (col.sortable) {
                                  if (observedSortField === col.key) {
                                    setObservedSortDirection(
                                      observedSortDirection === "asc"
                                        ? "desc"
                                        : "asc"
                                    );
                                  } else {
                                    setObservedSortField(
                                      col.key as ObservedUserSortField
                                    );
                                    setObservedSortDirection("asc");
                                  }
                                }
                              }}
                            >
                              <span className="flex items-center">
                                {col.label}
                                {col.sortable &&
                                  observedSortField === col.key &&
                                  (observedSortDirection === "asc" ? (
                                    <svg
                                      className="w-3 h-3 ml-1"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 15l7-7 7 7"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-3 h-3 ml-1"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                  ))}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedObservedUsers.map((u) => (
                          <tr
                            key={u.id}
                            className="border-b hover:bg-blue-50 transition"
                          >
                            <td className="py-2 px-2">
                              {u.photoUrl && !imageErrors[u.photoUrl] ? (
                                <div className="relative w-8 h-8">
                                  <img
                                    src={u.photoUrl}
                                    alt={u.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={() =>
                                      handleImageError(u.id, u.photoUrl)
                                    }
                                  />
                                </div>
                              ) : (
                                <UserCircle2 className="w-8 h-8 text-gray-400" />
                              )}
                            </td>
                            <td className="py-2 px-2 font-mono">{u.id}</td>
                            <td className="py-2 px-2">{u.firstSeen}</td>
                            <td className="py-2 px-2">{u.lastSeen}</td>
                            <td className="py-2 px-2 text-center">
                              {u.tempAccesses}
                            </td>
                            <td className="py-2 px-2">
                              {u.accessedZones.join(", ")}
                            </td>
                            <td className="py-2 px-2">
                              <Badge
                                className={
                                  u.status === "active_temporal"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : u.status === "in_review_admin"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {u.status === "active_temporal"
                                  ? "Active (Temp)"
                                  : u.status === "in_review_admin"
                                  ? "Pending Review"
                                  : "Expired"}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-blue-700">
                              {u.aiAction}
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline">
                                  Register
                                </Button>
                                <Button size="sm" variant="outline">
                                  Extend
                                </Button>
                                <Button size="sm" variant="destructive">
                                  Block
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setObservedUserDetails(u)}
                                >
                                  Details
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {observedUsers.length === 0 && (
                          <tr>
                            <td
                              colSpan={9}
                              className="text-center text-gray-400 py-4"
                            >
                              No observed users requiring action.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Detailed Logs Tab */}
            {dashboardTab === "logs" && (
              <AccessLogTable
                logs={sortedRecentLogs}
                onAIDetails={setAIDetailsLog}
                logsSortField={logsSortField}
                logsSortDirection={logsSortDirection}
                setLogsSortField={setLogsSortField}
                setLogsSortDirection={setLogsSortDirection}
              />
            )}

            {/* Analytics Tab */}
            {dashboardTab === "analytics" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SecurityTrendsChart data={trendData} />
                <FailureCauseChart data={failureCauseData} />
              </div>
            )}

            {/* AI Details Modals (keep these always available) */}
            <AIDetailsModal
              open={!!aiDetailsUser}
              onClose={() => setAIDetailsUser(null)}
              details={aiDetailsUser}
            />
            <AIDetailsModal
              open={!!aiDetailsLog}
              onClose={() => setAIDetailsLog(null)}
              details={aiDetailsLog}
            />
            <AIDetailsModal
              open={!!aiRecDetails}
              onClose={() => setAIRecDetails(null)}
              details={aiRecDetails}
            />
          </div>
        )}

        {/* User Management Tab - ENHANCED */}
        {activeTab === "users" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                User Management
              </h2>
            </div>

            {/* Add New User Form - ENHANCED PHOTO UPLOAD */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Add New User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Enter full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  {/* Email Address with Validation */}
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={email}
                      onChange={handleEmailChange}
                      className={emailError ? "border-red-500" : ""}
                    />
                    {emailError && (
                      <div className="flex items-center mt-1 text-red-500 text-sm">
                        <X className="w-4 h-4 mr-1" />
                        {emailError}
                      </div>
                    )}
                    {email && !emailError && (
                      <div className="flex items-center mt-1 text-green-600 text-sm">
                        <Check className="w-4 h-4 mr-1" />
                        Valid email format
                      </div>
                    )}
                  </div>

                  {/* User Role Dropdown */}
                  <div>
                    <Label htmlFor="userRole">User Role</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                    >
                      <SelectTrigger
                        id="userRole"
                        className="bg-slate-50 border-0 h-12"
                      >
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="User">User</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Job Title Dropdown */}
                  <div>
                    <Label htmlFor="jobTitle">Job Title/Position</Label>
                    <Select
                      value={selectedJobTitle}
                      onValueChange={setSelectedJobTitle}
                    >
                      <SelectTrigger
                        id="jobTitle"
                        className="bg-slate-50 border-0 h-12"
                      >
                        <SelectValue placeholder="Select job title" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {jobTitleOptions.map((title) => (
                            <SelectItem key={title} value={title}>
                              {title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Access Zones Multi-select */}
                <div>
                  <Label htmlFor="accessZones">Access Zones</Label>
                  <Popover
                    open={accessZonesOpen}
                    onOpenChange={setAccessZonesOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={accessZonesOpen}
                        className="w-full justify-between bg-slate-50 border-0 h-12 text-left font-normal"
                      >
                        {selectedAccessZones.length > 0
                          ? `${selectedAccessZones.length} zone${
                              selectedAccessZones.length > 1 ? "s" : ""
                            } selected`
                          : "Select access zones"}
                        <span className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="p-2 space-y-2 max-h-[300px] overflow-auto">
                        {accessZonesOptions.map((zone) => (
                          <div
                            key={zone}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`zone-${zone}`}
                              checked={selectedAccessZones.includes(zone)}
                              onCheckedChange={() => toggleAccessZone(zone)}
                            />
                            <label
                              htmlFor={`zone-${zone}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {zone}
                            </label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {selectedAccessZones.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedAccessZones.map((zone) => (
                        <Badge
                          key={zone}
                          variant="secondary"
                          className="bg-slate-100"
                        >
                          {zone}
                          <button
                            className="ml-1 hover:text-red-500"
                            onClick={() => toggleAccessZone(zone)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enhanced Photo Upload Section with Drag & Drop */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Upload Photo for Facial Recognition
                  </h3>

                  {/* Single file input for all photo operations */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />

                  {!imagePreview ? (
                    <div
                      className={`border-2 ${
                        isDragging
                          ? "border-teal-500 bg-teal-50"
                          : "border-dashed border-gray-300"
                      } rounded-lg p-6 transition-colors`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="text-center">
                        <Upload
                          className={`mx-auto h-12 w-12 ${
                            isDragging ? "text-teal-500" : "text-gray-400"
                          }`}
                        />
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-2">
                            Drag and drop an image here, or use one of the
                            options below
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="bg-slate-50"
                              onClick={() => {
                                console.log("Choose File clicked");
                                fileInputRef.current?.click();
                              }}
                            >
                              Choose File
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="bg-slate-50"
                              onClick={() => setCameraOpen(true)}
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Take Photo
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img
                          src={imagePreview || "/placeholder.svg"}
                          alt="Preview"
                          className="w-48 h-48 object-cover rounded-lg border shadow-md"
                        />
                        <button
                          onClick={clearImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-slate-50"
                          onClick={() => {
                            console.log("Replace Photo clicked");
                            fileInputRef.current?.click();
                          }}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Replace Photo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={clearImage}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove Photo
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 italic">
                        You can also drag and drop a new image to replace the
                        current one
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> Upon saving this user, the
                      system will automatically detect faces in the image and
                      generate a 'facial embedding' for authentication. Ensure
                      the image contains a clear, well-lit face.
                    </p>
                  </div>
                </div>

                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={handleSaveUser}
                >
                  Save User
                </Button>
              </CardContent>
            </Card>

            {/* Enhanced Existing Users List with Search and Pagination */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Existing Users</span>
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center">
                          Name
                          {sortField === "name" &&
                            (sortDirection === "asc" ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort("email")}
                      >
                        <div className="flex items-center">
                          Email
                          {sortField === "email" &&
                            (sortDirection === "asc" ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort("role")}
                      >
                        <div className="flex items-center">
                          Role
                          {sortField === "role" &&
                            (sortDirection === "asc" ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort("jobTitle")}
                      >
                        <div className="flex items-center">
                          Job Title
                          {sortField === "jobTitle" &&
                            (sortDirection === "asc" ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead>Access Zones</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            {editingUserId === user.id ? (
                              <Input
                                value={editingUser.name}
                                onChange={(e) =>
                                  updateEditingUser("name", e.target.value)
                                }
                                className="h-8"
                              />
                            ) : (
                              user.name
                            )}
                          </TableCell>
                          <TableCell>
                            {editingUserId === user.id ? (
                              <Input
                                value={editingUser.email}
                                onChange={(e) =>
                                  updateEditingUser("email", e.target.value)
                                }
                                className="h-8"
                              />
                            ) : (
                              user.email
                            )}
                          </TableCell>
                          <TableCell>
                            {editingUserId === user.id ? (
                              <Select
                                value={editingUser.role}
                                onValueChange={(value) =>
                                  updateEditingUser("role", value)
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Admin">Admin</SelectItem>
                                  <SelectItem value="User">User</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              user.role
                            )}
                          </TableCell>
                          <TableCell>
                            {editingUserId === user.id ? (
                              <Select
                                value={editingUser.jobTitle}
                                onValueChange={(value) =>
                                  updateEditingUser("jobTitle", value)
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {jobTitleOptions.map((title) => (
                                    <SelectItem key={title} value={title}>
                                      {title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              user.jobTitle
                            )}
                          </TableCell>
                          <TableCell>
                            {editingUserId === user.id ? (
                              <div>
                                <Popover
                                  open={editingAccessZonesOpen}
                                  onOpenChange={setEditingAccessZonesOpen}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={editingAccessZonesOpen}
                                      className="w-full justify-between h-8 text-left font-normal"
                                    >
                                      {editingAccessZones.length > 0
                                        ? `${editingAccessZones.length} zone${
                                            editingAccessZones.length > 1
                                              ? "s"
                                              : ""
                                          }`
                                        : "Select zones"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-[200px] p-0"
                                    align="start"
                                  >
                                    <div className="p-2 space-y-1 max-h-[200px] overflow-auto">
                                      {accessZonesOptions.map((zone) => (
                                        <div
                                          key={zone}
                                          className="flex items-center space-x-2"
                                        >
                                          <Checkbox
                                            id={`edit-zone-${zone}-${user.id}`}
                                            checked={editingAccessZones.includes(
                                              zone
                                            )}
                                            onCheckedChange={() =>
                                              toggleEditingAccessZone(zone)
                                            }
                                          />
                                          <label
                                            htmlFor={`edit-zone-${zone}-${user.id}`}
                                            className="text-sm font-medium leading-none cursor-pointer"
                                          >
                                            {zone}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                {editingAccessZones.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {editingAccessZones
                                      .slice(0, 2)
                                      .map((zone) => (
                                        <Badge
                                          key={zone}
                                          variant="secondary"
                                          className="text-xs py-0 px-1"
                                        >
                                          {zone}
                                        </Badge>
                                      ))}
                                    {editingAccessZones.length > 2 && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs py-0 px-1"
                                      >
                                        +{editingAccessZones.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                {user.accessZones.length > 2
                                  ? `${user.accessZones
                                      .slice(0, 2)
                                      .join(", ")} +${
                                      user.accessZones.length - 2
                                    }`
                                  : user.accessZones.join(", ")}
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {editingUserId === user.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={saveEditing}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditing}
                                    className="text-gray-600 hover:text-gray-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditing(user)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openDeleteModal(user)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-gray-500"
                        >
                          {userSearchTerm
                            ? "No users found matching your search."
                            : "No users found."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Items per page:
                    </span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => setItemsPerPage(Number(value))}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Showing {startIndex + 1} to{" "}
                      {Math.min(endIndex, filteredUsers.length)} of{" "}
                      {filteredUsers.length} users
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 p-0 ${
                              currentPage === page
                                ? "bg-teal-600 hover:bg-teal-700"
                                : ""
                            }`}
                          >
                            {page}
                          </Button>
                        )
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Bulk Onboarding Section */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Bulk Onboarding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Upload a CSV file containing user data for bulk registration.
                  The CSV must include columns for Full Name, Email Address,
                  User Role, Job Title, Access Zones (comma-separated), and a
                  'Photo URL' where each user's facial recognition image is
                  publicly accessible.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="bg-slate-50"
                    onClick={() => setBulkUploadModalOpen(true)}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Bulk User Upload
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-slate-50"
                    onClick={downloadCsvTemplate}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Access Logs Tab - ENHANCED WITH SORTING AND PAGINATION */}
        {activeTab === "logs" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Access Logs
              </h2>
              <p className="text-indigo-200">
                Detailed history of all access attempts
              </p>
            </div>

            {/* Enhanced Filtering Controls */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Filter Access Logs</span>
                  <Button
                    onClick={() => setSummaryModalOpen(true)}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Summary
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-slate-50"
                    />
                  </div>

                  {/* User Filter */}
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select
                      value={selectedUser}
                      onValueChange={setSelectedUser}
                    >
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {Array.from(
                          new Set(accessLogs.map((log) => log.user))
                        ).map((user) => (
                          <SelectItem key={user} value={user}>
                            {user}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Zone Filter */}
                  <div className="space-y-2">
                    <Label>Access Zone</Label>
                    <Select
                      value={selectedZone}
                      onValueChange={setSelectedZone}
                    >
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="All Zones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Zones</SelectItem>
                        {Array.from(
                          new Set(accessLogs.map((log) => log.zone))
                        ).map((zone) => (
                          <SelectItem key={zone} value={zone}>
                            {zone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={setSelectedStatus}
                    >
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Successful">Successful</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Method Filter */}
                  <div className="space-y-2">
                    <Label>Access Method</Label>
                    <Select
                      value={selectedMethod}
                      onValueChange={setSelectedMethod}
                    >
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="All Methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="Facial">Facial</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      setSelectedUser("all");
                      setSelectedZone("all");
                      setSelectedStatus("all");
                      setSelectedMethod("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Access Logs Table with Sorting and Pagination */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Access History ({sortedLogs.length} records)</span>
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleLogSort("timestamp")}
                        >
                          <div className="flex items-center">
                            Timestamp
                            {logSortField === "timestamp" &&
                              (logSortDirection === "asc" ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                              ))}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleLogSort("user")}
                        >
                          <div className="flex items-center">
                            User Name
                            {logSortField === "user" &&
                              (logSortDirection === "asc" ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                              ))}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleLogSort("email")}
                        >
                          <div className="flex items-center">
                            User Email
                            {logSortField === "email" &&
                              (logSortDirection === "asc" ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                              ))}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleLogSort("role")}
                        >
                          <div className="flex items-center">
                            User Role
                            {logSortField === "role" &&
                              (logSortDirection === "asc" ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                              ))}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleLogSort("jobTitle")}
                        >
                          <div className="flex items-center">
                            Job Title
                            {logSortField === "jobTitle" &&
                              (logSortDirection === "asc" ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                              ))}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleLogSort("zone")}
                        >
                          <div className="flex items-center">
                            Zone
                            {logSortField === "zone" &&
                              (logSortDirection === "asc" ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                              ))}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleLogSort("method")}
                        >
                          <div className="flex items-center">
                            Method
                            {logSortField === "method" &&
                              (logSortDirection === "asc" ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                              ))}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleLogSort("status")}
                        >
                          <div className="flex items-center">
                            Status
                            {logSortField === "status" &&
                              (logSortDirection === "asc" ? (
                                <ChevronUp className="w-4 h-4 ml-1" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-1" />
                              ))}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.length > 0 ? (
                        paginatedLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {log.timestamp}
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.user}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {log.email}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  log.role === "Admin" ? "default" : "secondary"
                                }
                              >
                                {log.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {log.jobTitle}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700"
                              >
                                {log.zone}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  log.method === "Facial"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-orange-50 text-orange-700"
                                }
                              >
                                {log.method}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  log.status === "Successful"
                                    ? "default"
                                    : "destructive"
                                }
                                className={
                                  log.status === "Successful"
                                    ? "bg-green-100 text-green-800"
                                    : ""
                                }
                              >
                                {log.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-8 text-gray-500"
                          >
                            {searchTerm ||
                            selectedUser !== "all" ||
                            selectedZone !== "all" ||
                            selectedStatus !== "all" ||
                            selectedMethod !== "all" ||
                            dateFrom ||
                            dateTo
                              ? "No logs found matching your filters."
                              : "No access logs found."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls for Logs */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Items per page:
                    </span>
                    <Select
                      value={logItemsPerPage.toString()}
                      onValueChange={(value) =>
                        setLogItemsPerPage(Number(value))
                      }
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Showing {logStartIndex + 1} to{" "}
                      {Math.min(logEndIndex, sortedLogs.length)} of{" "}
                      {sortedLogs.length} logs
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLogCurrentPage(Math.max(1, logCurrentPage - 1))
                      }
                      disabled={logCurrentPage === 1}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from(
                        { length: Math.min(5, logTotalPages) },
                        (_, i) => {
                          const page =
                            Math.max(
                              1,
                              Math.min(logTotalPages - 4, logCurrentPage - 2)
                            ) + i;
                          return (
                            <Button
                              key={page}
                              variant={
                                logCurrentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setLogCurrentPage(page)}
                              className={`w-8 h-8 p-0 ${
                                logCurrentPage === page
                                  ? "bg-teal-600 hover:bg-teal-700"
                                  : ""
                              }`}
                            >
                              {page}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLogCurrentPage(
                          Math.min(logTotalPages, logCurrentPage + 1)
                        )
                      }
                      disabled={
                        logCurrentPage === logTotalPages || logTotalPages === 0
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
              <p className="text-indigo-200">
                System configuration and management
              </p>
            </div>

            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs
                  defaultValue="zones"
                  value={activeSettingsTab}
                  onValueChange={setActiveSettingsTab}
                >
                  <TabsList className="mb-4">
                    <TabsTrigger value="zones">Zone Management</TabsTrigger>
                    <TabsTrigger value="cameras">Camera Management</TabsTrigger>
                  </TabsList>

                  {/* Zone Management Tab */}
                  <TabsContent value="zones" className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Zone Management
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Define and manage access zones for your facility. Each
                        zone can have multiple cameras assigned to it.
                      </p>
                    </div>

                    {/* Add New Zone Form */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Add New Zone
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <Label htmlFor="zoneName">Zone Name</Label>
                            <Input
                              id="zoneName"
                              placeholder="Enter zone name"
                              value={newZoneName}
                              onChange={(e) => setNewZoneName(e.target.value)}
                              className="bg-slate-50"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              onClick={handleAddZone}
                              className="bg-teal-600 hover:bg-teal-700"
                              disabled={!newZoneName.trim()}
                            >
                              Add Zone
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Existing Zones Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Existing Zones
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Zone Name</TableHead>
                              <TableHead className="w-[200px]">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {zones.length > 0 ? (
                              zones.map((zone) => (
                                <TableRow key={zone.id}>
                                  <TableCell>
                                    {editingZoneId === zone.id ? (
                                      <Input
                                        value={editingZoneName}
                                        onChange={(e) =>
                                          setEditingZoneName(e.target.value)
                                        }
                                        className="h-8"
                                      />
                                    ) : (
                                      zone.name
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {editingZoneId === zone.id ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={saveEditingZone}
                                            className="text-green-600 hover:text-green-700"
                                            disabled={!editingZoneName.trim()}
                                          >
                                            <Save className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={cancelEditingZone}
                                            className="text-gray-600 hover:text-gray-700"
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              startEditingZone(zone)
                                            }
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              openZoneDeleteModal(zone)
                                            }
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={2}
                                  className="text-center py-8 text-gray-500"
                                >
                                  No zones defined. Add your first zone above.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Camera Management Tab */}
                  <TabsContent value="cameras" className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Camera Management
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Manage cameras and assign them to specific access zones.
                        Each camera can be assigned to one zone.
                      </p>
                    </div>

                    {/* Add New Camera Form */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Add New Camera
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <Label htmlFor="cameraName">Camera Name</Label>
                            <Input
                              id="cameraName"
                              placeholder="Enter camera name"
                              value={newCamera.name}
                              onChange={(e) =>
                                setNewCamera({
                                  ...newCamera,
                                  name: e.target.value,
                                })
                              }
                              className="bg-slate-50"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cameraZone">Zone</Label>
                            <Select
                              value={newCamera.zone}
                              onValueChange={(value) =>
                                setNewCamera({ ...newCamera, zone: value })
                              }
                            >
                              <SelectTrigger
                                id="cameraZone"
                                className="bg-slate-50"
                              >
                                <SelectValue placeholder="Select zone" />
                              </SelectTrigger>
                              <SelectContent>
                                {zones.map((zone) => (
                                  <SelectItem key={zone.id} value={zone.name}>
                                    {zone.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="cameraLocation">
                              Location (Optional)
                            </Label>
                            <Input
                              id="cameraLocation"
                              placeholder="Describe camera location"
                              value={newCamera.location}
                              onChange={(e) =>
                                setNewCamera({
                                  ...newCamera,
                                  location: e.target.value,
                                })
                              }
                              className="bg-slate-50"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleAddCamera}
                          className="bg-teal-600 hover:bg-teal-700"
                          disabled={!newCamera.name.trim() || !newCamera.zone}
                        >
                          Add Camera
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Existing Cameras Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Existing Cameras
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Camera Name</TableHead>
                              <TableHead>Zone</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead className="w-[200px]">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cameras.length > 0 ? (
                              cameras.map((camera) => (
                                <TableRow key={camera.id}>
                                  <TableCell>
                                    {editingCameraId === camera.id ? (
                                      <Input
                                        value={editingCamera.name}
                                        onChange={(e) =>
                                          setEditingCamera({
                                            ...editingCamera,
                                            name: e.target.value,
                                          })
                                        }
                                        className="h-8"
                                      />
                                    ) : (
                                      camera.name
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingCameraId === camera.id ? (
                                      <Select
                                        value={editingCamera.zone}
                                        onValueChange={(value) =>
                                          setEditingCamera({
                                            ...editingCamera,
                                            zone: value,
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {zones.map((zone) => (
                                            <SelectItem
                                              key={zone.id}
                                              value={zone.name}
                                            >
                                              {zone.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="bg-blue-50 text-blue-700"
                                      >
                                        {camera.zone || "Unassigned"}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingCameraId === camera.id ? (
                                      <Input
                                        value={editingCamera.location}
                                        onChange={(e) =>
                                          setEditingCamera({
                                            ...editingCamera,
                                            location: e.target.value,
                                          })
                                        }
                                        className="h-8"
                                      />
                                    ) : (
                                      camera.location || "-"
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {editingCameraId === camera.id ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={saveEditingCamera}
                                            className="text-green-600 hover:text-green-700"
                                            disabled={
                                              !editingCamera.name.trim() ||
                                              !editingCamera.zone
                                            }
                                          >
                                            <Save className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={cancelEditingCamera}
                                            className="text-gray-600 hover:text-gray-700"
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              startEditingCamera(camera)
                                            }
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              openCameraDeleteModal(camera)
                                            }
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="text-center py-8 text-gray-500"
                                >
                                  No cameras defined. Add your first camera
                                  above.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{userToDelete?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={bulkUploadModalOpen} onOpenChange={setBulkUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk User Upload</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing user data for bulk registration. The
              CSV must include columns for Full Name, Email Address, User Role,
              Job Title, Access Zones (comma-separated), and a 'Photo URL'.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {uploadStatus === "idle" ? (
              <div
                className={`border-2 ${
                  csvIsDragging
                    ? "border-teal-500 bg-teal-50"
                    : "border-dashed border-gray-300"
                } rounded-lg p-6 transition-colors`}
                onDragOver={handleCsvDragOver}
                onDragLeave={handleCsvDragLeave}
                onDrop={handleCsvDrop}
              >
                <div className="text-center">
                  <FileSpreadsheet
                    className={`mx-auto h-12 w-12 ${
                      csvIsDragging ? "text-teal-500" : "text-gray-400"
                    }`}
                  />
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                      Drag and drop a CSV file here, or click to select a file
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-slate-50"
                      onClick={() => csvFileInputRef.current?.click()}
                    >
                      Choose CSV File
                    </Button>
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvUpload}
                    />
                  </div>
                </div>
              </div>
            ) : uploadStatus === "processing" ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                <p className="text-gray-600">{uploadMessage}</p>
              </div>
            ) : uploadStatus === "success" ? (
              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Success</AlertTitle>
                <AlertDescription className="text-green-700">
                  {uploadMessage}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Error</AlertTitle>
                <AlertDescription className="text-red-700">
                  {uploadMessage}
                </AlertDescription>
              </Alert>
            )}

            {selectedCsvFile && uploadStatus === "idle" && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                <FileSpreadsheet className="h-5 w-5 text-teal-600" />
                <span className="text-sm font-medium truncate">
                  {selectedCsvFile.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCsvFile}
                  className="ml-auto h-6 w-6 p-0 hover:bg-red-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="bg-slate-50"
                onClick={downloadCsvTemplate}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template CSV
              </Button>
              <p className="text-xs text-gray-500">
                Download a template CSV file with the required headers for bulk
                upload.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBulkUploadModalOpen(false);
                setSelectedCsvFile(null);
                setUploadStatus("idle");
              }}
              disabled={uploadStatus === "processing"}
            >
              Cancel
            </Button>
            <Button
              onClick={processBulkUpload}
              className="bg-teal-600 hover:bg-teal-700"
              disabled={!selectedCsvFile || uploadStatus === "processing"}
            >
              Process Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Access Summary Modal with Sorting and Filtering */}
      <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Access Summary & Insights</DialogTitle>
            <DialogDescription>
              Daily access summary for all users (Today:{" "}
              {new Date().toLocaleDateString()})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">
                      {
                        Array.from(new Set(accessLogs.map((log) => log.user)))
                          .length
                      }
                    </p>
                    <p className="text-sm text-gray-600">Active Users</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {
                        accessLogs.filter((log) => log.status === "Successful")
                          .length
                      }
                    </p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {
                        accessLogs.filter((log) => log.status === "Failed")
                          .length
                      }
                    </p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {
                        Array.from(new Set(accessLogs.map((log) => log.zone)))
                          .length
                      }
                    </p>
                    <p className="text-sm text-gray-600">Zones Accessed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Filtering and Search for Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Filter User Summary</span>
                  <SlidersHorizontal className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Search Users</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name or email..."
                        value={summarySearchTerm}
                        onChange={(e) => setSummarySearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter by Status</Label>
                    <Select
                      value={summaryStatusFilter}
                      onValueChange={setSummaryStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="successful">
                          Users with Successful Access
                        </SelectItem>
                        <SelectItem value="failed">
                          Users with Failed Access
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSummarySearchTerm("");
                        setSummaryStatusFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Per-User Summary with Sorting */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                User Access Summary ({filteredSummaryData.length} users)
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSummarySort("user")}
                      >
                        <div className="flex items-center">
                          User
                          {summarySortField === "user" &&
                            (summarySortDirection === "asc" ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSummarySort("email")}
                      >
                        <div className="flex items-center">
                          Email
                          {summarySortField === "email" &&
                            (summarySortDirection === "asc" ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSummarySort("firstAccess")}
                      >
                        <div className="flex items-center">
                          First Access
                          {summarySortField === "firstAccess" &&
                            (summarySortDirection === "asc" ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSummarySort("lastAccess")}
                      >
                        <div className="flex items-center">
                          Last Access
                          {summarySortField === "lastAccess" &&
                            (summarySortDirection === "asc" ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSummarySort("totalAccesses")}
                      >
                        <div className="flex items-center">
                          Total Accesses
                          {summarySortField === "totalAccesses" &&
                            (summarySortDirection === "asc" ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSummarySort("successRate")}
                      >
                        <div className="flex items-center">
                          Success Rate
                          {summarySortField === "successRate" &&
                            (summarySortDirection === "asc" ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead>Success/Failed</TableHead>
                      <TableHead>Accesses per Zone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummaryData.length > 0 ? (
                      filteredSummaryData.map((summary) => (
                        <TableRow key={summary.user}>
                          <TableCell className="font-medium">
                            {summary.user}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {summary.email}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {summary.firstAccess}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {summary.lastAccess}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {summary.totalAccesses}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                summary.successRate >= 80
                                  ? "default"
                                  : summary.successRate >= 50
                                  ? "secondary"
                                  : "destructive"
                              }
                              className={
                                summary.successRate >= 80
                                  ? "bg-green-100 text-green-800"
                                  : summary.successRate >= 50
                                  ? "bg-yellow-100 text-yellow-800"
                                  : ""
                              }
                            >
                              {summary.successRate}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge
                                variant="default"
                                className="bg-green-100 text-green-800 text-xs"
                              >
                                ✓ {summary.successful}
                              </Badge>
                              <Badge variant="destructive" className="text-xs">
                                ✗ {summary.failed}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(summary.zoneAccesses).map(
                                ([zone, count]) => (
                                  <Badge
                                    key={zone}
                                    variant="outline"
                                    className="bg-blue-50 text-blue-700 text-xs"
                                  >
                                    {zone}: {count}
                                  </Badge>
                                )
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-gray-500"
                        >
                          {summarySearchTerm || summaryStatusFilter !== "all"
                            ? "No users found matching your filters."
                            : "No user data available."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSummaryModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Delete Confirmation Modal */}
      <Dialog open={zoneDeleteModalOpen} onOpenChange={setZoneDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the zone{" "}
              <strong>{zoneToDelete?.name}</strong>? This action cannot be
              undone.
              {cameras.some((camera) => camera.zone === zoneToDelete?.name) && (
                <div className="mt-2 text-red-600">
                  Warning: This zone has cameras assigned to it. Deleting this
                  zone will unassign these cameras.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelZoneDelete}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmZoneDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Delete Confirmation Modal */}
      <Dialog
        open={cameraDeleteModalOpen}
        onOpenChange={setCameraDeleteModalOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the camera{" "}
              <strong>{cameraToDelete?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelCameraDelete}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCameraDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Observed User Details Modal */}
      <Dialog
        open={!!observedUserDetails}
        onOpenChange={() => setObservedUserDetails(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observed User Details</DialogTitle>
            <DialogDescription>
              Temporary ID: <strong>{observedUserDetails?.id}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <strong>First Seen:</strong> {observedUserDetails?.firstSeen}
            </div>
            <div>
              <strong>Last Seen:</strong> {observedUserDetails?.lastSeen}
            </div>
            <div>
              <strong>Temp Accesses:</strong>{" "}
              {observedUserDetails?.tempAccesses}
            </div>
            <div>
              <strong>Accessed Zones:</strong>{" "}
              {observedUserDetails?.accessedZones?.join(", ")}
            </div>
            <div>
              <strong>Status:</strong> {observedUserDetails?.status}
            </div>
            <div>
              <strong>AI Suggested Action:</strong>{" "}
              {observedUserDetails?.aiAction}
            </div>
            <div className="mt-2 text-blue-700">
              <strong>AI Insights:</strong> This user was detected by the system
              but is not yet registered. Please review and take appropriate
              action.
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setObservedUserDetails(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
