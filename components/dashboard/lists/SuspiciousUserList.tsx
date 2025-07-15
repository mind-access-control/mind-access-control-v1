'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, UserCircle2 } from 'lucide-react';
import { SuspiciousUser } from '@/lib/api/types';

interface SuspiciousUserListProps {
  users: SuspiciousUser[];
  onDetails: (user: any) => void;
}

const SuspiciousUserList: React.FC<SuspiciousUserListProps> = ({ users, onDetails }) => {
  return (
    <Card className="bg-white rounded-xl shadow-lg p-4">
      <div className="font-semibold text-lg mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500" /> Suspicious Activities Detected
      </div>
      {users.length > 0 ? (
        <ul className="space-y-3">
          {users.map((user) => {
            // Determinar la inicial para el placeholder
            const initial = user.name ? user.name.charAt(0).toUpperCase() : user.id.charAt(0).toUpperCase();
            // Verificar si photoUrl es una cadena no vacía
            const hasValidPhotoUrl = typeof user.photoUrl === 'string' && user.photoUrl.length > 0;

            return (
              <li key={user.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center">
                  {hasValidPhotoUrl ? ( // ¡CAMBIO CLAVE! Usar hasValidPhotoUrl
                    <img
                      src={user.photoUrl!} // Usar ! para asegurar a TypeScript que es string
                      alt={user.name || user.id}
                      className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-red-300"
                      // Fallback para imagen rota o no disponible
                      onError={(e) => {
                        e.currentTarget.onerror = null; // Evitar bucle infinito
                        e.currentTarget.src = `https://placehold.co/40x40/FFDDDD/FF0000?text=${initial}`; // Placeholder con inicial
                      }}
                    />
                  ) : (
                    // Este es el fallback para cuando no hay URL de foto o es vacía
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-red-100 text-red-600 border-2 border-red-300 font-bold text-lg">
                      {initial} {/* Mostrar la inicial directamente */}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-red-800">{user.name}</div>
                    <div className="text-sm text-red-600">{user.reason}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onDetails({ ...user, type: 'user' })}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-4">No suspicious activities at this time.</p>
      )}
    </Card>
  );
};

export default SuspiciousUserList;
