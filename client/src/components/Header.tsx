import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "wouter";
import { Shield, LogOut, LogIn } from "lucide-react";

interface HeaderProps {
  onShowAbout?: () => void;
  onShare?: () => void;
  onShowQR?: () => void;
  onShowApp?: () => void;
  onCartClick?: () => void;
}

export default function Header({ 
  onShowAbout, 
  onShare, 
  onShowQR, 
  onShowApp,
  onCartClick
}: HeaderProps) {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Check if user is admin (either from environment or database role)
  const isAdmin = user?.isAdmin || false;

  const handleMenuAction = (action: (() => void) | undefined, actionName: string) => {
    if (action) {
      action();
    } else {
      // For development - scroll to About Us section if available
      if (actionName === 'about') {
        const aboutSection = document.querySelector('[data-testid="text-about-title"]');
        if (aboutSection) {
          aboutSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between p-4">
        {/* Left side - Cart button moved to left */}
        <div className="flex items-center space-x-3">
          <Button
            size="icon"
            className="relative w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            onClick={onCartClick}
            aria-label={`Shopping cart with ${itemCount} items`}
            data-testid="button-cart"
          >
            {/* Custom cart image placeholder - using a stylized cart icon */}
            <div className="w-6 h-6 relative">
              <div className="w-full h-4 bg-white/90 rounded-t-sm border-2 border-white"></div>
              <div className="absolute bottom-0 left-1 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute bottom-0 right-1 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute top-0 right-0 w-1 h-3 bg-white rounded-sm transform rotate-12"></div>
            </div>
            {itemCount > 0 && (
              <span 
                className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
                data-testid="text-cart-count"
              >
                {itemCount}
              </span>
            )}
          </Button>
        </div>
        
        {/* Center - Empty space (removed app name and location bubble) */}
        <div className="flex-1"></div>
        
        {/* Right side - Hamburger menu */}
        <div className="flex items-center">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-12 h-12"
                aria-label="Open navigation menu"
                data-testid="button-hamburger-menu"
              >
                <div className="flex flex-col space-y-1">
                  <div className="w-5 h-0.5 bg-current"></div>
                  <div className="w-5 h-0.5 bg-current"></div>
                  <div className="w-5 h-0.5 bg-current"></div>
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-6">
              <div className="space-y-6">
                <h2 className="font-heading text-2xl font-bold">Menu</h2>
                
                <div className="space-y-4">
                  {/* Admin Panel Link - Only visible to administrators */}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left h-auto p-4 border-2 border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/20 dark:hover:bg-red-950/40"
                      onClick={() => setIsMenuOpen(false)}
                      data-testid="menu-button-admin-panel"
                      asChild
                    >
                      <Link href="/admin">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-5 h-5 text-red-600" />
                          <span className="text-lg font-medium text-red-700 dark:text-red-400">Admin Panel</span>
                        </div>
                      </Link>
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left h-auto p-4"
                    onClick={() => handleMenuAction(onShowAbout, 'about')}
                    data-testid="menu-button-about"
                  >
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-info-circle text-lg"></i>
                      <span className="text-lg">About Us</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left h-auto p-4"
                    onClick={() => handleMenuAction(onShare, 'share')}
                    data-testid="menu-button-share"
                  >
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-share-alt text-lg"></i>
                      <span className="text-lg">Share</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left h-auto p-4"
                    onClick={() => handleMenuAction(onShowQR, 'qr')}
                    data-testid="menu-button-qr"
                  >
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-qrcode text-lg"></i>
                      <span className="text-lg">QR Code</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left h-auto p-4"
                    onClick={() => handleMenuAction(onShowApp, 'app')}
                    data-testid="menu-button-app"
                  >
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-mobile-alt text-lg"></i>
                      <span className="text-lg">App Info</span>
                    </div>
                  </Button>
                  
                  {/* Authentication Section */}
                  <div className="pt-4 border-t border-border">
                    {user ? (
                      <>
                        <div className="px-4 py-2 mb-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {isAdmin ? 'Administrator' : 'Customer'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left h-auto p-4"
                          onClick={() => {
                            logout();
                            setIsMenuOpen(false);
                          }}
                          data-testid="menu-button-logout"
                        >
                          <div className="flex items-center space-x-3">
                            <LogOut className="w-5 h-5" />
                            <span className="text-lg">Logout</span>
                          </div>
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left h-auto p-4"
                        onClick={() => setIsMenuOpen(false)}
                        data-testid="menu-button-login"
                        asChild
                      >
                        <Link href="/login">
                          <div className="flex items-center space-x-3">
                            <LogIn className="w-5 h-5" />
                            <span className="text-lg">Login</span>
                          </div>
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
