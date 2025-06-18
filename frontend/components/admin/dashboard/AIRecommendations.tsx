import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Recommendation {
  id: string;
  action: string;
  details: string;
}

interface AIRecommendationsProps {
  recommendations?: Recommendation[];
}

export default function AIRecommendations({
  recommendations = [],
}: AIRecommendationsProps) {
  return (
    <Card className="bg-white rounded-xl shadow-lg p-4">
      <div className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-blue-500" /> AI-Suggested Actions
      </div>
      {recommendations.length > 0 ? (
        <ul className="space-y-3">
          {recommendations.map((rec) => (
            <li
              key={rec.id}
              className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
            >
              <div>
                <div className="font-medium text-blue-800">{rec.action}</div>
                <div className="text-sm text-blue-600">{rec.details}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => console.log("Recommendation action", rec)}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-4">
          No AI recommendations currently.
        </p>
      )}
    </Card>
  );
}
