import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ZoneManagement from "./ZoneManagement";
import CameraManagement from "./CameraManagement";

export default function Settings() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">System Settings</h2>
        <p className="text-indigo-200">
          Configure access zones, cameras, and system preferences
        </p>
      </div>

      <Tabs defaultValue="zones" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="zones">Zone Management</TabsTrigger>
          <TabsTrigger value="cameras">Camera Management</TabsTrigger>
        </TabsList>

        <TabsContent value="zones">
          <ZoneManagement />
        </TabsContent>

        <TabsContent value="cameras">
          <CameraManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
