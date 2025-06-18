import { useState } from "react";
import KPICards from "./KPICards";
import SecurityAlerts from "./SecurityAlerts";
import AIRecommendations from "./AIRecommendations";
import ObservedUsers from "./ObservedUsers";
import AccessLogTable from "./AccessLogTable";
import SecurityTrendsChart from "./SecurityTrendsChart";
import FailureCauseChart from "./FailureCauseChart";
import AIDetailsModal from "../shared/AIDetailsModal";

const dashboardTabs = [
  { id: "overview", label: "Overview" },
  { id: "observed", label: "Observed Users" },
  { id: "logs", label: "Detailed Logs" },
  { id: "analytics", label: "Analytics" },
];

interface DashboardOverviewProps {
  users: any[];
  accessLogs: any[];
  zones: any[];
  cameras: any[];
}

export default function DashboardOverview({ 
  users, 
  accessLogs, 
  zones, 
  cameras 
}: DashboardOverviewProps) {
  const [dashboardTab, setDashboardTab] = useState(dashboardTabs[0].id);
  const [aiDetailsUser, setAIDetailsUser] = useState(null);
  const [aiDetailsLog, setAIDetailsLog] = useState(null);
  const [aiRecDetails, setAIRecDetails] = useState(null);

  // Mock data for observed users
  const observedUsers = [
    {
      id: 1,
      name: "Unknown User 1",
      photoUrl: "/placeholder-user.jpg",
      firstSeen: "2025-01-10 09:15",
      lastSeen: "2025-01-10 14:30",
      tempAccesses: 3,
      accessedZones: ["Main Entrance", "Zone A"],
      status: "in_review_admin" as const,
      confidence: 85,
    },
    {
      id: 2,
      name: "Unknown User 2",
      photoUrl: "/placeholder-user.jpg",
      firstSeen: "2025-01-10 11:20",
      lastSeen: "2025-01-10 16:45",
      tempAccesses: 1,
      accessedZones: ["Main Entrance"],
      status: "active_temporal" as const,
      confidence: 72,
    },
  ];

  // Mock data for analytics
  const trendData = [
    { date: "2025-01-05", alerts: 2, aiPrediction: 3, actualIncidents: 1 },
    { date: "2025-01-06", alerts: 1, aiPrediction: 2, actualIncidents: 2 },
    { date: "2025-01-07", alerts: 3, aiPrediction: 4, actualIncidents: 3 },
    { date: "2025-01-08", alerts: 0, aiPrediction: 1, actualIncidents: 0 },
    { date: "2025-01-09", alerts: 2, aiPrediction: 2, actualIncidents: 1 },
    { date: "2025-01-10", alerts: 4, aiPrediction: 5, actualIncidents: 2 },
  ];

  const failureCauseData = [
    { name: "Face Not Recognized", value: 45, color: "#ef4444" },
    { name: "Poor Image Quality", value: 25, color: "#f59e0b" },
    { name: "Access Denied", value: 15, color: "#3b82f6" },
    { name: "System Error", value: 10, color: "#10b981" },
    { name: "Other", value: 5, color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <nav className="flex space-x-6">
          {dashboardTabs.map((tab) => (
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

      {dashboardTab === "overview" && (
        <>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Facial Access Control Dashboard - Security Overview
            </h2>
            <p className="text-indigo-200">
              AI-powered insights for proactive security management
            </p>
          </div>

          <KPICards users={users} accessLogs={accessLogs} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SecurityAlerts />
            <AIRecommendations onAction={setAIRecDetails} />
          </div>
        </>
      )}

      {dashboardTab === "observed" && (
        <ObservedUsers 
          users={observedUsers}
          onUserDetails={setAIDetailsUser}
        />
      )}

      {dashboardTab === "logs" && (
        <AccessLogTable 
          logs={accessLogs}
          onAIDetails={setAIDetailsLog}
        />
      )}

      {dashboardTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SecurityTrendsChart data={trendData} />
          <FailureCauseChart data={failureCauseData} />
        </div>
      )}

      {/* AI Details Modals */}
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
  );
}
