import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AppInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppInfoModal({ isOpen, onClose }: AppInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">App Info</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4">
          {/* App Logo/Icon */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <i className="fas fa-truck text-white text-2xl"></i>
            </div>
            <h3 className="text-xl font-heading font-bold">Concessions Connection</h3>
            <p className="text-muted-foreground">Mobile Food Truck App</p>
          </div>
          
          {/* Version Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Version:</span>
              <span className="text-sm">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Build:</span>
              <span className="text-sm">2024.12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Platform:</span>
              <span className="text-sm">Progressive Web App</span>
            </div>
          </div>
          
          {/* Credits */}
          <div className="text-center space-y-3">
            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground mb-2">Imagined by:</p>
              <div className="flex items-center justify-center space-x-2">
                <i className="fab fa-instagram text-pink-500"></i>
                <span className="font-medium text-primary">@alumbrados.dev</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">on Instagram</p>
            </div>
            
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Built with love for connecting families through tastes and experiences
              </p>
            </div>
          </div>
          
          {/* App Features */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Features:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-2">
                <i className="fas fa-utensils text-xs"></i>
                <span>Menu Browsing</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-shopping-cart text-xs"></i>
                <span>Online Ordering</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-microphone text-xs"></i>
                <span>Voice Assistant</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-map-marker-alt text-xs"></i>
                <span>Location Tracking</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-calendar text-xs"></i>
                <span>Event Updates</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-share-alt text-xs"></i>
                <span>Easy Sharing</span>
              </div>
            </div>
          </div>
          
          {/* Social Links */}
          <div className="text-center pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">Follow us for updates:</p>
            <div className="flex justify-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-auto"
                onClick={() => window.open('https://instagram.com/alumbrados.dev', '_blank')}
                data-testid="app-info-instagram"
              >
                <i className="fab fa-instagram text-pink-500 text-lg"></i>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-auto"
                onClick={() => window.open('https://facebook.com/', '_blank')}
                data-testid="app-info-facebook"
              >
                <i className="fab fa-facebook text-blue-600 text-lg"></i>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-auto"
                onClick={() => window.open('https://twitter.com/', '_blank')}
                data-testid="app-info-twitter"
              >
                <i className="fab fa-twitter text-sky-500 text-lg"></i>
              </Button>
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={onClose}
              className="mt-4"
              data-testid="app-info-close"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}