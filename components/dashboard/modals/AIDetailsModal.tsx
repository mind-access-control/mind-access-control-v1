'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AIDetailsModalProps {
  open: boolean;
  onClose: () => void;
  details: any; // Puede ser un tipo más específico si se desea
}

const AIDetailsModal: React.FC<AIDetailsModalProps> = ({ open, onClose, details }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* ¡CAMBIO CLAVE! Aumentar el ancho máximo y permitir desplazamiento */}
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Details</DialogTitle>
          <DialogDescription>
            {details?.type === 'user' && `Insights for user: ${details.name}`}
            {details?.type === 'log' && `Details for log entry at: ${details.timestamp}`}
            {details?.type === 'recommendation' && `Recommendation: ${details.action}`}
            {!details && 'No details available.'}
          </DialogDescription>
        </DialogHeader>
        {/* ¡CAMBIO CLAVE! Añadir break-all para que el texto largo se rompa y overflow-auto */}
        <div className="space-y-2 text-sm text-gray-700 break-all overflow-auto max-h-[calc(80vh-150px)]">
          {details &&
            Object.entries(details).map(([key, value]) => (
              <div key={key}>
                <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}:</strong>{' '}
                {/* Usar JSON.stringify para objetos complejos, pero con pre-wrap para formato */}
                <span className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</span>
              </div>
            ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIDetailsModal;
