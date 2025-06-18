import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  alert?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function KpiCard({ 
  icon, 
  label, 
  value, 
  highlight = false, 
  alert = false,
  trend 
}: KpiCardProps) {
  return (
    <Card className={cn(
      "bg-white rounded-xl shadow-lg p-6 transition-all duration-200",
      highlight && "ring-2 ring-teal-500",
      alert && "ring-2 ring-red-500 animate-pulse",
      !highlight && !alert && "hover:shadow-xl"
    )}>
      <CardContent className="flex flex-col items-center text-center">
        <div className="mb-4 text-gray-600">{icon}</div>
        <div className="text-sm text-gray-600 mb-2">{label}</div>
        <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
        {trend && (
          <div className={cn(
            "text-xs font-medium",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}>
            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}% from last week
          </div>
        )}
      </CardContent>
    </Card>
  );
} 