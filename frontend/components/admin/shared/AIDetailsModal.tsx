import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Lightbulb, Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIDetails {
  id: string;
  type: "user" | "log" | "recommendation";
  title: string;
  description: string;
  confidence: number;
  classification: string;
  timestamp: string;
  details: Record<string, any>;
  suggestions: string[];
  riskLevel: "low" | "moderate" | "high";
}

interface AIDetailsModalProps {
  open: boolean;
  onClose: () => void;
  details: AIDetails | null;
}

export default function AIDetailsModal({ open, onClose, details }: AIDetailsModalProps) {
  if (!details) return null;

  const getTypeIcon = (type: AIDetails["type"]) => {
    switch (type) {
      case "user":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "log":
        return <Shield className="w-5 h-5 text-blue-500" />;
      case "recommendation":
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getRiskColor = (risk: AIDetails["riskLevel"]) => {
    switch (risk) {
      case "low":
        return "text-green-600 bg-green-100";
      case "moderate":
        return "text-yellow-600 bg-yellow-100";
      case "high":
        return "text-red-600 bg-red-100";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon(details.type)}
            AI Analysis Details
          </DialogTitle>
          <DialogDescription>
            Detailed analysis of the AI-detected event or recommendation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <p className="text-sm text-gray-900">{details.title}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Risk Level</label>
              <Badge className={cn("mt-1", getRiskColor(details.riskLevel))}>
                {details.riskLevel.toUpperCase()}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Confidence</label>
              <p className="text-sm text-gray-900">{details.confidence}%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Timestamp</label>
              <p className="text-sm text-gray-900">{details.timestamp}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <p className="text-sm text-gray-900 mt-1">{details.description}</p>
          </div>

          {/* Classification */}
          <div>
            <label className="text-sm font-medium text-gray-700">AI Classification</label>
            <p className="text-sm text-gray-900 mt-1">{details.classification}</p>
          </div>

          {/* Additional Details */}
          {Object.keys(details.details).length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Additional Details</label>
              <div className="mt-2 space-y-2">
                {Object.entries(details.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-600">{key}:</span>
                    <span className="text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {details.suggestions.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                AI Suggestions
              </label>
              <ul className="mt-2 space-y-1">
                {details.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-gray-900 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onClose}>
            Take Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 