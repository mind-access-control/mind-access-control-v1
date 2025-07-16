'use client';

import React, { useState } from 'react'; // Importar useState
import { Card, CardContent } from '@/components/ui/card';
import { EMPTY_STRING } from '@/lib/constants';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  alert?: boolean;
  tooltipText?: string; // Prop para el texto del tooltip
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, highlight = false, alert = false, tooltipText }) => {
  const [showTooltip, setShowTooltip] = useState(false); // Estado para controlar la visibilidad del tooltip

  return (
    <div className="relative">
      {' '}
      {/* Contenedor relativo para posicionar el tooltip */}
      <Card
        className={`bg-white rounded-xl shadow-lg p-6 flex flex-col items-center cursor-pointer ${highlight ? 'border-2 border-teal-500' : EMPTY_STRING}`}
        onMouseEnter={() => setShowTooltip(true)} // Mostrar tooltip al entrar el ratón
        onMouseLeave={() => setShowTooltip(false)} // Ocultar tooltip al salir el ratón
      >
        <CardContent className="p-0 flex flex-col items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              alert ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'
            }`}
          >
            {icon}
          </div>
          <div className="text-sm text-gray-600 mb-1">{label}</div>
          <div className="text-3xl font-bold text-gray-800">{value}</div>
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

export default KpiCard;
