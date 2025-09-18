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
        
        <div className="space-y-4 p-3">
          {/* App Title */}
          <div className="text-center">
            <h3 className="text-xl font-heading font-bold">Concessions Connection</h3>
          </div>
          
          {/* Credits */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Imagined by:</p>
            <div className="flex items-center justify-center space-x-2">
              <i className="fab fa-instagram text-pink-500"></i>
              <span className="font-medium text-primary">@alumbrados.dev</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">on Instagram</p>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={onClose}
              className="mt-3"
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