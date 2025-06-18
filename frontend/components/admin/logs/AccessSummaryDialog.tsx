import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AccessSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccessSummaryDialog({
  open,
  onOpenChange,
}: AccessSummaryDialogProps) {
  // Mock data - replace with actual data from your API
  const summaryData = [
    {
      user: 'John Doe',
      email: 'john@example.com',
      totalAccesses: 42,
      successful: 40,
      failed: 2,
      successRate: 95.2,
      firstAccess: '2023-06-01T08:30:00',
      lastAccess: '2023-07-15T17:45:00'
    },
    {
      user: 'Jane Smith',
      email: 'jane@example.com',
      totalAccesses: 28,
      successful: 26,
      failed: 2,
      successRate: 92.9,
      firstAccess: '2023-06-05T09:15:00',
      lastAccess: '2023-07-14T16:30:00'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-y-scroll max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Access Summary</DialogTitle>
          <DialogDescription>
            Comprehensive overview of user access patterns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-teal-600">{summaryData.length}</div>
              <p className="text-sm text-gray-600">Active Users</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {summaryData.reduce((sum, user) => sum + user.successful, 0)}
              </div>
              <p className="text-sm text-gray-600">Successful</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                {summaryData.reduce((sum, user) => sum + user.failed, 0)}
              </div>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(summaryData.reduce((sum, user) => sum + user.successRate, 0) / summaryData.length).toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Average Success Rate</p>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Accesses</TableHead>
                  <TableHead>Success/Failed</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>First Access</TableHead>
                  <TableHead>Last Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map(user => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.user}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.totalAccesses}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge className="bg-green-100 text-green-800">{user.successful} ✓</Badge>
                        <Badge variant="destructive">{user.failed} ✗</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.successRate >= 95 ? 'default' :
                          user.successRate >= 80 ? 'secondary' :
                          'destructive'
                        }
                        className={
                          user.successRate >= 95 ? 'bg-green-100 text-green-800' :
                          user.successRate >= 80 ? 'bg-yellow-100 text-yellow-800' : ''
                        }
                      >
                        {user.successRate}%
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.firstAccess).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(user.lastAccess).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
