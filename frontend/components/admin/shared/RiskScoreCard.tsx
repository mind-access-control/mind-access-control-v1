import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Shield, CheckCircle } from "lucide-react";

interface RiskScoreCardProps {
  score: number;
  status: "low" | "moderate" | "high";
}

export default function RiskScoreCard({ score, status }: RiskScoreCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "low":
        return {
          color: "text-green-600 bg-green-100",
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          label: "Low Risk"
        };
      case "moderate":
        return {
          color: "text-yellow-600 bg-yellow-100",
          icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
          label: "Moderate Risk"
        };
      case "high":
        return {
          color: "text-red-600 bg-red-100",
          icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
          label: "High Risk"
        };
      default:
        return {
          color: "text-gray-600 bg-gray-100",
          icon: <Shield className="w-6 h-6 text-gray-600" />,
          label: "Unknown Risk"
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6">
      <CardContent className="flex flex-col items-center text-center">
        <div className="mb-4">{config.icon}</div>
        <div className="text-2xl font-bold text-gray-800 mb-2">Risk Score</div>
        <div className="text-4xl font-bold text-gray-900 mb-2">{score}</div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
          {config.label}
        </div>
      </CardContent>
    </Card>
  );
} 