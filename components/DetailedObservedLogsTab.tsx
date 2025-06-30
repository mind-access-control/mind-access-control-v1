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
} from "lucide-react";

interface ItemWithNameAndId {
  id: string;
  name: string;
}

interface ObservedLog {
  id: string;
  timestamp: string;
  observedUserId: string;
  faceImageUrl: string | null;
  zone: ItemWithNameAndId;
  status: ItemWithNameAndId;
  aiAction: string | null;
}

type ObservedLogSortField = "timestamp" | "observedUserId" | "zone" | "status";
type SortDirection = "asc" | "desc";

const DetailedObservedLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<ObservedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<ObservedLogSortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [totalLogsCount, setTotalLogsCount] = useState(0);

  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedImageAlt, setSelectedImageAlt] = useState<string>("");

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
    setLoading(true);
    setError(null);
    try {
      const edgeFunctionUrl =
        "https://bfkhgzjlpjatpzadvjbd.supabase.co/functions/v1/get-observed-user-logs";

      const url = new URL(edgeFunctionUrl);
      url.searchParams.append("searchTerm", searchTerm);
      url.searchParams.append("page", currentPage.toString());
      url.searchParams.append("pageSize", itemsPerPage.toString());
      url.searchParams.append("sortField", "timestamp");
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

      const isUUID =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          searchTerm
        );
      if (searchTerm && !isUUID) {
        processedLogs = processedLogs.filter((log) =>
          log.zone.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (sortField === "zone") {
        processedLogs.sort((a, b) => {
          const nameA = a.zone.name.toLowerCase();
          const nameB = b.zone.name.toLowerCase();
          if (nameA < nameB) return sortDirection === "asc" ? -1 : 1;
          if (nameA > nameB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        });
      } else if (sortField === "status") {
        processedLogs.sort((a, b) => {
          const statusA = a.status.name.toLowerCase();
          const statusB = b.status.name.toLowerCase();
          if (statusA < statusB) return sortDirection === "asc" ? -1 : 1;
          if (statusA > statusB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        });
      }

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
    sortField,
    sortDirection,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    fetchObservedLogs();
  }, [fetchObservedLogs]);

  // NUEVO useEffect para ajustar la página actual
  useEffect(() => {
    const newTotalPages = Math.ceil(totalLogsCount / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    } else if (currentPage > newTotalPages && newTotalPages === 0) {
      setCurrentPage(1); // Si no hay logs, vuelve a la página 1
    }
  }, [totalLogsCount, itemsPerPage, currentPage]); // Dependencias: cuando cambian el total o los items por página

  const handleRefresh = useCallback(() => {
    setSearchTerm("");
    setCurrentPage(1);
    setSortField("timestamp");
    setSortDirection("desc");
    setStartDate(null);
    setEndDate(null);
  }, []);

  const handleSortChange = useCallback(
    (field: ObservedLogSortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
      setCurrentPage(1); // Resetear a la página 1 al cambiar el ordenamiento
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
      return sortDirection === "asc" ? (
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
                setCurrentPage(1); // Resetear a la página 1 al cambiar el término de búsqueda
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
              value={startDate || ""}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1); // Resetear a la página 1 al cambiar la fecha
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
              value={endDate || ""}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1); // Resetear a la página 1 al cambiar la fecha
              }}
              title="End Date"
            />
          </div>
          <Button
            onClick={handleRefresh}
            className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition duration-200 shadow-md"
            title="Refresh logs data"
          >
            <RefreshCcw className="w-5 h-5" />
          </Button>
        </div>

        {loading && (
          <div className="text-gray-700 text-center py-4">Loading logs...</div>
        )}
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg text-center">
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table className="min-w-full divide-y divide-gray-200">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange("timestamp")}
                  >
                    Timestamp {getSortIcon("timestamp")}
                  </TableHead>
                  <TableHead
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange("observedUserId")}
                  >
                    Observed User ID {getSortIcon("observedUserId")}
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photo
                  </TableHead>
                  <TableHead
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange("zone")}
                  >
                    Zone {getSortIcon("zone")}
                  </TableHead>
                  <TableHead
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange("status")}
                  >
                    Status {getSortIcon("status")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white divide-y divide-gray-200">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                        title={log.observedUserId}
                      >
                        {log.observedUserId}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() =>
                            handleImageClick(
                              log.faceImageUrl,
                              log.observedUserId
                            )
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
                                e.currentTarget.src = "";
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
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700"
                        >
                          {log.zone.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                              : ""
                          }
                        >
                          {log.status.name.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500"
                    >
                      No observed user logs found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <span className="text-sm text-gray-700">
            Showing {logs.length} of {totalLogsCount} logs
          </span>
          <div className="flex items-center space-x-2">
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1); // Resetear a la página 1 al cambiar items por página
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
