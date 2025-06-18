import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileSpreadsheet, Download, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BulkUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const handleUpload = () => {
    if (!file) return;

    setStatus('uploading');
    setMessage('Processing file...');

    // Simulate upload
    setTimeout(() => {
      setStatus('success');
      setMessage(`Successfully uploaded ${file.name}`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 2000);
  };

  const downloadTemplate = () => {
    const csvContent = "Full Name,Email Address,User Role,Job Title,Access Zones,Photo URL\n";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_upload_template.csv';
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk User Upload</DialogTitle>
          <DialogDescription>
            Upload a CSV file with user data for bulk registration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {status === 'uploading' ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
              <p className="text-gray-600">{message}</p>
            </div>
          ) : status === 'success' ? (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-700">
                {message}
              </AlertDescription>
            </Alert>
          ) : status === 'error' ? (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-700">
                {message}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">
                    {file
                      ? `Selected file: ${file.name}`
                      : 'Drag and drop a CSV file here or click below'}
                  </p>
                  <Button
                    variant="outline"
                    className="bg-slate-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {file ? 'Change File' : 'Select File'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="bg-slate-50"
              onClick={downloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <p className="text-xs text-gray-500">
              Download a template CSV file with the required format.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setFile(null);
              setStatus('idle');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || status === 'uploading'}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {status === 'uploading' ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
