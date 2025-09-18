import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  MapPin, 
  Menu, 
  Calendar, 
  Palette, 
  Clock, 
  Truck,
  Loader2,
  Navigation,
  AlertTriangle
} from "lucide-react";

// GPS Locator Tab Implementation
function GPSLocatorTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({
    latitude: "",
    longitude: "",
    address: "",
    radius: "5.00"
  });

  // Fetch current truck location
  const { data: truckLocation, isLoading, error } = useQuery({
    queryKey: ['/api/admin/location'],
    queryFn: () => apiRequest('/api/admin/location'),
    select: (data) => data || null
  }) as { data: any, isLoading: boolean, error: any };

  // Update truck location mutation
  const updateLocationMutation = useMutation({
    mutationFn: (locationData: any) => {
      const token = localStorage.getItem('auth_token');
      return fetch('/api/admin/location', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(locationData)
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update location');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/location'] });
      toast({
        title: "Location Updated",
        description: "Truck location has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update truck location. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Get current GPS location using browser geolocation
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationForm(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6)
        }));
        setIsGettingLocation(false);
        toast({
          title: "Location Retrieved",
          description: "Current GPS coordinates have been loaded.",
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: "Error",
          description: "Unable to retrieve your current location. Please enter coordinates manually.",
          variant: "destructive",
        });
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Handle GPS toggle
  const handleGPSToggle = (enabled: boolean) => {
    const locationData = {
      ...truckLocation,
      gpsEnabled: enabled,
      latitude: enabled ? (locationForm.latitude ? parseFloat(locationForm.latitude) : null) : null,
      longitude: enabled ? (locationForm.longitude ? parseFloat(locationForm.longitude) : null) : null,
      address: locationForm.address || null,
      radius: locationForm.radius || "5.00"
    };
    updateLocationMutation.mutate(locationData);
  };

  // Handle location save
  const handleSaveLocation = () => {
    if (!locationForm.latitude || !locationForm.longitude) {
      toast({
        title: "Error",
        description: "Please provide both latitude and longitude coordinates.",
        variant: "destructive",
      });
      return;
    }

    const locationData = {
      gpsEnabled: truckLocation?.gpsEnabled ?? true,
      latitude: parseFloat(locationForm.latitude),
      longitude: parseFloat(locationForm.longitude),
      address: locationForm.address || null,
      radius: locationForm.radius || "5.00"
    };
    updateLocationMutation.mutate(locationData);
  };

  // Initialize form when data loads
  useEffect(() => {
    if (truckLocation) {
      setLocationForm({
        latitude: truckLocation.latitude?.toString() || "",
        longitude: truckLocation.longitude?.toString() || "",
        address: truckLocation.address || "",
        radius: truckLocation.radius?.toString() || "5.00"
      });
    }
  }, [truckLocation]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading location settings...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">GPS Locator</h2>
          <p className="text-muted-foreground">Manage truck location and GPS tracking settings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="gps-toggle" className="text-sm font-medium">
            GPS Tracking
          </Label>
          <Switch
            id="gps-toggle"
            checked={truckLocation?.gpsEnabled ?? false}
            onCheckedChange={handleGPSToggle}
            disabled={updateLocationMutation.isPending}
            data-testid="switch-gps-enabled"
          />
        </div>
      </div>

      <Separator />

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Current Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">GPS Status</Label>
              <div className="flex items-center space-x-2 mt-1">
                {truckLocation?.gpsEnabled ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-600">Enabled</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-sm font-medium text-red-600">Disabled</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Service Radius</Label>
              <p className="text-sm font-medium mt-1">{truckLocation?.radius || "5.00"} km</p>
            </div>
          </div>
          
          {truckLocation?.latitude && truckLocation?.longitude && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Coordinates</Label>
              <p className="text-sm font-mono mt-1">
                {truckLocation.latitude.toFixed(6)}, {truckLocation.longitude.toFixed(6)}
              </p>
            </div>
          )}
          
          {truckLocation?.address && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Address</Label>
              <p className="text-sm mt-1">{truckLocation.address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Navigation className="w-5 h-5" />
            <span>Update Location</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button
              onClick={getCurrentLocation}
              disabled={isGettingLocation || updateLocationMutation.isPending}
              variant="outline"
              className="flex items-center space-x-2"
              data-testid="button-get-current-location"
            >
              {isGettingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              <span>{isGettingLocation ? "Getting Location..." : "Get Current Location"}</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                placeholder="40.712776"
                value={locationForm.latitude}
                onChange={(e) => setLocationForm(prev => ({ ...prev, latitude: e.target.value }))}
                data-testid="input-latitude"
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                placeholder="-74.005974"
                value={locationForm.longitude}
                onChange={(e) => setLocationForm(prev => ({ ...prev, longitude: e.target.value }))}
                data-testid="input-longitude"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address (Optional)</Label>
            <Input
              id="address"
              placeholder="123 Main St, City, State 12345"
              value={locationForm.address}
              onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
              data-testid="input-address"
            />
          </div>

          <div>
            <Label htmlFor="radius">Service Radius (km)</Label>
            <Input
              id="radius"
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              placeholder="5.00"
              value={locationForm.radius}
              onChange={(e) => setLocationForm(prev => ({ ...prev, radius: e.target.value }))}
              data-testid="input-radius"
            />
          </div>

          <Button
            onClick={handleSaveLocation}
            disabled={updateLocationMutation.isPending}
            className="w-full"
            data-testid="button-save-location"
          >
            {updateLocationMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Location...
              </>
            ) : (
              "Save Location"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Map Preview Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Location Preview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg h-64 flex items-center justify-center border border-dashed border-muted-foreground/30">
            <div className="text-center space-y-2">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Interactive map integration will be added here
              </p>
              {truckLocation?.latitude && truckLocation?.longitude && (
                <p className="text-xs text-muted-foreground font-mono">
                  {truckLocation.latitude.toFixed(6)}, {truckLocation.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
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