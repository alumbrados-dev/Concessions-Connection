import { useState, useEffect } from "react";
import { Item } from "@shared/schema";
import { useVoice } from "@/hooks/use-voice";
import { useCart } from "@/hooks/use-cart";
import { useAISettings } from "@/hooks/use-ai-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface VoiceAssistantProps {
  items: Item[];
  onClose: () => void;
}

export default function VoiceAssistant({ items, onClose }: VoiceAssistantProps) {
  const [message, setMessage] = useState("Hi! Welcome to Concessions Connection! How can I help you today?");
  const [suggestedActions, setSuggestedActions] = useState<string[]>(["view_specials"]);
  const { items: cartItems } = useCart();
  const { isAIEnabled, isLoading: isAILoading } = useAISettings();

  const { 
    isListening, 
    isProcessing, 
    isSpeaking, 
    startListening, 
    stopListening, 
    speak 
  } = useVoice({
    onTranscription: handleTranscription,
    onError: (error) => {
      console.error('Voice error:', error);
      setMessage("Sorry, I had trouble hearing you. Please try again!");
    }
  });

  useEffect(() => {
    // Only speak initial greeting if AI is enabled
    if (isAIEnabled && !isAILoading) {
      speak(message);
    } else if (!isAIEnabled) {
      setMessage("AI voice assistant is currently disabled. Please contact an administrator to enable AI features.");
    }
  }, [isAIEnabled, isAILoading, speak]);

  async function handleTranscription(text: string) {
    if (!isAIEnabled) {
      setMessage("AI functionality is currently disabled. Please contact an administrator to enable AI features.");
      return;
    }

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          context: {
            cartItems,
            menuItems: items.map(item => ({
              name: item.name,
              price: item.price,
              category: item.category
            }))
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
        setSuggestedActions(data.suggestedActions || []);
        speak(data.message);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setMessage("I'm having trouble right now. Please try again later!");
    }
  }

  const handleAction = (action: string) => {
    switch (action) {
      case "view_specials":
        setMessage("Our specials today include our Classic Burger combo! Would you like to hear more?");
        speak("Our specials today include our Classic Burger combo! Would you like to hear more?");
        break;
      case "add_combo":
        setMessage("Great choice! I can add fries and a drink to make it a combo for just $4 more!");
        speak("Great choice! I can add fries and a drink to make it a combo for just $4 more!");
        break;
      case "checkout":
        setMessage("Ready to order? Your total comes to $" + cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0).toFixed(2));
        speak("Ready to order? Let me help you checkout!");
        break;
      default:
        setMessage("How else can I help you today?");
        speak("How else can I help you today?");
    }
  };

  return (
    <div 
      className="fixed bottom-20 left-4 right-4 z-50"
      data-testid="voice-assistant"
      role="dialog"
      aria-labelledby="voice-assistant-title"
      aria-describedby="voice-assistant-description"
      aria-modal="true"
    >
      <Card className="shadow-xl border border-border animate-in slide-in-from-bottom-4">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center" aria-hidden="true">
              <i className="fas fa-robot text-white"></i>
            </div>
            <div>
              <h3 id="voice-assistant-title" className="font-heading font-semibold">AI Hostess</h3>
              <p 
                id="voice-assistant-status"
                className="text-sm text-muted-foreground"
                aria-live="polite"
                role="status"
              >
                {isListening ? "Listening..." : isProcessing ? "Processing..." : isSpeaking ? "Speaking..." : "Ready"}
              </p>
            </div>
            <Button 
              size="sm"
              variant="ghost"
              className="ml-auto w-10 h-10 rounded-full p-0 focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={onClose}
              data-testid="button-close-voice"
              aria-label="Close AI assistant"
            >
              <i className="fas fa-times text-sm" aria-hidden="true"></i>
            </Button>
          </div>
          
          {/* Voice waveform visualization */}
          {(isListening || isProcessing) && (
            <div 
              className="flex items-center justify-center space-x-1 mb-3"
              aria-hidden="true"
              role="presentation"
            >
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full voice-pulse"
                  style={{ 
                    height: `${12 + Math.random() * 12}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                ></div>
              ))}
            </div>
          )}
          
          <div 
            className="bg-muted rounded-xl p-3 mb-3"
            role="region"
            aria-labelledby="assistant-message-label"
          >
            <span id="assistant-message-label" className="sr-only">AI Assistant Message</span>
            <p 
              className="text-sm" 
              data-testid="text-voice-message"
              aria-live="polite"
              id="voice-assistant-description"
            >
              {message}
            </p>
          </div>

          {!isAIEnabled && (
            <div 
              className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" aria-hidden="true" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">AI Features Disabled</span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Voice features are unavailable. You can still use the suggested action buttons below to interact with the assistant.
              </p>
            </div>
          )}
          
          <div 
            className="flex flex-wrap gap-2 mb-3"
            role="group"
            aria-label="Quick action buttons - alternative to voice commands"
          >
            {suggestedActions.map(action => (
              <Button
                key={action}
                size="sm"
                variant="outline"
                onClick={() => handleAction(action)}
                data-testid={`button-action-${action}`}
                className="focus:ring-2 focus:ring-primary focus:ring-offset-1"
                aria-label={`Quick action: ${action.replace('_', ' ')}`}
              >
                {action.replace('_', ' ')}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex space-x-2">
              <Button 
                className="flex-1 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || !isAIEnabled}
                data-testid="button-voice-toggle"
                aria-label={
                  !isAIEnabled 
                    ? 'Voice commands disabled - use action buttons instead' 
                    : isListening 
                      ? 'Stop listening for voice commands' 
                      : 'Start listening for voice commands'
                }
                aria-describedby="voice-instructions"
              >
                <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'} mr-2`} aria-hidden="true"></i>
                {!isAIEnabled ? 'AI Disabled' : (isListening ? 'Stop' : 'Talk')}
              </Button>
            </div>
            
            {/* Instructions for accessibility */}
            <div id="voice-instructions" className="text-xs text-muted-foreground text-center">
              {!isAIEnabled 
                ? 'Voice commands are disabled. Use the action buttons above to interact.'
                : 'Click Talk to speak, or use the action buttons above for quick commands.'
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
