import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Alert {
  id: string;
  name: string;
  reason: string;
}

interface SecurityAlertsProps {
  alerts?: Alert[];
}

export default function SecurityAlerts({ alerts = [] }: SecurityAlertsProps) {
  return (
    <Card className="bg-white rounded-xl shadow-lg p-4">
      <div className="font-semibold text-lg mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500" /> Suspicious Activities
      </div>
      {alerts.length > 0 ? (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
            >
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center mr-2">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-red-800">{alert.name}</div>
                  <div className="text-sm text-red-600">{alert.reason}</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => console.log("Alert details", alert)}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-4">
          No suspicious activities at this time.
        </p>
      )}
    </Card>
  );
}
