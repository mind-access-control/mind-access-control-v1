import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SecurityTrendsChartProps {
  data: Array<{
    date: string;
    alerts: number;
    aiPrediction: number;
    actualIncidents: number;
  }>;
}

export default function SecurityTrendsChart({ data }: SecurityTrendsChartProps) {
  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle>Security Trends & AI Predictions</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="alerts"
              stroke="#ef4444"
              strokeWidth={2}
              name="Security Alerts"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="aiPrediction"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="AI Predictions"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="actualIncidents"
              stroke="#10b981"
              strokeWidth={2}
              name="Actual Incidents"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 