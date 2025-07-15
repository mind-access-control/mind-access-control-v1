'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { csvTemplateContent } from '@/mock-data';
import { AlertCircle, Check, Download, FileSpreadsheet, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import UsersForm from './UsersForm';
import UsersTable from './UsersTable';
import { EMPTY_STRING } from '@/lib/constants';
import { UploadStatus } from '@/app/enums';

const UsersTab: React.FC = () => {
  const [csvIsDragging, setCsvIsDragging] = useState(false);

  // Estados para la carga masiva CSV (faltantes)
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.IDLE);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  //Refs
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const processBulkUpload = async () => {
    if (!selectedCsvFile) {
      setUploadMessage('Please select a CSV file first.');
      setUploadStatus(UploadStatus.ERROR);
      return;
    }

    setUploadStatus(UploadStatus.PROCESSING);
    setUploadMessage('Processing CSV file...');

    try {
      // Implement your CSV parsing and Supabase insertion logic here
      // This is a placeholder. You'll need a library like 'papaparse'
      // and potentially a Supabase Edge Function for bulk insertion.
      console.log('Processing bulk upload for file:', selectedCsvFile.name);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate async work

      setUploadStatus(UploadStatus.SUCCESS);
      setUploadMessage(`Successfully processed ${selectedCsvFile.name}! Users will be added shortly.`);
      setSelectedCsvFile(null); // Clear selected file after processing
    } catch (error: any) {
      console.error('Error processing bulk upload:', error);
      setUploadStatus(UploadStatus.ERROR);
      setUploadMessage(`Failed to process CSV: ${error.message}`);
    }
  };

  const handleCsvDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setCsvIsDragging(true);
  };

  const handleCsvDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setCsvIsDragging(false);
  };

  const handleCsvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setCsvIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv') {
        setSelectedCsvFile(file);
        setUploadStatus(UploadStatus.IDLE);
        setUploadMessage(null);
      } else {
        setUploadMessage('Please drop a CSV file.');
        setUploadStatus(UploadStatus.ERROR);
      }
    }
  };

  const clearCsvFile = () => {
    setSelectedCsvFile(null);
    setUploadStatus(UploadStatus.IDLE);
    setUploadMessage(null);
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = EMPTY_STRING;
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedCsvFile(file);
      setUploadStatus(UploadStatus.IDLE);
      setUploadMessage(null);
    }
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([csvTemplateContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      // Feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'user_onboarding_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">User Management</h2>
      </div>
      <UsersForm />
      <UsersTable />
      {/* Enhanced Bulk Onboarding Section */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle>Bulk Onboarding</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Upload a CSV file containing user data for bulk registration. The CSV must include columns for Full Name, Email Address, User Role, Job Title,
            Access Zones (comma-separated), and a 'Photo URL' where each user's facial recognition image is publicly accessible.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="bg-slate-50" onClick={() => setBulkUploadModalOpen(true)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Bulk User Upload
            </Button>
            <Button variant="outline" className="bg-slate-50" onClick={downloadCsvTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Upload Modal */}
      <Dialog open={bulkUploadModalOpen} onOpenChange={setBulkUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk User Upload</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing user data for bulk registration. The CSV must include columns for Full Name, Email Address, User Role, Job Title,
              Access Zones (comma-separated), and a 'Photo URL'.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {uploadStatus === UploadStatus.IDLE ? (
              <div
                className={`border-2 ${csvIsDragging ? 'border-teal-500 bg-teal-50' : 'border-dashed border-gray-300'} rounded-lg p-6 transition-colors`}
                onDragOver={handleCsvDragOver}
                onDragLeave={handleCsvDragLeave}
                onDrop={handleCsvDrop}
              >
                <div className="text-center">
                  <FileSpreadsheet className={`mx-auto h-12 w-12 ${csvIsDragging ? 'text-teal-500' : 'text-gray-400'}`} />
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">Drag and drop a CSV file here, or click to select a file</p>
                    <Button type="button" variant="outline" className="bg-slate-50" onClick={() => csvFileInputRef.current?.click()}>
                      Choose CSV File
                    </Button>
                    <input ref={csvFileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                  </div>
                </div>
              </div>
            ) : uploadStatus === 'processing' ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                <p className="text-gray-600">{uploadMessage}</p>
              </div>
            ) : uploadStatus === UploadStatus.SUCCESS ? (
              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Success</AlertTitle>
                <AlertDescription className="text-green-700">{uploadMessage}</AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Error</AlertTitle>
                <AlertDescription className="text-red-700">{uploadMessage}</AlertDescription>
              </Alert>
            )}

            {selectedCsvFile && uploadStatus === UploadStatus.IDLE && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                <FileSpreadsheet className="h-5 w-5 text-teal-600" />
                <span className="text-sm font-medium truncate">{selectedCsvFile.name}</span>
                <Button variant="ghost" size="sm" onClick={clearCsvFile} className="ml-auto h-6 w-6 p-0 hover:bg-red-100">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button variant="outline" className="bg-slate-50" onClick={downloadCsvTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template CSV
              </Button>
              <p className="text-xs text-gray-500">Download a template CSV file with the required headers for bulk upload.</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBulkUploadModalOpen(false);
                setSelectedCsvFile(null);
                setUploadStatus(UploadStatus.IDLE);
              }}
              disabled={uploadStatus === UploadStatus.PROCESSING}
            >
              Cancel
            </Button>
            <Button
              onClick={processBulkUpload}
              className="bg-teal-600 hover:bg-teal-700"
              disabled={!selectedCsvFile || uploadStatus === UploadStatus.PROCESSING}
            >
              Process Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersTab;
