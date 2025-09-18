import { Item } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { useDevice } from "@/hooks/use-device";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Import category border images
import startersImageMobile from "@assets/Starters-and-snacks_mobile_1758151930556.png";
import startersImageWeb from "@assets/Starters-and-snacks_web_1758151930556.png";
import grillImageMobile from "@assets/Off_the_Grill_mobile_1758151930555.png";
import grillImageWeb from "@assets/Off_the_Grill_web_1758151930555.png";
import refreshmentsImageMobile from "@assets/Refreshments_mobile_1758151930555.png";
import refreshmentsImageWeb from "@assets/Refreshments_web_1758151930556.png";
import extrasImageMobile from "@assets/Extras_mobile_1758151930554.png";
import extrasImageWeb from "@assets/Extras_web_1758151930554.png";

interface MenuItemsProps {
  items: Item[];
}

export default function MenuItems({ items }: MenuItemsProps) {
  const { items: cartItems, updateQuantity, addItem } = useCart();
  const { isMobile, screenWidth } = useDevice();

  const getCartQuantity = (itemId: string) => {
    const cartItem = cartItems.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleQuantityChange = (item: Item, delta: number) => {
    const currentQuantity = getCartQuantity(item.id);
    const newQuantity = Math.max(0, currentQuantity + delta);
    
    if (newQuantity === 0) {
      updateQuantity(item.id, 0); // This will remove the item
    } else if (currentQuantity === 0) {
      // Item is not in cart yet, so add it
      addItem(item, newQuantity);
    } else {
      // Item exists in cart, update quantity
      updateQuantity(item.id, newQuantity);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) {
      return { color: "destructive", text: "Out of stock", dot: "bg-red-400" };
    } else if (stock <= 3) {
      return { color: "secondary", text: "Low stock", dot: "bg-orange-400" };
    }
    return { color: "default", text: `${stock} left`, dot: "bg-green-400" };
  };

  // Category configuration with border images
  const categoryConfig = {
    starters: {
      name: "Starters & Snacks",
      borderImage: isMobile ? startersImageMobile : startersImageWeb,
    },
    grill: {
      name: "Off the Grill", 
      borderImage: isMobile ? grillImageMobile : grillImageWeb,
    },
    drinks: {
      name: "Refreshments",
      borderImage: isMobile ? refreshmentsImageMobile : refreshmentsImageWeb,
    },
    extras: {
      name: "Extras",
      borderImage: isMobile ? extrasImageMobile : extrasImageWeb,
    },
  };

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  // Determine grid columns based on screen size
  const getGridCols = () => {
    if (isMobile) return 'grid-cols-2';
    return screenWidth >= 1280 ? 'grid-cols-4' : 'grid-cols-3';
  };

  if (items.length === 0) {
    return (
      <div className="p-8 text-center" data-testid="empty-menu">
        <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
          <i className="fas fa-utensils text-muted-foreground text-lg"></i>
        </div>
        <h3 className="text-lg font-semibold mb-2">No items available</h3>
        <p className="text-muted-foreground">Check back later for our delicious menu items!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(categoryConfig).map(([categoryId, config]) => {
        const categoryItems = itemsByCategory[categoryId] || [];
        
        if (categoryItems.length === 0) return null;
        
        return (
          <section key={categoryId} className="space-y-4" data-testid={`section-${categoryId}`}>
            {/* Category Border Image */}
            <div className="w-full flex justify-center">
              <img 
                src={config.borderImage}
                alt={config.name}
                className="w-full max-w-4xl h-auto object-contain"
                data-testid={`img-border-${categoryId}`}
              />
            </div>
            
            {/* Category Items Grid */}
            <div className={`px-4 grid ${getGridCols()} gap-4`}>
              {categoryItems.map(item => {
                const stockStatus = getStockStatus(item.stock);
                const quantity = getCartQuantity(item.id);
                
                return (
                  <div 
                    key={item.id} 
                    className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden"
                    data-testid={`card-item-${item.id}`}
                  >
                    {/* Item Image */}
                    {item.imageUrl && (
                      <div className="w-full h-32 overflow-hidden">
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                          data-testid={`img-item-${item.id}`}
                        />
                      </div>
                    )}
                    
                    {/* Item Content */}
                    <div className="p-3 space-y-2">
                      <div className="text-center">
                        <h3 
                          className="font-heading font-semibold text-base leading-tight" 
                          data-testid={`text-item-name-${item.id}`}
                        >
                          {item.name}
                        </h3>
                        <span 
                          className="text-lg font-bold text-orange-600 dark:text-orange-500" 
                          data-testid={`text-item-price-${item.id}`}
                        >
                          ${item.price}
                        </span>
                      </div>
                      
                      {item.description && (
                        <p 
                          className="text-xs text-muted-foreground text-center line-clamp-2" 
                          data-testid={`text-item-description-${item.id}`}
                        >
                          {item.description}
                        </p>
                      )}
                      
                      {/* Stock Status */}
                      <div className="flex justify-center">
                        <Badge 
                          variant={stockStatus.color as any}
                          className="flex items-center space-x-1 text-xs"
                          data-testid={`badge-stock-${item.id}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${stockStatus.dot}`}></div>
                          <span>{stockStatus.text}</span>
                        </Badge>
                      </div>
                      
                      {!item.available && (
                        <div className="flex justify-center">
                          <Badge 
                            variant="secondary"
                            className="text-xs"
                            data-testid={`badge-unavailable-${item.id}`}
                          >
                            Currently Unavailable
                          </Badge>
                        </div>
                      )}
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-7 h-7 rounded-full p-0"
                          onClick={() => handleQuantityChange(item, -1)}
                          disabled={quantity <= 0}
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <i className="fas fa-minus text-xs"></i>
                        </Button>
                        
                        <Badge 
                          variant="outline"
                          className="w-7 h-5 flex items-center justify-center font-medium text-xs" 
                          data-testid={`text-quantity-${item.id}`}
                        >
                          {quantity}
                        </Badge>
                        
                        <Button
                          size="sm"
                          className="w-7 h-7 rounded-full p-0"
                          onClick={() => handleQuantityChange(item, 1)}
                          disabled={item.stock <= 0 || !item.available}
                          data-testid={`button-increase-${item.id}`}
                        >
                          <i className="fas fa-plus text-xs"></i>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
