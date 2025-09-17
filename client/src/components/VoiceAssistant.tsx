import { useState, useEffect } from "react";
import { Item } from "@shared/schema";
import { useVoice } from "@/hooks/use-voice";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface VoiceAssistantProps {
  items: Item[];
  onClose: () => void;
}

export default function VoiceAssistant({ items, onClose }: VoiceAssistantProps) {
  const [message, setMessage] = useState("Hi! Welcome to TruckEats! How can I help you today?");
  const [suggestedActions, setSuggestedActions] = useState<string[]>(["view_specials"]);
  const { items: cartItems } = useCart();

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
    // Speak initial greeting
    speak(message);
  }, []);

  async function handleTranscription(text: string) {
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
    >
      <Card className="shadow-xl border border-border animate-in slide-in-from-bottom-4">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <i className="fas fa-robot text-white"></i>
            </div>
            <div>
              <h3 className="font-heading font-semibold">AI Hostess</h3>
              <p className="text-sm text-muted-foreground">
                {isListening ? "Listening..." : isProcessing ? "Processing..." : isSpeaking ? "Speaking..." : "Ready"}
              </p>
            </div>
            <Button 
              size="sm"
              variant="ghost"
              className="ml-auto w-8 h-8 rounded-full p-0"
              onClick={onClose}
              data-testid="button-close-voice"
            >
              <i className="fas fa-times text-sm"></i>
            </Button>
          </div>
          
          {/* Voice waveform visualization */}
          {(isListening || isProcessing) && (
            <div className="flex items-center justify-center space-x-1 mb-3">
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
          
          <div className="bg-muted rounded-xl p-3 mb-3">
            <p className="text-sm" data-testid="text-voice-message">
              {message}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedActions.map(action => (
              <Button
                key={action}
                size="sm"
                variant="outline"
                onClick={() => handleAction(action)}
                data-testid={`button-action-${action}`}
              >
                {action.replace('_', ' ')}
              </Button>
            ))}
          </div>

          <div className="flex space-x-2">
            <Button 
              className="flex-1"
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              data-testid="button-voice-toggle"
            >
              <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'} mr-2`}></i>
              {isListening ? 'Stop' : 'Talk'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
