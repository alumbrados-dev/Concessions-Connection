import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ isOpen, onClose }: QRCodeModalProps) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("");
  const [qrCodeSVG, setQrCodeSVG] = useState<string>("");
  const { toast } = useToast();
  
  const appUrl = window.location.href;

  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
  }, [isOpen, appUrl]);

  const generateQRCode = async () => {
    try {
      // Generate QR code as data URL for display
      const dataURL = await QRCode.toDataURL(appUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataURL(dataURL);

      // Also generate as SVG for download
      const svgString = await QRCode.toString(appUrl, {
        type: 'svg',
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeSVG(svgString);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "QR Code Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      toast({
        title: "Link copied!",
        description: "App link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the link.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeSVG) {
      toast({
        title: "Download failed",
        description: "QR code not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([qrCodeSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'concessions-connection-qr.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "QR Code downloaded",
      description: "QR code has been saved to your downloads.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Scan this QR code to access Concessions Connection
            </p>
            
            {/* QR Code Display */}
            <div className="flex justify-center">
              <div 
                className="bg-white p-4 rounded-lg shadow-md border border-border"
                data-testid="qr-code-container"
              >
                {qrCodeDataURL ? (
                  <img 
                    src={qrCodeDataURL}
                    alt="QR Code for Concessions Connection"
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <div className="text-center">
                      <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground mb-2"></i>
                      <p className="text-sm text-muted-foreground">Generating QR code...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* URL Display */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Link:</p>
            <p className="text-sm break-all" data-testid="qr-url-display">
              {appUrl}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleCopyLink}
              variant="outline"
              className="flex items-center space-x-2"
              data-testid="qr-button-copy"
            >
              <i className="fas fa-copy text-sm"></i>
              <span>Copy Link</span>
            </Button>
            
            <Button 
              onClick={handleDownloadQR}
              variant="outline"
              className="flex items-center space-x-2"
              data-testid="qr-button-download"
            >
              <i className="fas fa-download text-sm"></i>
              <span>Download</span>
            </Button>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={onClose}
              variant="ghost"
              data-testid="qr-button-close"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}