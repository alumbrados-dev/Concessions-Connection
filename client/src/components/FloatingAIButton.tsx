import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAISettings } from "@/hooks/use-ai-settings";

interface FloatingAIButtonProps {
  onActivate: () => void;
}

export default function FloatingAIButton({ onActivate }: FloatingAIButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isPulsing, setIsPulsing] = useState(false);
  const { isAIEnabled } = useAISettings();

  // Don't render if AI is disabled
  if (!isAIEnabled) {
    return null;
  }

  // Add a subtle pulse animation every few seconds
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 2000);
    }, 8000);

    return () => clearInterval(pulseInterval);
  }, []);

  // Show/hide based on scroll position (optional enhancement)
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isVisible ? 'transform translate-y-0 opacity-100' : 'transform translate-y-16 opacity-0'
      }`}
    >
      <Button
        onClick={onActivate}
        className={`
          w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 
          hover:from-purple-600 hover:via-blue-600 hover:to-indigo-700
          shadow-lg hover:shadow-xl transition-all duration-300 
          border-2 border-white/20 backdrop-blur-sm
          group relative overflow-hidden
          ${isPulsing ? 'animate-pulse scale-110' : 'scale-100'}
        `}
        aria-label="Activate AI Voice Assistant"
        data-testid="button-floating-ai"
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* AI Brain Icon */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <div className="relative">
            {/* Main brain shape */}
            <div className="w-8 h-8 relative">
              {/* Brain outline */}
              <div className="absolute inset-0 border-2 border-white rounded-full"></div>
              <div className="absolute top-1 left-1 w-6 h-6 border-2 border-white rounded-full opacity-60"></div>
              
              {/* Neural network lines */}
              <div className="absolute top-2 left-3 w-3 h-0.5 bg-white transform rotate-45"></div>
              <div className="absolute top-3 left-2 w-2 h-0.5 bg-white transform -rotate-45"></div>
              <div className="absolute top-4 left-4 w-2 h-0.5 bg-white transform rotate-12"></div>
              
              {/* Dots representing neurons */}
              <div className="absolute top-2 right-1 w-1 h-1 bg-white rounded-full animate-ping"></div>
              <div className="absolute bottom-2 left-1 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-1 right-2 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
            </div>
            
            {/* Microphone indicator */}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-sm"></div>
            </div>
          </div>
        </div>
        
        {/* Ripple effect for interactions */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-white/30 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-full"></div>
        </div>
      </Button>
      
      {/* Tooltip/Help text */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-black/80 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        AI Voice Assistant
      </div>
    </div>
  );
}