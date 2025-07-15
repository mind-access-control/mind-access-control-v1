"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RefreshCcw,
  ChevronUp,
  ChevronDown,
  UserCircle2,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { ObservedLog, ObservedLogSortField } from "@/lib/api/types";
import { SortDirection } from "@/app/enums";
import { EDGE_FUNCTIONS, EMPTY_STRING } from "@/lib/constants";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const DetailedObservedLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<ObservedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(EMPTY_STRING);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<ObservedLogSortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.DESC);
  const [totalLogsCount, setTotalLogsCount] = useState(0);

  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedImageAlt, setSelectedImageAlt] = useState<string>(EMPTY_STRING);

  const handleImageClick = (imageUrl: string | null, userId: string) => {
    if (imageUrl) {
      setSelectedImageSrc(imageUrl);
      setSelectedImageAlt(`Face of Observed User ${userId}`);
      setShowImageModal(true);
    } else {
      setSelectedImageSrc(null);
      setSelectedImageAlt("No image available for Observed User");
      setShowImageModal(true);
    }
  };

  const fetchObservedLogs = useCallback(async () => {
    // No set loading to true here to avoid table jump on sort,
    // only the refresh button will show loading state.
    setError(null);
    try {
      const edgeFunctionUrl = `${SUPABASE_URL}${EDGE_FUNCTIONS.GET_OBSERVED_USER_LOGS}`;

      const url = new URL(edgeFunctionUrl);
      url.searchParams.append("searchTerm", searchTerm);
      url.searchParams.append("page", currentPage.toString());
      url.searchParams.append("pageSize", itemsPerPage.toString());
      url.searchParams.append("sortField", sortField); // Use the state's sortField
      url.searchParams.append("sortDirection", sortDirection);

      if (startDate) {
        url.searchParams.append("startDate", startDate);
      }
      if (endDate) {
        url.searchParams.append("endDate", endDate);
      }

      console.log(
        "Frontend: Attempting to fetch logs from URL:",
        url.toString()
      );

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData: { error?: string; message?: string } =
          await response.json();
        throw new Error(
          errorData.error ||
            errorData.message ||
            `HTTP Error: ${response.status}`
        );
      }

      const result: { logs: ObservedLog[]; totalCount: number } =
        await response.json();

      let processedLogs = result.logs;

      // Frontend sorting logic is restored here
      processedLogs.sort((a, b) => {
        let comparison = 0;
        if (sortField === "timestamp") {
          comparison =
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        } else if (sortField === "observedUserId") {
          comparison = a.observedUserId.localeCompare(b.observedUserId);
        } else if (sortField === "zone") {
          comparison = a.zone.name.localeCompare(b.zone.name);
        } else if (sortField === "status") {
          comparison = a.status.name.localeCompare(b.status.name);
        } else if (sortField === "isRegistered") {
          // Sort by boolean: false before true for 'asc'
          // or true before false for 'desc' (unregistered first)
          if (a.isRegistered && !b.isRegistered) comparison = 1;
          if (!a.isRegistered && b.isRegistered) comparison = -1;
        }

        return sortDirection === SortDirection.ASC ? comparison : -comparison;
      });

      setLogs(processedLogs);
      setTotalLogsCount(result.totalCount);
    } catch (err: unknown) {
      let errorMessage = "An unknown error occurred while fetching logs.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      console.error("Error fetching observed user logs:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    currentPage,
    itemsPerPage,
    sortField, // Now correctly used in URL params AND for frontend sorting
    sortDirection, // Now correctly used in URL params AND for frontend sorting
    startDate,
    endDate,
    refreshTrigger,
  ]);

  useEffect(() => {
    setLoading(true); // Initial load or explicit refresh
    fetchObservedLogs();
  }, [fetchObservedLogs]);

  useEffect(() => {
    const newTotalPages = Math.ceil(totalLogsCount / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    } else if (currentPage > newTotalPages && newTotalPages === 0) {
      setCurrentPage(1);
    }
  }, [totalLogsCount, itemsPerPage, currentPage]);

  const handleRefresh = useCallback(() => {
    setSearchTerm(EMPTY_STRING);
    setCurrentPage(1);
    setSortField("timestamp");
    setSortDirection(SortDirection.DESC);
    setStartDate(null);
    setEndDate(null);
    setRefreshTrigger((prev) => prev + 1);
    setLoading(true); // Explicitly set loading to true for refresh button
  }, []);

  const handleSortChange = useCallback(
    (field: ObservedLogSortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC);
      } else {
        setSortField(field);
        setSortDirection(SortDirection.ASC);
      }
      setCurrentPage(1);
      // Removed setLoading(true) here to prevent "Loading logs..." on sort
    },
    [sortField, sortDirection]
  );

  const onPageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const totalPages = useMemo(() => {
    return Math.ceil(totalLogsCount / itemsPerPage);
  }, [totalLogsCount, itemsPerPage]);

  const getSortIcon = (field: ObservedLogSortField) => {
    if (sortField === field) {
      return sortDirection === SortDirection.ASC ? (
        <ChevronUp className="w-4 h-4 inline ml-1" />
      ) : (
        <ChevronDown className="w-4 h-4 inline ml-1" />
      );
    }
    return null;
  };

  const getStatusBadgeVariant = (statusName: string) => {
    switch (statusName.toLowerCase()) {
      case "granted":
      case "successful":
      case "success":
        return "default";
      case "denied":
      case "failed":
      case "failure":
        return "destructive";
      case "pending":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Detailed Observed User Logs
        </h2>
        <p className="text-indigo-200">
          Review access attempts and activities of observed (unregistered)
          users.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div className="relative flex items-center w-full max-w-sm flex-grow">
            <Search className="absolute left-3 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search logs by ID or zone..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="startDate" className="sr-only">
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              className="py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
              value={startDate || EMPTY_STRING}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              title="Start Date"
            />
            <Label htmlFor="endDate" className="sr-only">
              End Date
            </Label>
            <Input
              id="endDate"
              type="date"
              className="py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
              value={endDate || EMPTY_STRING}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              title="End Date"
            />
          </div>
          <Button
            onClick={handleRefresh}
            className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition duration-200 shadow-md"
            title="Refresh logs data"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCcw className="w-5 h-5" />
            )}
          </Button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg text-center mb-4">
            Error: {error}
          </div>
        )}

        <div className="overflow-y-auto rounded-lg border border-gray-200 max-h-[60vh] relative">
          <Table className="min-w-full divide-y divide-gray-200 table-fixed">
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead
                  className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("timestamp")}
                >
                  <div className="flex items-center gap-1">
                    Timestamp {getSortIcon("timestamp")}
                  </div>
                </TableHead>
                <TableHead
                  className="w-[25%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("observedUserId")}
                >
                  <div className="flex items-center gap-1">
                    Observed User ID {getSortIcon("observedUserId")}
                  </div>
                </TableHead>
                <TableHead className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photo
                </TableHead>
                <TableHead
                  className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("zone")}
                >
                  <div className="flex items-center gap-1">
                    Zone {getSortIcon("zone")}
                  </div>
                </TableHead>
                <TableHead
                  className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("isRegistered")}
                >
                  <div className="flex items-center gap-1">
                    Registered {getSortIcon("isRegistered")}
                  </div>
                </TableHead>
                <TableHead
                  className="w-[19%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("status")}
                >
                  <div className="flex items-center gap-1">
                    Status {getSortIcon("status")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {/* Conditionally render loading message inside table if loading, otherwise render logs */}
              {loading && !error ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-gray-500"
                  >
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    <TableCell className="w-[18%] px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell
                      className="w-[25%] px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                      title={log.observedUserId}
                    >
                      <span className="truncate">{log.observedUserId}</span>
                    </TableCell>
                    <TableCell className="w-[10%] px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() =>
                          handleImageClick(log.faceImageUrl, log.observedUserId)
                        }
                        className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition duration-200"
                        title="View Face Image"
                      >
                        {log.faceImageUrl ? (
                          <img
                            src={log.faceImageUrl}
                            alt={`Face of ${log.observedUserId}`}
                            className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = EMPTY_STRING;
                              e.currentTarget.style.display = "none";
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                const icon = document.createElement("div");
                                icon.className =
                                  "w-6 h-6 flex items-center justify-center";
                                icon.innerHTML =
                                  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-circle-2"><path d="M18 20a6 6 0 0 0-12 0"/><circle cx="12" cy="10" r="4"/><path d="M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Z"/></svg>';
                                parent.appendChild(icon);
                              }
                            }}
                          />
                        ) : (
                          <UserCircle2 className="w-6 h-6" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="w-[18%] px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        {log.zone.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[10%] px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.isRegistered ? (
                        <Badge
                          variant="default"
                          className="bg-green-500 text-white px-2 py-1 rounded-full text-xs"
                        >
                          Registered
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs"
                        >
                          Unregistered
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="w-[19%] px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Badge
                        variant={getStatusBadgeVariant(log.status.name)}
                        className={
                          log.status.name.toLowerCase() === "granted" ||
                          log.status.name.toLowerCase() === "successful" ||
                          log.status.name.toLowerCase() === "success"
                            ? "bg-green-100 text-green-800"
                            : log.status.name.toLowerCase() === "denied" ||
                              log.status.name.toLowerCase() === "failed" ||
                              log.status.name.toLowerCase() === "failure"
                            ? "bg-red-100 text-red-800"
                            : log.status.name.toLowerCase() === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : EMPTY_STRING
                        }
                      >
                        {log.status.name.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // Only show "No logs found" if not loading and no error
                !loading &&
                !error && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      No observed user logs found matching your criteria.
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <span className="text-sm text-gray-700">
            Showing {logs.length} of {totalLogsCount} logs
          </span>
          <div className="flex items-center space-x-2">
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="Items" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </Button>
            <span className="text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative bg-white rounded-lg shadow-xl p-6 max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                Observed User Face
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="flex justify-center items-center py-4">
              {selectedImageSrc ? (
                <img
                  src={selectedImageSrc}
                  alt={selectedImageAlt}
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400">
                  <UserCircle2 className="w-24 h-24" />
                </div>
              )}
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              {selectedImageAlt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedObservedLogsTab;
