import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIRecommendation {
  id: number;
  text: string;
  type: "security" | "optimization" | "maintenance" | "alert";
  priority: "low" | "medium" | "high";
  timestamp: string;
  actionRequired: boolean;
}

interface AIRecommendationListProps {
  recommendations: AIRecommendation[];
  onAction: (recommendation: AIRecommendation) => void;
}

export default function AIRecommendationList({ 
  recommendations, 
  onAction 
}: AIRecommendationListProps) {
  const getTypeConfig = (type: AIRecommendation["type"]) => {
    switch (type) {
      case "security":
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: "text-red-600 bg-red-100",
          label: "Security"
        };
      case "optimization":
        return {
          icon: <Lightbulb className="w-4 h-4" />,
          color: "text-blue-600 bg-blue-100",
          label: "Optimization"
        };
      case "maintenance":
        return {
          icon: <Clock className="w-4 h-4" />,
          color: "text-yellow-600 bg-yellow-100",
          label: "Maintenance"
        };
      case "alert":
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: "text-orange-600 bg-orange-100",
          label: "Alert"
        };
    }
  };

  const getPriorityColor = (priority: AIRecommendation["priority"]) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
    }
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-500" />
          AI Recommendations
          {recommendations.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {recommendations.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.slice(0, 5).map((rec) => {
              const typeConfig = getTypeConfig(rec.type);
              return (
                <div
                  key={rec.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn("text-xs", typeConfig.color)}>
                          {typeConfig.icon}
                          {typeConfig.label}
                        </Badge>
                        <span className={cn("text-xs font-medium", getPriorityColor(rec.priority))}>
                          {rec.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{rec.text}</p>
                      <div className="text-xs text-gray-500">{rec.timestamp}</div>
                    </div>
                    {rec.actionRequired && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAction(rec)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Action
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No AI recommendations at this time</p>
              <p className="text-sm">System is analyzing patterns and will provide suggestions</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 