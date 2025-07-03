import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React, { useState } from 'react';
import CamerasTab from './cameras/CamerasTab';
import ZonesTab from './zones/ZonesTab';

const SettingsTab: React.FC = () => {
  const [activeSettingsTab, setActiveSettingsTab] = useState('zones');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
        <p className="text-indigo-200">System configuration and management</p>
      </div>

      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="zones" value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="zones">Zone Management</TabsTrigger>
              <TabsTrigger value="cameras">Camera Management</TabsTrigger>
            </TabsList>
            <ZonesTab />
            <CamerasTab />
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
