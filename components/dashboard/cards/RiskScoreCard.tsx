'use client';

import React, { useState } from 'react'; // Importar useState
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';
import { RiskStatus } from '@/app/enums';

interface RiskScoreCardProps {
  score: number;
  status: RiskStatus;
  tooltipText?: string; // Prop para el texto del tooltip
}

const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ score, status, tooltipText }) => {
  const [showTooltip, setShowTooltip] = useState(false); // Estado para controlar la visibilidad del tooltip

  const statusColor = status === RiskStatus.LOW ? 'text-green-500' : status === RiskStatus.MODERATE ? 'text-yellow-500' : 'text-red-500';
  const bgColor = status === RiskStatus.LOW ? 'bg-green-50' : status === RiskStatus.MODERATE ? 'bg-yellow-50' : 'bg-red-50';
  const borderColor = status === RiskStatus.LOW ? 'border-green-200' : status === RiskStatus.MODERATE ? 'border-yellow-200' : 'border-red-200';

  return (
    <div className="relative">
      {' '}
      {/* Contenedor relativo para posicionar el tooltip */}
      <Card
        className={`rounded-xl shadow-lg p-6 flex flex-col items-center border cursor-pointer ${borderColor} ${bgColor}`}
        onMouseEnter={() => setShowTooltip(true)} // Mostrar tooltip al entrar el ratón
        onMouseLeave={() => setShowTooltip(false)} // Ocultar tooltip al salir el ratón
      >
        <CardContent className="p-0 flex flex-col items-center">
          <Lightbulb className={`w-10 h-10 mb-2 ${statusColor}`} />
          <div className="text-sm text-gray-600 mb-1">Overall Risk Score</div>
          <div className={`text-4xl font-bold ${statusColor}`}>{score}</div>
          <Badge className={`mt-2 ${bgColor} border ${borderColor} text-gray-800`}>{status.charAt(0).toUpperCase() + status.slice(1)} Risk</Badge>
        </CardContent>
      </Card>
      {tooltipText &&
        showTooltip && ( // Solo muestra el tooltip si hay texto y showTooltip es true
          <div
            className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2
                     bg-gray-800 text-white text-xs rounded-md py-1 px-2
                     opacity-0 transition-opacity duration-300 pointer-events-none"
            style={{ opacity: showTooltip ? 1 : 0 }} // Controlar opacidad con el estado
          >
            {tooltipText}
            <div className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-800"></div>{' '}
            {/* Flecha del tooltip */}
          </div>
        )}
    </div>
  );
};

export default RiskScoreCard;
