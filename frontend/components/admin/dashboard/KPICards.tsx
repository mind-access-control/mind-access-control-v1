import { Users, Shield, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import RiskScoreCard from "../shared/RiskScoreCard";
import KpiCard from "../shared/KpiCard";
import SecurityAlertCard from "../shared/SecurityAlertCard";

interface KPICardsProps {
  users: any[];
  accessLogs: any[];
}

export default function KPICards({ users, accessLogs }: KPICardsProps) {
  const kpiData = {
    totalUsers: users.length || 247,
    activeZones: 12,
    accessesToday: accessLogs.length || 89,
    activeAlerts: 2,
    anomalousAttempts: 3,
    successRate: 94.2,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
      <div className="col-span-1">
        <RiskScoreCard score={23} status="low" />
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
  );
}
