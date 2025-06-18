import { useState } from "react";
import { Button } from "@/components/ui/button";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "User Management" },
  { id: "logs", label: "Access Logs" },
  { id: "settings", label: "Settings" },
];

export default function AdminTabs() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="mb-8">
      <nav className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-teal-600 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
