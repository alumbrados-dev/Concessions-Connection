import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Item, LocalEvent, Ad } from "@shared/schema";
import { realtimeConnection } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/use-device";
import { useAISettings } from "@/hooks/use-ai-settings";
import Header from "@/components/Header";
import LocationBanner from "@/components/LocationBanner";
import MenuItems from "@/components/MenuItems";
import LocalEvents from "@/components/LocalEvents";
import VoiceAssistant from "@/components/VoiceAssistant";
import FloatingAIButton from "@/components/FloatingAIButton";
import ShareModal from "@/components/ShareModal";
import QRCodeModal from "@/components/QRCodeModal";
import AppInfoModal from "@/components/AppInfoModal";

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAppModal, setShowAppModal] = useState(false);
  const { toast } = useToast();
  const { isMobile, screenWidth } = useDevice();
  const { isAIEnabled } = useAISettings();

  const { data: items = [], refetch: refetchItems } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: events = [] } = useQuery<LocalEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: ads = [] } = useQuery<Ad[]>({
    queryKey: ["/api/ads"],
  });

  // Fetch truck location for Hours & Location section
  const { data: truckLocation } = useQuery({
    queryKey: ['/api/truck-location'],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: any };

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

  const handleScrollToAbout = () => {
    const aboutSection = document.querySelector('[data-testid="text-about-title"]');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onShowAbout={handleScrollToAbout}
        onShare={() => setShowShareModal(true)}
        onShowQR={() => setShowQRModal(true)}
        onShowApp={() => setShowAppModal(true)}
      />
      
      {currentEvent && (
        <LocationBanner 
          message={`We're at ${currentEvent.eventName} today! 🎉`}
        />
      )}

      {/* Hero Section - Enhanced and Centered */}
      <section className="relative w-full bg-gradient-to-b from-background via-background/95 to-muted/20 py-8">
        {/* Connect 4 box - positioned absolutely on top left */}
        <div className="absolute top-6 left-6 z-20">
          <img 
            src={connect4Image}
            alt="Connect 4"
            className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} object-contain drop-shadow-md`}
            data-testid="img-connect4"
          />
        </div>
        
        {/* Hero Banner Container - Centered and Prominent */}
        <div className="relative w-full flex flex-col items-center justify-center space-y-6 px-4 min-h-[45vh] md:min-h-[55vh]">
          {/* Main Concessions Connection Logo - Prominently Centered */}
          <div className="relative flex justify-center items-center w-full">
            <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20 transform hover:scale-105 transition-all duration-300">
              <img 
                src={getConcessionsImage()}
                alt="Concessions Connection - Family Food Truck"
                className={`${isMobile ? 'max-w-[320px]' : 'max-w-[550px]'} w-full h-auto object-contain drop-shadow-lg`}
                data-testid="img-hero-concessions"
              />
              {/* Subtle glow effect behind logo */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-xl -z-10"></div>
            </div>
          </div>
          
          {/* Linking Banner - Enhanced positioning below main logo */}
          <div className="relative w-full flex justify-center">
            <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-6 shadow-lg border border-white/10 transform hover:scale-102 transition-all duration-300">
              <img 
                src={getLinkingImage()}
                alt="Linking families through tastes and experiences"
                className={`${isMobile ? 'max-w-[280px]' : 'max-w-[450px]'} w-full h-auto object-contain drop-shadow-md`}
                data-testid="img-linking-banner"
              />
            </div>
          </div>
        </div>
        
        {/* Decorative background elements for visual appeal */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-gradient-radial from-primary/8 via-transparent to-transparent rounded-full blur-3xl -z-10"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/5 via-transparent to-primary/5 -z-20"></div>
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
              <div className="space-y-4">
                {/* Operating Hours */}
                <div>
                  <p className="text-lg font-medium">Tuesday - Sunday, 11 AM - 8 PM</p>
                  <p className="text-sm text-muted-foreground">Closed Mondays</p>
                </div>
                
                {/* Current Location Status */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 flex items-center" data-testid="text-location-status">
                    <div className={`w-2 h-2 rounded-full mr-2 ${truckLocation?.gpsEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    Current Location
                  </h4>
                  {truckLocation?.gpsEnabled ? (
                    <div className="space-y-2">
                      {truckLocation.address ? (
                        <p className="text-sm font-medium" data-testid="text-current-address">
                          📍 {truckLocation.address}
                        </p>
                      ) : (
                        truckLocation.latitude && truckLocation.longitude ? (
                          <p className="text-sm font-medium" data-testid="text-current-coordinates">
                            📍 {truckLocation.latitude.toFixed(4)}, {truckLocation.longitude.toFixed(4)}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            GPS enabled, locating truck...
                          </p>
                        )
                      )}
                      {truckLocation.serviceRadius && (
                        <p className="text-xs text-muted-foreground">
                          Service radius: {truckLocation.serviceRadius} miles
                        </p>
                      )}
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          🚚 Currently Open
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        📍 Location sharing is currently disabled
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Check our social media for today's location and specials!
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Find Us */}
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Catch our truck as we tour local events, neighborhoods, and community celebrations.
                  </p>
                  {truckLocation?.gpsEnabled && truckLocation.latitude && truckLocation.longitude && (
                    <div className="mt-3">
                      <button 
                        className="text-sm text-primary hover:underline font-medium"
                        onClick={() => {
                          const url = `https://www.google.com/maps?q=${truckLocation.latitude},${truckLocation.longitude}`;
                          window.open(url, '_blank');
                        }}
                        data-testid="button-view-map"
                      >
                        📍 View on Google Maps
                      </button>
                    </div>
                  )}
                </div>
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
      
      {/* Floating AI Button - Only show when AI is enabled */}
      {isAIEnabled && (
        <FloatingAIButton onActivate={() => setShowVoiceAssistant(true)} />
      )}
      
      {/* Modal Components */}
      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
      />
      <QRCodeModal 
        isOpen={showQRModal} 
        onClose={() => setShowQRModal(false)} 
      />
      <AppInfoModal 
        isOpen={showAppModal} 
        onClose={() => setShowAppModal(false)} 
      />
    </div>
  );
}
