import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onActivateVoice: () => void;
}

export default function Header({ onActivateVoice }: HeaderProps) {
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <i className="fas fa-truck text-white text-lg"></i>
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg" data-testid="text-app-name">
              Concessions Connection
            </h1>
            <p className="text-xs text-muted-foreground" data-testid="text-location">
              Annandale, VA
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            size="icon"
            variant="secondary"
            className="w-12 h-12 rounded-full voice-pulse"
            onClick={onActivateVoice}
            data-testid="button-voice-assistant"
          >
            <i className="fas fa-microphone text-white"></i>
          </Button>
          
          <Button
            size="icon"
            className="relative w-12 h-12 rounded-full"
            data-testid="button-cart"
          >
            <i className="fas fa-shopping-cart text-white"></i>
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
      </div>
    </header>
  );
}
