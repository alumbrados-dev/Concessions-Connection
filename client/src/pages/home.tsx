import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Item, LocalEvent, Ad } from "@shared/schema";
import { realtimeConnection } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import LocationBanner from "@/components/LocationBanner";
import MenuItems from "@/components/MenuItems";
import LocalEvents from "@/components/LocalEvents";
import VoiceAssistant from "@/components/VoiceAssistant";
import BottomNavigation from "@/components/BottomNavigation";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const { toast } = useToast();

  const { data: items = [], refetch: refetchItems } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: events = [] } = useQuery<LocalEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: ads = [] } = useQuery<Ad[]>({
    queryKey: ["/api/ads"],
  });

  useEffect(() => {
    const unsubscribeStock = realtimeConnection.subscribe('STOCK_UPDATED', (data) => {
      const item = data.data as Item;
      if (item.stock <= 0) {
        toast({
          title: "Out of Stock",
          description: `${item.name} is now out of stock`,
          variant: "destructive",
        });
      } else if (item.stock <= 3) {
        toast({
          title: "Low Stock Alert",
          description: `Only ${item.stock} ${item.name} left`,
        });
      }
      refetchItems();
    });

    const unsubscribeItem = realtimeConnection.subscribe('ITEM_CREATED', () => {
      refetchItems();
    });

    return () => {
      unsubscribeStock();
      unsubscribeItem();
    };
  }, [toast, refetchItems]);

  const categories = [
    { id: "all", name: "All Items" },
    { id: "starters", name: "Starters" },
    { id: "grill", name: "Off the Grill" },
    { id: "drinks", name: "Refreshments" },
    { id: "sides", name: "Fries & Sides" },
    { id: "extras", name: "Extras" },
  ];

  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const currentEvent = events[0];

  return (
    <div className="min-h-screen bg-background">
      <Header onActivateVoice={() => setShowVoiceAssistant(true)} />
      
      {currentEvent && (
        <LocationBanner 
          message={`We're at ${currentEvent.eventName} today! 🎉`}
        />
      )}

      {/* Menu Categories */}
      <div className="bg-card border-b border-border">
        <div className="flex overflow-x-auto scrollbar-hide p-4 space-x-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              data-testid={`category-${category.id}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <MenuItems items={filteredItems} />
      <LocalEvents events={events} ads={ads} />

      {showVoiceAssistant && (
        <VoiceAssistant
          items={filteredItems}
          onClose={() => setShowVoiceAssistant(false)}
        />
      )}

      <BottomNavigation />
    </div>
  );
}
