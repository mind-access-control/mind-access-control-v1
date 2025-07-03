import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertTriangle, Zap, CheckCircle, XCircle } from 'lucide-react';

// IMPORTAR LAS INTERFACES DESDE EL ARCHIVO COMPARTIDO
import { ObservedUser, ItemWithNameAndId } from '@/types/common';

interface ObservedUsersOverviewCardsProps {
  totalObserved: number;
  pendingReviewCount: number;
  highRiskCount: number;
  activeTemporalCount: number;
  expiredCount: number;
  onCardClick: (type: 'total' | 'pendingReview' | 'highRisk' | 'activeTemporal' | 'expired') => void;
}

const ObservedUsersOverviewCards: React.FC<ObservedUsersOverviewCardsProps> = ({
  totalObserved,
  pendingReviewCount,
  highRiskCount,
  activeTemporalCount,
  expiredCount,
  onCardClick,
}) => {
  const summary = useMemo(() => {
    const total = totalObserved;
    const pending = pendingReviewCount;
    const high = highRiskCount;
    const active = activeTemporalCount;
    const expired = expiredCount;

    let primaryActionMessage = 'All good!';
    let primaryActionColor = 'text-green-600';
    let primaryActionIcon = <CheckCircle className="w-8 h-8" />;

    if (high > 0) {
      primaryActionMessage = `${high} high-risk users!`;
      primaryActionColor = 'text-red-600';
      primaryActionIcon = <XCircle className="w-8 h-8" />;
    } else if (pending > 0) {
      primaryActionMessage = `${pending} users pending review!`;
      primaryActionColor = 'text-yellow-600';
      primaryActionIcon = <AlertTriangle className="w-8 h-8" />;
    } else if (expired > 0) {
      primaryActionMessage = `${expired} expired temporal accesses.`;
      primaryActionColor = 'text-blue-600';
      primaryActionIcon = <Zap className="w-8 h-8" />;
    }

    return {
      totalObserved: total,
      pendingReview: pending,
      highRisk: high,
      activeTemporal: active,
      expired: expired,
      primaryActionMessage,
      primaryActionColor,
      primaryActionIcon,
    };
  }, [totalObserved, pendingReviewCount, highRiskCount, activeTemporalCount, expiredCount]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Card: Total Observed Users */}
      <Card
        className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-shadow"
        title="Total Observed: All users detected by the system."
        onClick={() => onCardClick('total')}
      >
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" /> Total Observed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-gray-800">{summary.totalObserved}</div>
          <p className="text-xs text-gray-500">Users detected</p>
        </CardContent>
      </Card>

      {/* Card: Pending Review */}
      <Card
        className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-shadow"
        title="Pending Review: Users with active temporary access and more than 5 accesses. They might need admin review for permanent registration."
        onClick={() => onCardClick('pendingReview')}
      >
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" /> Pending Review
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-yellow-600">{summary.pendingReview}</div>
          <p className="text-xs text-gray-500">Need admin action</p>
        </CardContent>
      </Card>

      {/* Card: High Risk */}
      <Card
        className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-shadow"
        title="High Risk: Users who have triggered an automatic alert (e.g., after 3 consecutive denied access attempts). Does not include manually blocked users." // ¡TOOLTIP ACTUALIZADO!
        onClick={() => onCardClick('highRisk')}
      >
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" /> High Risk
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-red-600">{summary.highRisk}</div>
          <p className="text-xs text-gray-500">Immediate attention</p>
        </CardContent>
      </Card>

      {/* Card: Active Temporal */}
      <Card
        className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-shadow"
        title="Active (Temp): Users with currently allowed temporary access."
        onClick={() => onCardClick('activeTemporal')}
      >
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" /> Active (Temp)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-blue-600">{summary.activeTemporal}</div>
          <p className="text-xs text-gray-500">Currently allowed access</p>
        </CardContent>
      </Card>

      {/* Card: Expired Temporal Accesses */}
      <Card
        className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-shadow"
        title="Expired: Users whose temporary access has ended."
        onClick={() => onCardClick('expired')}
      >
        <CardHeader className="p-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-gray-500" /> Expired
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-3xl font-bold text-gray-600">{summary.expired}</div>
          <p className="text-xs text-gray-500">Access has ended</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ObservedUsersOverviewCards;
