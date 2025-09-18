import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Menu, 
  Calendar, 
  Palette, 
  Clock, 
  Truck
} from "lucide-react";

// Individual tab components (will implement these in subsequent tasks)
function GPSLocatorTab() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">GPS Locator</h2>
      <p className="text-muted-foreground">GPS location and tracking settings will be implemented here.</p>
    </div>
  );
}

function MenuManagementTab() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Menu Management</h2>
      <p className="text-muted-foreground">Menu items and inventory management will be implemented here.</p>
    </div>
  );
}

function EventsAdsTab() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Events & Advertisements</h2>
      <p className="text-muted-foreground">Local events and promotional ads management will be implemented here.</p>
    </div>
  );
}

function ThemeEditorTab() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Theme Editor</h2>
      <p className="text-muted-foreground">Color themes and visual customization will be implemented here.</p>
    </div>
  );
}

function HoursLocationTab() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Hours & Location</h2>
      <p className="text-muted-foreground">Operating hours and location settings will be implemented here.</p>
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState("gps");

  // Mobile warning for smaller screens
  const MobileWarning = () => (
    <div className="lg:hidden min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Truck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Admin Panel</h2>
          <p className="text-muted-foreground mb-4">
            The admin panel is designed for desktop use. Please access this page on a larger screen for the full experience.
          </p>
          <Button asChild className="w-full">
            <Link href="/" data-testid="link-return-home-mobile">Return to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <MobileWarning />
      <div 
        className="hidden lg:block min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800"
        data-testid="admin-desktop-container"
      >
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Truck className="w-8 h-8 text-orange-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Concessions Connection
                  </h1>
                  <p className="text-sm text-muted-foreground">Admin Dashboard</p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/" data-testid="link-return-home">Return to Site</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Manila Folder Tabs Interface */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Manila Folder-Style Tab List */}
            <div className="relative mb-6">
              <TabsList className="manila-tabs bg-transparent h-auto p-0 space-x-2">
                <TabsTrigger 
                  value="gps" 
                  className="manila-tab"
                  data-testid="tab-gps"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  GPS Locator
                </TabsTrigger>
                <TabsTrigger 
                  value="menu" 
                  className="manila-tab"
                  data-testid="tab-menu"
                >
                  <Menu className="w-4 h-4 mr-2" />
                  Menu Management
                </TabsTrigger>
                <TabsTrigger 
                  value="events" 
                  className="manila-tab"
                  data-testid="tab-events"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Events & Ads
                </TabsTrigger>
                <TabsTrigger 
                  value="theme" 
                  className="manila-tab"
                  data-testid="tab-theme"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Theme Editor
                </TabsTrigger>
                <TabsTrigger 
                  value="hours" 
                  className="manila-tab"
                  data-testid="tab-hours"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Hours & Location
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content Area */}
            <Card className="manila-content bg-amber-50 dark:bg-gray-800 border-2 border-amber-200 dark:border-gray-700">
              <TabsContent value="gps" className="m-0">
                <GPSLocatorTab />
              </TabsContent>
              <TabsContent value="menu" className="m-0">
                <MenuManagementTab />
              </TabsContent>
              <TabsContent value="events" className="m-0">
                <EventsAdsTab />
              </TabsContent>
              <TabsContent value="theme" className="m-0">
                <ThemeEditorTab />
              </TabsContent>
              <TabsContent value="hours" className="m-0">
                <HoursLocationTab />
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </>
  );
}