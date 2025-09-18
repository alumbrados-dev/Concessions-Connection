import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Bell, 
  BellOff, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Smartphone,
  Clock,
  ShoppingCart,
  MapPin
} from "lucide-react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";

interface NotificationPreferences {
  id: string;
  userId: string;
  pushEnabled: boolean;
  pushToken: string | null;
  permissionStatus: 'default' | 'granted' | 'denied';
  createdAt: string;
  updatedAt: string;
}

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Fetch current notification preferences
  const { data: preferences, isLoading, error } = useQuery<NotificationPreferences>({
    queryKey: ['/api/notifications/preferences'],
  });

  // Update notification preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (updates: { pushEnabled?: boolean; permissionStatus?: string }) =>
      apiRequest('PUT', '/api/notifications/preferences', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update notification settings.",
        variant: "destructive",
      });
    }
  });

  // Register push token mutation
  const registerTokenMutation = useMutation({
    mutationFn: (pushToken: string) =>
      apiRequest('POST', '/api/notifications/register', { pushToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
      toast({
        title: "Notifications Enabled",
        description: "You'll now receive push notifications for updates and offers.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error?.message || "Failed to register for push notifications.",
        variant: "destructive",
      });
    }
  });

  // Initialize Capacitor Push Notifications
  useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        // Only initialize on mobile platforms
        if (Capacitor.getPlatform() === 'web') {
          console.log('Push notifications not available on web platform');
          // Update permission status to indicate web platform doesn't support push
          if (preferences && preferences.permissionStatus !== 'denied') {
            updatePreferencesMutation.mutate({ 
              permissionStatus: 'denied' 
            });
          }
          return;
        }

        // Request permission (this just checks permission, doesn't trigger prompt)
        const permStatus = await PushNotifications.checkPermissions();
        
        // Update permission status if different from stored
        if (preferences && permStatus.receive !== preferences.permissionStatus) {
          updatePreferencesMutation.mutate({ 
            permissionStatus: permStatus.receive 
          });
        }

        // Add listeners for push notifications
        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success, token: ' + token.value);
          registerTokenMutation.mutate(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error: ', error);
          toast({
            title: "Registration Error",
            description: "Failed to register for push notifications. Please try again.",
            variant: "destructive",
          });
          setIsRequestingPermission(false);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received: ', notification);
          toast({
            title: notification.title || "New Notification",
            description: notification.body || "You have a new notification",
          });
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed: ', notification);
        });

      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    if (preferences) {
      initializePushNotifications();
    }

    // Cleanup listeners on unmount
    return () => {
      // Only remove listeners if not on web platform
      if (Capacitor.getPlatform() !== 'web') {
        PushNotifications.removeAllListeners();
      }
    };
  }, [preferences]);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      // Check if we're on web platform
      if (Capacitor.getPlatform() === 'web') {
        toast({
          title: "Not Available on Web",
          description: "Push notifications are only available in the mobile app. Download our app for push notifications.",
          variant: "destructive",
        });
        return;
      }

      // User wants to enable notifications - request permission
      setIsRequestingPermission(true);
      
      try {
        // Request permissions from the system
        const permission = await PushNotifications.requestPermissions();
        
        if (permission.receive === 'granted') {
          // Permission granted - register for notifications
          await PushNotifications.register();
          
          // Update preferences to show enabled
          updatePreferencesMutation.mutate({ 
            pushEnabled: true,
            permissionStatus: 'granted' 
          });
        } else {
          // Permission denied
          updatePreferencesMutation.mutate({ 
            pushEnabled: false,
            permissionStatus: 'denied' 
          });
          
          toast({
            title: "Permission Denied",
            description: "Notifications are disabled. You can enable them in your device settings.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        toast({
          title: "Permission Error",
          description: "Failed to request notification permission. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsRequestingPermission(false);
      }
    } else {
      // User wants to disable notifications
      updatePreferencesMutation.mutate({ 
        pushEnabled: false 
      });
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
            <span className="text-muted-foreground">Loading notification settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive" data-testid="alert-notification-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed to Load Settings</AlertTitle>
            <AlertDescription>
              Unable to load notification preferences. Please refresh the page and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isEnabled = preferences?.pushEnabled || false;
  const permissionStatus = preferences?.permissionStatus || 'default';

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2" data-testid="heading-notification-settings">
          <Bell className="w-5 h-5 text-blue-600" />
          <span>Push Notifications</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Stay updated with order status, special offers, and food truck location updates
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="notifications-toggle" className="text-base font-medium">
              Enable Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications on your device
            </p>
          </div>
          <Switch
            id="notifications-toggle"
            checked={isEnabled}
            onCheckedChange={handleToggleNotifications}
            disabled={updatePreferencesMutation.isPending || isRequestingPermission}
            data-testid="switch-notifications-enabled"
            aria-label="Toggle push notifications"
          />
        </div>

        <Separator />

        {/* Permission Status */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">Permission Status</Label>
          <div className="flex items-center space-x-2">
            {permissionStatus === 'granted' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600" data-testid="text-permission-status">Granted</span>
              </>
            ) : permissionStatus === 'denied' ? (
              <>
                <BellOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600" data-testid="text-permission-status">Denied</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600" data-testid="text-permission-status">Not Requested</span>
              </>
            )}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-muted-foreground">What you'll receive:</Label>
          <div className="grid gap-3">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Order Updates</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Get notified when your order is ready for pickup</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <MapPin className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">Location Updates</p>
                <p className="text-xs text-green-700 dark:text-green-300">Know when we're near your location</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <Clock className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Special Offers</p>
                <p className="text-xs text-purple-700 dark:text-purple-300">Be first to know about deals and new menu items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Permission Denied Help */}
        {permissionStatus === 'denied' && (
          <Alert data-testid="alert-permission-help">
            <Shield className="h-4 w-4" />
            <AlertTitle>Notifications Disabled</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>To enable notifications, please:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to your device Settings</li>
                <li>Find "Concessions Connection" in your apps</li>
                <li>Enable Notifications</li>
                <li>Return here and toggle notifications on</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Privacy Notice */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-gray-500 mt-0.5" />
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Privacy Notice</p>
              <p>
                We only send notifications for order updates, location changes, and occasional promotions. 
                You can disable these at any time. We never share your device information with third parties.
              </p>
            </div>
          </div>
        </div>

        {/* Loading States */}
        {(updatePreferencesMutation.isPending || isRequestingPermission) && (
          <div className="flex items-center justify-center space-x-2 py-2">
            <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">
              {isRequestingPermission ? 'Requesting permission...' : 'Updating settings...'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}