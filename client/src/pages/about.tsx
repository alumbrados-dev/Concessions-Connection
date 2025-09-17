import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";

export default function About() {
  const [location, setLocation] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'offline' | 'available' | 'unavailable'>('offline');

  useEffect(() => {
    // Check if GPS is supported
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }

    // Try to get current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus('available');
        // For now, set to the sample location as specified
        setLocation("Near Mason District Park, Annandale, VA");
      },
      (error) => {
        console.log('Location error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('offline');
        } else {
          setLocationStatus('unavailable');
        }
      }
    );
  }, []);

  const getLocationDisplay = () => {
    switch (locationStatus) {
      case 'offline':
        return "We are currently offline";
      case 'available':
        return location ? `Current Location: ${location}` : "Location temporarily unavailable";
      case 'unavailable':
        return "Location temporarily unavailable";
    }
  };

  const getLocationStatusColor = () => {
    switch (locationStatus) {
      case 'offline':
        return "destructive";
      case 'available':
        return "default";
      case 'unavailable':
        return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onActivateVoice={() => {}} />
      
      <div className="p-4 space-y-6 pb-24">
        {/* About Us Section */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">About Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground leading-relaxed">
              Mr Food Truck is a family-run mobile food truck founded by Amy and her loved ones. 
              Fueled by a passion for fresh flavors and genuine hospitality, Amy steers every 
              aspect of the business—from crafting signature recipes to greeting you with a warm 
              smile at the window.
            </p>
            <p className="text-primary font-medium italic text-center">
              "...Linking Families through tastes and experience."
            </p>
          </CardContent>
        </Card>

        {/* Our Difference Section */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Our Difference</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Hand-picked ingredients, made fresh to order</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>A rotating menu that celebrates seasonal flavors and family traditions</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Friendly service designed for all ages—quick lunch or weekend gathering</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Join the Connection Section */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Join the Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">
              Catch our truck as we tour local events, neighborhoods, and community celebrations. 
              Follow us on social media for our schedule, menu sneak peeks, and family-friendly 
              specials. We can't wait to welcome you aboard!
            </p>
          </CardContent>
        </Card>

        {/* Hours of Operation */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Hours of Operation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-center">
              Tuesday - Sunday, 11 AM - 8 PM
            </p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Closed Mondays
            </p>
          </CardContent>
        </Card>

        {/* GPS Location Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl flex items-center justify-between">
              Current Location
              <Badge variant={getLocationStatusColor() as any} className="ml-2">
                {locationStatus === 'available' ? 'Live' : locationStatus === 'offline' ? 'Offline' : 'Unavailable'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <i className={`fas ${locationStatus === 'available' ? 'fa-map-marker-alt' : 'fa-map-marked-alt'} text-white text-lg`}></i>
              </div>
              <div className="flex-1">
                <p className="font-medium text-lg" data-testid="text-current-location">
                  {getLocationDisplay()}
                </p>
                {locationStatus === 'available' && (
                  <p className="text-sm text-muted-foreground">
                    Updated just now
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}