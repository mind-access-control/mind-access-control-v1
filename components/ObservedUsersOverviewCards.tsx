import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, Zap, CheckCircle, XCircle } from "lucide-react";

// IMPORTAR LAS INTERFACES DESDE EL ARCHIVO COMPARTIDO
import { ObservedUser, ItemWithNameAndId } from "@/types/common"; // AJUSTA LA RUTA SI ES NECESARIO

// ELIMINAR LAS DEFINICIONES DE INTERFACE ObservedUser, ItemWithNameAndId
// DE AQUÍ, YA VIENEN IMPORTADAS.
// No deben existir líneas como:
// interface ItemWithNameAndId { ... }
// interface ObservedUser { ... }

interface ObservedUsersOverviewCardsProps {
  observedUsers: ObservedUser[];
}

const ObservedUsersOverviewCards: React.FC<ObservedUsersOverviewCardsProps> = ({
  observedUsers,
}) => {
  // Calculate summary data using useMemo for performance
  const summary = useMemo(() => {
    const totalObserved = observedUsers.length;
    const pendingReview = observedUsers.filter(
      (user) =>
        user.status.name === "Pending Review" ||
        user.status.name === "in_review_admin"
    ).length;
    const highRisk = observedUsers.filter(
      (user) => user.status.name === "High Risk"
    ).length;
    const activeTemporal = observedUsers.filter(
      (user) => user.status.name === "active_temporal"
    ).length;
    const expired = observedUsers.filter(
      (user) => user.status.name === "expired"
    ).length;

    // Determine the primary alert/action needed
    let primaryActionMessage = "All good!";
    let primaryActionColor = "text-green-600";
    let primaryActionIcon = <CheckCircle className="w-8 h-8" />;

    if (pendingReview > 0) {
      primaryActionMessage = `${pendingReview} users pending review!`;
      primaryActionColor = "text-yellow-600";
      primaryActionIcon = <AlertTriangle className="w-8 h-8" />;
    } else if (highRisk > 0) {
      primaryActionMessage = `${highRisk} high-risk users!`;
      primaryActionColor = "text-red-600";
      primaryActionIcon = <XCircle className="w-8 h-8" />;
    } else if (expired > 0) {
      primaryActionMessage = `${expired} expired temporal accesses.`;
      primaryActionColor = "text-blue-600";
      primaryActionIcon = <Zap className="w-8 h-8" />;
    }

    return {
      totalObserved,
      pendingReview,
      highRisk,
      activeTemporal,
      expired,
      primaryActionMessage,
      primaryActionColor,
      primaryActionIcon,
    };
  }, [observedUsers]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Card: Total Observed Users */}
      <Card className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center justify-center">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" /> Total Observed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-gray-800">
            {summary.totalObserved}
          </div>
          <p className="text-xs text-gray-500">Users detected</p>
        </CardContent>
      </Card>

      {/* Card: Pending Review */}
      <Card className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center justify-center">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" /> Pending Review
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-yellow-600">
            {summary.pendingReview}
          </div>
          <p className="text-xs text-gray-500">Need admin action</p>
        </CardContent>
      </Card>

      {/* Card: High Risk */}
      <Card className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center justify-center">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" /> High Risk
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-red-600">
            {summary.highRisk}
          </div>
          <p className="text-xs text-gray-500">Immediate attention</p>
        </CardContent>
      </Card>

      {/* Card: Active Temporal */}
      <Card className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center justify-center">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" /> Active (Temp)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-blue-600">
            {summary.activeTemporal}
          </div>
          <p className="text-xs text-gray-500">Currently allowed access</p>
        </CardContent>
      </Card>

      {/* Card: Expired Temporal Accesses */}
      <Card className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center justify-center">
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-gray-500" /> Expired
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-gray-600">
            {summary.expired}
          </div>
          <p className="text-xs text-gray-500">Access has ended</p>
        </CardContent>
      </Card>

      {/* Primary Action / Status Card (optional, can be integrated elsewhere) */}
      <Card
        className={`col-span-full bg-white rounded-xl shadow-lg p-4 flex items-center justify-center transition-colors duration-200 ${summary.primaryActionColor.replace(
          "text",
          "border"
        )}-100 border-l-4`}
      >
        <div className={`mr-4 ${summary.primaryActionColor}`}>
          {summary.primaryActionIcon}
        </div>
        <p className={`text-xl font-semibold ${summary.primaryActionColor}`}>
          {summary.primaryActionMessage}
        </p>
      </Card>
    </div>
  );
};

export default ObservedUsersOverviewCards;
