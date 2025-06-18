import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityAlertCardProps {
  count: number;
  criticalCount?: number;
}

export default function SecurityAlertCard({ count, criticalCount = 0 }: SecurityAlertCardProps) {
  const hasAlerts = count > 0;
  const hasCriticalAlerts = criticalCount > 0;

  return (
    <Card className={cn(
      "bg-white rounded-xl shadow-lg p-6 transition-all duration-200",
      hasCriticalAlerts && "ring-2 ring-red-500 animate-pulse",
      hasAlerts && !hasCriticalAlerts && "ring-2 ring-yellow-500",
      !hasAlerts && "hover:shadow-xl"
    )}>
      <CardContent className="flex flex-col items-center text-center">
        <div className="mb-4">
          <AlertTriangle className={cn(
            "w-8 h-8",
            hasCriticalAlerts ? "text-red-500" : hasAlerts ? "text-yellow-500" : "text-gray-400"
          )} />
        </div>
        <div className="text-sm text-gray-600 mb-2">Active Security Alerts</div>
        <div className="text-3xl font-bold mb-1">
          <span className={cn(
            hasCriticalAlerts ? "text-red-600" : hasAlerts ? "text-yellow-600" : "text-gray-900"
          )}>
            {count}
          </span>
        </div>
        {hasCriticalAlerts && (
          <div className="text-xs text-red-600 font-medium">
            {criticalCount} critical
          </div>
        )}
      </CardContent>
    </Card>
  );
} 