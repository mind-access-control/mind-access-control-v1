import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Eye, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuspiciousUser {
  id: number;
  name: string;
  photoUrl?: string;
  timestamp: string;
  reason: string;
  suggestion: string;
  confidence: number;
}

interface SuspiciousUserListProps {
  users: SuspiciousUser[];
  onDetails: (user: SuspiciousUser) => void;
  onImageError?: (userId: number, photoUrl: string) => void;
}

export default function SuspiciousUserList({ 
  users, 
  onDetails, 
  onImageError 
}: SuspiciousUserListProps) {
  const handleImageError = (userId: number, photoUrl: string) => {
    onImageError?.(userId, photoUrl);
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Suspicious Activity Detected
          {users.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {users.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.length > 0 ? (
            users.slice(0, 5).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {user.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={() => handleImageError(user.id, user.photoUrl!)}
                      />
                    ) : (
                      <UserCircle2 className="w-10 h-10 text-gray-400" />
                    )}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">
                        {user.confidence}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-600">{user.timestamp}</div>
                    <div className="text-xs text-red-600 mt-1">{user.reason}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDetails(user)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No suspicious activity detected</p>
              <p className="text-sm">System is monitoring for unusual patterns</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 