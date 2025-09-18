import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Item, LocalEvent, Ad } from "@shared/schema";
import { realtimeConnection } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/use-device";
import Header from "@/components/Header";
import LocationBanner from "@/components/LocationBanner";
import MenuItems from "@/components/MenuItems";
import LocalEvents from "@/components/LocalEvents";
import VoiceAssistant from "@/components/VoiceAssistant";
import FloatingAIButton from "@/components/FloatingAIButton";

// Import hero images
import concessionsImage from "@assets/1Concessions_1758151930547.png";
import concessionsImageMedium from "@assets/1Concessions_medium_1758151930548.png";
import concessionsImageSmall from "@assets/1Concessions_small_1758151930549.png";
import connect4Image from "@assets/1Connect4_1758151930550.png";
import linkingImage from "@assets/1Linking_1758151930551.png";
import linkingImageMedium from "@assets/1Linking_medium_1758151930552.png";
import linkingImageSmall from "@assets/1Linking_small_1758151930553.png";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const { toast } = useToast();
  const { isMobile, screenWidth } = useDevice();

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
    { id: "starters", name: "Starters & Snacks" },
    { id: "grill", name: "Off the Grill" },
    { id: "drinks", name: "Refreshments" },
    { id: "extras", name: "Extras" },
  ];

  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const currentEvent = events[0];

  // Get responsive images
  const getConcessionsImage = () => {
    if (isMobile) {
      return screenWidth < 480 ? concessionsImageSmall : concessionsImageMedium;
    }
    return concessionsImage;
  };

  const getLinkingImage = () => {
    if (isMobile) {
      return screenWidth < 480 ? linkingImageSmall : linkingImageMedium;
    }
    return linkingImage;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {currentEvent && (
        <LocationBanner 
          message={`We're at ${currentEvent.eventName} today! 🎉`}
        />
      )}

      {/* Hero Section */}
      <section className="relative w-full">
        {/* Connect 4 box - positioned absolutely on top left */}
        <div className="absolute top-4 left-4 z-20">
          <img 
            src={connect4Image}
            alt="Connect 4"
            className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} object-contain`}
            data-testid="img-connect4"
          />
        </div>
        
        {/* Main Concessions Connection image in center */}
        <div className="relative w-full flex justify-center">
          <img 
            src={getConcessionsImage()}
            alt="Concessions Connection"
            className="w-full max-w-4xl h-auto object-contain"
            data-testid="img-hero-concessions"
          />
        </div>
        
        {/* Linking banner below hero */}
        <div className="w-full flex justify-center mt-2">
          <img 
            src={getLinkingImage()}
            alt="Linking families through tastes and experiences"
            className="w-full max-w-3xl h-auto object-contain"
            data-testid="img-linking-banner"
          />
        </div>
      </section>

      {/* Menu Categories */}
      <div className="bg-card border-b border-border mt-8">
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
      
      {/* About Us Section - moved inline */}
      <section className="p-6 bg-card/50 mt-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="font-heading text-3xl font-bold text-center mb-8" data-testid="text-about-title">
            About Us
          </h2>
          
          <div className="text-center space-y-4">
            <p className="text-foreground leading-relaxed text-lg">
              Concessions Connection is a family-run mobile food truck founded by Amy and her loved ones. 
              Fueled by a passion for fresh flavors and genuine hospitality, Amy steers every 
              aspect of the business—from crafting signature recipes to greeting you with a warm 
              smile at the window.
            </p>
            <p className="text-primary font-medium italic text-xl">
              "...Linking Families through tastes and experience."
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <h3 className="font-heading text-xl font-semibold mb-4">Our Difference</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Hand-picked ingredients, made fresh to order</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>A rotating menu that celebrates seasonal flavors and family traditions</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Friendly service designed for all ages—quick lunch or weekend gathering</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <h3 className="font-heading text-xl font-semibold mb-4">Hours & Location</h3>
              <div className="space-y-3">
                <p className="text-lg font-medium">Tuesday - Sunday, 11 AM - 8 PM</p>
                <p className="text-sm text-muted-foreground">Closed Mondays</p>
                <p className="text-sm text-muted-foreground mt-4">
                  Catch our truck as we tour local events, neighborhoods, and community celebrations. 
                  Follow us on social media for our schedule and specials!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LocalEvents events={events} ads={ads} />

      {showVoiceAssistant && (
        <VoiceAssistant
          items={filteredItems}
          onClose={() => setShowVoiceAssistant(false)}
        />
      )}
      
      {/* Floating AI Button */}
      <FloatingAIButton onActivate={() => setShowVoiceAssistant(true)} />
    </div>
  );
}
