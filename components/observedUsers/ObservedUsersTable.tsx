import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, UserCircle2, ChevronUp, ChevronDown, Search, RefreshCcw } from 'lucide-react';

// IMPORTAR LAS INTERFACES DESDE EL ARCHIVO COMPARTIDO
import { ObservedUser, ItemWithNameAndId, ObservedUserSortField, SortDirection } from '@/types/common';

// IMPORTAR EL NUEVO COMPONENTE DE MODAL
import RegisterUserModal from './RegisterUserModal';

// Define the props this component will receive
interface ObservedUsersTableProps {
  observedUsers: ObservedUser[];
  sortField: ObservedUserSortField;
  sortDirection: SortDirection;
  onSortChange: (field: ObservedUserSortField) => void;
  // onRegister: (user: ObservedUser) => void; // Esta prop ya no es necesaria, la modal la manejará
  onExtend: (user: ObservedUser) => void;
  onBlock: (user: ObservedUser) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
  totalObservedUsersCount: number;
  onRefresh: () => void;
}

const ObservedUsersTable: React.FC<ObservedUsersTableProps> = ({
  observedUsers,
  sortField,
  sortDirection,
  onSortChange,
  // onRegister, // Eliminar de las props desestructuradas
  onExtend,
  onBlock,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalObservedUsersCount,
  onRefresh,
}) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedImageAlt, setSelectedImageAlt] = useState<string>('');

  // NUEVOS ESTADOS PARA LA MODAL DE REGISTRO
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [userToRegister, setUserToRegister] = useState<ObservedUser | null>(null);

  // Define table columns
  const columns = [
    { key: 'photoUrl', label: 'Face', sortable: false },
    { key: 'id', label: 'Temporary ID', sortable: true },
    { key: 'firstSeen', label: 'First Seen', sortable: true },
    { key: 'lastSeen', label: 'Last Seen', sortable: true },
    { key: 'tempAccesses', label: 'Temp Accesses', sortable: true },
    { key: 'accessedZones', label: 'Accessed Zones', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'aiAction', label: 'AI Suggested Action', sortable: true },
    { key: 'actions', label: 'Admin Actions', sortable: false },
  ];

  // Function to handle image load errors
  const handleImageError = (userId: string, photoUrl: string | null) => {
    const cleanPhotoUrl = photoUrl ? photoUrl.split('?')[0] : 'no-image-url';
    setImageErrors((prev) => ({ ...prev, [cleanPhotoUrl]: true }));
    console.warn(`Failed to load image for user ${userId} at URL: ${photoUrl || 'N/A'}`);
  };

  // Función para abrir la modal de imagen
  const handleImageClick = (imageUrl: string, altText: string) => {
    setSelectedImageSrc(imageUrl);
    setSelectedImageAlt(altText);
    setShowImageModal(true);
  };

  // NUEVA FUNCIÓN para manejar el clic en el botón Register
  const handleRegisterClick = (user: ObservedUser) => {
    setUserToRegister(user); // Guarda el usuario a registrar en el estado
    setIsRegisterModalOpen(true); // Abre la modal
  };

  // Callback cuando un usuario se ha registrado desde la modal
  const handleUserRegistered = () => {
    onRefresh(); // Refresca la lista de usuarios observados para que el recién registrado desaparezca o se actualice
    // Puedes añadir un mensaje de éxito aquí si lo deseas
  };

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalObservedUsersCount);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-lg flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-500" /> Observed Users Requiring Action
          <Button variant="ghost" size="sm" onClick={onRefresh} className="ml-2 p-1 rounded-full text-gray-500 hover:bg-gray-100" title="Refresh List">
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-400" />
          <Input placeholder="Search observed users..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="w-64" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-full text-sm">
          <thead>
            <TableRow className="text-gray-500 border-b">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`py-2 px-2 text-left ${col.sortable ? 'cursor-pointer select-none' : ''}`}
                  onClick={() => {
                    if (col.sortable) {
                      onSortChange(col.key as ObservedUserSortField);
                    }
                  }}
                >
                  <span className="flex items-center">
                    {col.label}
                    {col.sortable && sortField === col.key && (
                      <span className="ml-1">{sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</span>
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </thead>
          <tbody>
            {observedUsers.map((u: ObservedUser) => {
              const imageUrlWithCacheBuster = u.faceImage ? `${u.faceImage}?t=${new Date(u.lastSeen).getTime()}` : null;

              const imageErrorKey = u.faceImage ? u.faceImage.split('?')[0] : 'no-image-url';

              return (
                <TableRow key={u.id} className="border-b hover:bg-blue-50 transition">
                  <TableCell className="py-2 px-2">
                    {imageUrlWithCacheBuster && !imageErrors[imageErrorKey] ? (
                      <div className="relative w-8 h-8 cursor-pointer" onClick={() => handleImageClick(imageUrlWithCacheBuster, `Face of ${u.id}`)}>
                        <img
                          src={imageUrlWithCacheBuster}
                          alt={u.id}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={() => handleImageError(u.id, u.faceImage)}
                        />
                      </div>
                    ) : (
                      <UserCircle2 className="w-8 h-8 text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-2 font-mono">{u.id}</TableCell>
                  <TableCell className="py-2 px-2">{new Date(u.firstSeen).toLocaleString()}</TableCell>
                  <TableCell className="py-2 px-2">{new Date(u.lastSeen).toLocaleString()}</TableCell>
                  <TableCell className="py-2 px-2 text-center">{u.tempAccesses}</TableCell>
                  <TableCell className="py-2 px-2">
                    <div className="flex flex-wrap gap-1">
                      {u.accessedZones.map((zone) => (
                        <Badge key={zone.id} variant="outline" className="bg-blue-50 text-blue-700">
                          {zone.name}
                        </Badge>
                      ))}
                      {u.accessedZones.length === 0 && <span className="text-gray-400 text-xs">N/A</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <Badge
                      className={
                        u.status.name === 'active_temporal'
                          ? 'bg-yellow-100 text-yellow-800'
                          : u.status.name === 'in_review_admin'
                          ? 'bg-red-100 text-red-800'
                          : u.status.name === 'expired'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {u.status.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 px-2 text-blue-700">{u.aiAction || 'No action'} </TableCell>
                  <TableCell className="py-2 px-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRegisterClick(u)} // LLAMAR A LA NUEVA FUNCIÓN
                      >
                        Register
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onExtend(u)}>
                        Extend
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onBlock(u)}>
                        Block
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {observedUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-gray-400 py-4">
                  No observed users found.
                </TableCell>
              </TableRow>
            )}
          </tbody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Items per page:</span>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Showing {startIndex} to {endIndex} of {totalObservedUsersCount} users
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
            Previous
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 p-0 ${currentPage === page ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </div>
      </div>

      {/* MODAL DE IMAGEN (CUSTOM CON TAILWIND) */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setShowImageModal(false)}>
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Observed User Face</h3>
              <button onClick={() => setShowImageModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="flex justify-center items-center py-4">
              {selectedImageSrc && <img src={selectedImageSrc} alt={selectedImageAlt} className="max-w-full h-auto rounded-lg shadow-md" />}
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">{selectedImageAlt}</p>
          </div>
        </div>
      )}

      {/* INTEGRAR LA NUEVA MODAL DE REGISTRO */}
      <RegisterUserModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        observedUser={userToRegister}
        onUserRegistered={handleUserRegistered}
      />
    </div>
  );
};

export default ObservedUsersTable;
