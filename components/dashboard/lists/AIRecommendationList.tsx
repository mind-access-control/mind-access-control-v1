'use client';

import React from 'react';
import { Card } from '@/components/ui/card'; // Importar Card de shadcn/ui
import { Button } from '@/components/ui/button'; // Importar Button de shadcn/ui
import { Lightbulb, ArrowRight } from 'lucide-react'; // Iconos de Lucide React

interface AIRecommendationListProps {
  recommendations: { id: string; action: string; details: string; data?: any }[];
  onAction: (recommendation: any) => void;
}

const AIRecommendationList: React.FC<AIRecommendationListProps> = ({ recommendations, onAction }) => {
  return (
    <Card className="bg-white rounded-xl shadow-lg p-4">
      <div className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-blue-500" /> AI-Suggested Actions
      </div>
      {recommendations.length > 0 ? (
        <ul className="space-y-3">
          {recommendations.map((rec) => (
            <li key={rec.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <div className="font-medium text-blue-800">{rec.action}</div>
                <div className="text-sm text-blue-600">{rec.details}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onAction({ ...rec, type: 'recommendation' })}>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-4">No AI recommendations currently.</p>
      )}
    </Card>
  );
};

export default AIRecommendationList;
