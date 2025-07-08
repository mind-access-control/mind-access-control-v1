'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle } from 'lucide-react';

interface FailureCauseChartProps {
  data: { name: string; value: number }[];
  title?: string;
}

// Colores para el gráfico de pastel (pueden venir de mock-data o definirse aquí)
const PIE_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#84cc16', '#a855f7', '#ec4899'];

const FailureCauseChart: React.FC<FailureCauseChartProps> = ({ data, title = 'Top Failure Causes' }) => {
  // Datos de ejemplo si no hay datos o los datos son insuficientes
  const defaultData = [
    { name: 'Incorrect Face', value: 400 },
    { name: 'Access Denied', value: 300 },
    { name: 'Invalid Zone', value: 300 },
    { name: 'System Error', value: 200 },
  ];

  const chartData = data.length > 0 ? data : defaultData;

  return (
    <Card className="bg-white rounded-xl shadow-lg p-4">
      <div className="font-semibold text-lg mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-orange-500" /> {title}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 text-center mt-2">Distribution of common reasons for failed access.</p>
    </Card>
  );
};

export default FailureCauseChart;
