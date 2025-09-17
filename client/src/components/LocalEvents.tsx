import { LocalEvent, Ad } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LocalEventsProps {
  events: LocalEvent[];
  ads: Ad[];
}

export default function LocalEvents({ events, ads }: LocalEventsProps) {
  if (events.length === 0 && ads.length === 0) {
    return null;
  }

  const handleAdClick = (ad: Ad) => {
    if (ad.link) {
      window.open(ad.link, '_blank');
    }
  };

  return (
    <div className="p-4">
      <h2 className="font-heading font-bold text-xl mb-4" data-testid="text-events-title">
        What's Happening
      </h2>
      
      {/* Events */}
      {events.map(event => (
        <div 
          key={event.id}
          className="bg-gradient-to-r from-secondary to-primary rounded-2xl p-4 mb-4 text-white"
          data-testid={`card-event-${event.id}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 
                className="font-heading font-semibold text-lg" 
                data-testid={`text-event-name-${event.id}`}
              >
                {event.eventName}
              </h3>
              <p 
                className="text-sm opacity-90" 
                data-testid={`text-event-location-${event.id}`}
              >
                {event.location}
              </p>
              <p 
                className="text-xs opacity-75" 
                data-testid={`text-event-time-${event.id}`}
              >
                {new Date(event.dateTime).toLocaleDateString()} at {new Date(event.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <i className="fas fa-calendar-alt text-2xl opacity-75"></i>
          </div>
        </div>
      ))}

      {/* Ads */}
      {ads.map(ad => (
        <Card key={ad.id} className="mb-4" data-testid={`card-ad-${ad.id}`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              {ad.imageUrl && (
                <img 
                  src={ad.imageUrl} 
                  alt={ad.bizName}
                  className="w-12 h-12 rounded-xl object-cover"
                  data-testid={`img-ad-${ad.id}`}
                />
              )}
              <div className="flex-1">
                <h4 
                  className="font-medium" 
                  data-testid={`text-ad-name-${ad.id}`}
                >
                  {ad.bizName}
                </h4>
                <p 
                  className="text-sm text-muted-foreground" 
                  data-testid={`text-ad-description-${ad.id}`}
                >
                  {ad.description || `${ad.location}`}
                </p>
              </div>
              {ad.link && (
                <Button 
                  size="sm"
                  className="px-4 py-2 rounded-xl"
                  onClick={() => handleAdClick(ad)}
                  data-testid={`button-visit-${ad.id}`}
                >
                  Visit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
