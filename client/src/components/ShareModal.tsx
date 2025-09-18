import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const appUrl = window.location.href;
  const shareTitle = "Concessions Connection - Food Truck App";
  const shareText = "Check out Concessions Connection! Order delicious food from our family-run mobile food truck.";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the link.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: appUrl,
        });
        onClose();
      } catch (error) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed", error);
      }
    } else {
      // Fallback to copy link
      handleCopyLink();
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\nVisit: ${appUrl}`);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailtoUrl);
  };

  const handleSMSShare = () => {
    const message = encodeURIComponent(`${shareText} ${appUrl}`);
    const smsUrl = `sms:?body=${message}`;
    window.open(smsUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Share App</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 p-4">
          <p className="text-center text-muted-foreground">
            Share Concessions Connection with your friends and family!
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Native Share (if supported) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <Button 
                onClick={handleNativeShare}
                className="flex flex-col items-center space-y-2 h-16 bg-primary hover:bg-primary/90"
                data-testid="share-button-native"
              >
                <i className="fas fa-share-alt text-lg"></i>
                <span className="text-sm">Share</span>
              </Button>
            )}
            
            {/* Copy Link */}
            <Button 
              onClick={handleCopyLink}
              variant={copied ? "default" : "outline"}
              className="flex flex-col items-center space-y-2 h-16"
              data-testid="share-button-copy"
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-lg`}></i>
              <span className="text-sm">{copied ? 'Copied!' : 'Copy Link'}</span>
            </Button>
            
            {/* Email */}
            <Button 
              onClick={handleEmailShare}
              variant="outline"
              className="flex flex-col items-center space-y-2 h-16"
              data-testid="share-button-email"
            >
              <i className="fas fa-envelope text-lg"></i>
              <span className="text-sm">Email</span>
            </Button>
            
            {/* SMS */}
            <Button 
              onClick={handleSMSShare}
              variant="outline"
              className="flex flex-col items-center space-y-2 h-16"
              data-testid="share-button-sms"
            >
              <i className="fas fa-sms text-lg"></i>
              <span className="text-sm">SMS</span>
            </Button>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={onClose}
              variant="ghost"
              className="mt-4"
              data-testid="share-button-close"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}