import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Star, 
  Gift, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Coins,
  Zap,
  Award
} from "lucide-react";

interface PointsStatus {
  pointsEnabled: boolean;
  totalPoints: number;
}

interface PointsSettingsProps {
  className?: string;
  showTitle?: boolean;
}

export function PointsSettings({ className, showTitle = true }: PointsSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);

  // Fetch current points status
  const { data: pointsStatus, isLoading, error } = useQuery<PointsStatus>({
    queryKey: ['/api/points/status'],
  });

  // Update points preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (pointsEnabled: boolean) =>
      apiRequest('PUT', '/api/points/preferences', { pointsEnabled }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/points/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/points/balance'] });
      toast({
        title: data.pointsEnabled ? "Points System Enabled!" : "Points System Disabled",
        description: data.message,
        variant: data.pointsEnabled ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update points preferences.",
        variant: "destructive",
      });
    }
  });

  const handleTogglePoints = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      await updatePreferencesMutation.mutateAsync(enabled);
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
            <span className="text-muted-foreground">Loading points settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive" data-testid="alert-points-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed to Load Points Settings</AlertTitle>
            <AlertDescription>
              Unable to load points preferences. Please refresh the page and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isEnabled = pointsStatus?.pointsEnabled || false;
  const currentPoints = pointsStatus?.totalPoints || 0;

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center space-x-2" data-testid="heading-points-settings">
            <Star className="w-5 h-5 text-yellow-500" />
            <span>Loyalty Points</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Earn points with every purchase and get rewards for your loyalty
          </p>
        </CardHeader>
      )}
      
      <CardContent className="space-y-6">
        {/* Points Balance Display */}
        {isEnabled && (
          <div className="text-center p-4 bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Coins className="w-6 h-6 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-800 dark:text-yellow-200" data-testid="text-points-balance">
                {currentPoints}
              </span>
              <span className="text-sm text-yellow-700 dark:text-yellow-300">points</span>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Your current loyalty points balance
            </p>
          </div>
        )}

        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="points-toggle" className="text-base font-medium">
              Enable Points System
            </Label>
            <p className="text-sm text-muted-foreground">
              Earn 10 points for every $10 spent
            </p>
          </div>
          <Switch
            id="points-toggle"
            checked={isEnabled}
            onCheckedChange={handleTogglePoints}
            disabled={updatePreferencesMutation.isPending || isToggling}
            data-testid="switch-points-enabled"
            aria-label="Toggle points system"
          />
        </div>

        <Separator />

        {/* Benefits Section */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-muted-foreground">How it works:</Label>
          <div className="grid gap-3">
            <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">Earn Points</p>
                <p className="text-xs text-green-700 dark:text-green-300">Get 10 points for every $10 you spend</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Gift className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Future Rewards</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Redeem points for discounts and free items (coming soon!)</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <Award className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Loyalty Benefits</p>
                <p className="text-xs text-purple-700 dark:text-purple-300">Exclusive offers and early access to new menu items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Points Calculation Example */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
          <div className="flex items-start space-x-2">
            <Zap className="w-4 h-4 text-primary mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium mb-2">Points Calculation</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>$10.00 order</span>
                  <Badge variant="secondary" className="text-xs">10 points</Badge>
                </div>
                <div className="flex justify-between">
                  <span>$25.50 order</span>
                  <Badge variant="secondary" className="text-xs">20 points</Badge>
                </div>
                <div className="flex justify-between">
                  <span>$50.00 order</span>
                  <Badge variant="secondary" className="text-xs">50 points</Badge>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Points are awarded automatically after payment
              </p>
            </div>
          </div>
        </div>

        {/* Status Information */}
        {!isEnabled && (
          <Alert data-testid="alert-points-disabled">
            <Info className="h-4 w-4" />
            <AlertTitle>Points System Disabled</AlertTitle>
            <AlertDescription>
              Enable the points system to start earning loyalty points with your purchases. 
              You can change this setting anytime.
            </AlertDescription>
          </Alert>
        )}

        {isEnabled && currentPoints === 0 && (
          <Alert data-testid="alert-no-points-yet">
            <Coins className="h-4 w-4" />
            <AlertTitle>Start Earning Points!</AlertTitle>
            <AlertDescription>
              Your points system is now active. Place your first order to start earning loyalty points!
            </AlertDescription>
          </Alert>
        )}

        {isEnabled && currentPoints > 0 && (
          <Alert data-testid="alert-points-active">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Points System Active</AlertTitle>
            <AlertDescription>
              You're earning points on all purchases! Keep ordering to build up your loyalty rewards.
            </AlertDescription>
          </Alert>
        )}

        {/* Privacy Notice */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-gray-500 mt-0.5" />
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Points System</p>
              <p>
                Points are automatically calculated and added to your account after successful payments. 
                You can opt out anytime and your existing points will remain in your account.
              </p>
            </div>
          </div>
        </div>

        {/* Loading States */}
        {(updatePreferencesMutation.isPending || isToggling) && (
          <div className="flex items-center justify-center space-x-2 py-2">
            <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Updating points settings...
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}