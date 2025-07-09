'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface SecurityTrendsChartProps {
  data: { name: string; success: number; failed: number }[];
  title?: string;
}

const SecurityTrendsChart: React.FC<SecurityTrendsChartProps> = ({ data, title = 'Security Trends (Weekly)' }) => {
  // Datos de ejemplo si no hay datos o los datos son insuficientes
  const defaultData = [
    { name: 'Mon', success: 4000, failed: 2400 },
    { name: 'Tue', success: 3000, failed: 1398 },
    { name: 'Wed', success: 2000, failed: 9800 },
    { name: 'Thu', success: 2780, failed: 3908 },
    { name: 'Fri', success: 1890, failed: 4800 },
    { name: 'Sat', success: 2390, failed: 3800 },
    { name: 'Sun', success: 3490, failed: 4300 },
  ];

  const chartData = data.length > 0 ? data : defaultData;

  return (
    <Card className="bg-white rounded-xl shadow-lg p-4">
      <div className="font-semibold text-lg mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-500" /> {title}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
          <YAxis tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
          <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          <Line type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 text-center mt-2">Daily successful vs. failed access attempts.</p>
    </Card>
  );
};

export default SecurityTrendsChart;
