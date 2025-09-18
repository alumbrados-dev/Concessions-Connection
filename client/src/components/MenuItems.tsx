import { Item } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { useDevice } from "@/hooks/use-device";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  // Calculate tax amount for an item
  const calculateTaxAmount = (price: string, taxRate: string = "0.06") => {
    const itemPrice = parseFloat(price);
    const rate = parseFloat(taxRate);
    return (itemPrice * rate).toFixed(2);
  };

  // Format tax rate as percentage
  const formatTaxRate = (taxRate: string = "0.06") => {
    const rate = parseFloat(taxRate) * 100;
    return rate.toFixed(rate % 1 === 0 ? 0 : 1);
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
      <main className="p-8 text-center" data-testid="empty-menu" role="main" aria-live="polite">
        <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center" aria-hidden="true">
          <i className="fas fa-utensils text-muted-foreground text-lg"></i>
        </div>
        <h1 className="text-lg font-semibold mb-2">No Menu Items Available</h1>
        <p className="text-muted-foreground">Check back later for our delicious menu items!</p>
      </main>
    );
  }

  return (
    <main className="space-y-8" role="main" id="main-content">
      {Object.entries(categoryConfig).map(([categoryId, config]) => {
        const categoryItems = itemsByCategory[categoryId] || [];
        
        if (categoryItems.length === 0) return null;
        
        return (
          <section 
            key={categoryId} 
            className="space-y-4" 
            data-testid={`section-${categoryId}`}
            aria-labelledby={`category-heading-${categoryId}`}
            role="region"
          >
            {/* Category Border Image with accessible heading */}
            <div className="w-full flex justify-center relative">
              <img 
                src={config.borderImage}
                alt={`${config.name} category banner featuring appetizing ${categoryId === 'starters' ? 'appetizers and snacks' : categoryId === 'grill' ? 'grilled items' : categoryId === 'drinks' ? 'beverages' : 'additional items'}`}
                className="w-full max-w-4xl h-auto object-contain"
                data-testid={`img-border-${categoryId}`}
                role="img"
              />
              <h2 
                id={`category-heading-${categoryId}`}
                className="sr-only"
                aria-level="2"
              >
                {config.name} Menu Items
              </h2>
            </div>
            
            {/* Category Items Grid */}
            <div 
              className={`px-4 grid ${getGridCols()} gap-4`}
              role="grid"
              aria-label={`${config.name} menu items`}
            >
              {categoryItems.map(item => {
                const stockStatus = getStockStatus(item.stock);
                const quantity = getCartQuantity(item.id);
                
                return (
                  <article 
                    key={item.id} 
                    className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                    data-testid={`card-item-${item.id}`}
                    role="gridcell"
                    aria-labelledby={`item-name-${item.id}`}
                    aria-describedby={`item-details-${item.id}`}
                  >
                    {/* Item Image */}
                    {item.imageUrl && (
                      <div className="w-full h-32 overflow-hidden">
                        <img 
                          src={item.imageUrl} 
                          alt={`${item.name} - ${item.description || 'delicious menu item'}`}
                          className="w-full h-full object-cover"
                          data-testid={`img-item-${item.id}`}
                          role="img"
                        />
                      </div>
                    )}
                    
                    {/* Item Content */}
                    <div className="p-3 space-y-2">
                      <div className="text-center">
                        <h3 
                          id={`item-name-${item.id}`}
                          className="font-heading font-semibold text-base leading-tight" 
                          data-testid={`text-item-name-${item.id}`}
                          role="heading"
                          aria-level="3"
                        >
                          {item.name}
                        </h3>
                        <div className="relative inline-flex items-center space-x-2">
                          <span 
                            className="text-lg font-bold text-orange-600 dark:text-orange-500" 
                            data-testid={`text-item-price-${item.id}`}
                            aria-label={`Price: $${item.price}`}
                          >
                            ${item.price}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-0 h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 ml-1 focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
                                data-testid={`button-tax-tooltip-${item.id}`}
                                aria-label={`Tax information for ${item.name}. Tax rate: ${formatTaxRate(item.taxRate || "0.06")}%`}
                                aria-describedby={`tax-tooltip-${item.id}`}
                              >
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold" aria-hidden="true">?</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs" id={`tax-tooltip-${item.id}`} role="tooltip">
                              <div className="space-y-2">
                                <p className="font-semibold text-sm">Sales Tax Information</p>
                                <div className="space-y-1 text-xs">
                                  <p><strong>Tax Rate:</strong> {formatTaxRate(item.taxRate || "0.06")}%</p>
                                  <p><strong>Tax Amount:</strong> ${calculateTaxAmount(item.price, item.taxRate)}</p>
                                  <p><strong>Total with Tax:</strong> ${(parseFloat(item.price) + parseFloat(calculateTaxAmount(item.price, item.taxRate))).toFixed(2)}</p>
                                </div>
                                <div className="pt-1 border-t border-border">
                                  <p className="text-xs text-muted-foreground">
                                    {item.taxRate && parseFloat(item.taxRate) !== 0.06 
                                      ? `Custom tax rate for this item` 
                                      : `Maryland state sales tax (6%) applies to entire order`}
                                  </p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      
                      <div id={`item-details-${item.id}`}>
                        {item.description && (
                          <p 
                            className="text-xs text-muted-foreground text-center line-clamp-2" 
                            data-testid={`text-item-description-${item.id}`}
                            aria-label={`Description: ${item.description}`}
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
                            aria-label={`Stock status: ${stockStatus.text}`}
                            role="status"
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${stockStatus.dot}`} aria-hidden="true"></div>
                            <span>{stockStatus.text}</span>
                          </Badge>
                        </div>
                      </div>
                      
                      {!item.available && (
                        <div className="flex justify-center">
                          <Badge 
                            variant="secondary"
                            className="text-xs"
                            data-testid={`badge-unavailable-${item.id}`}
                            aria-label={`${item.name} is currently unavailable`}
                            role="status"
                          >
                            Currently Unavailable
                          </Badge>
                        </div>
                      )}
                      
                      {/* Quantity Controls */}
                      <div 
                        className="flex items-center justify-center space-x-2"
                        role="group"
                        aria-labelledby={`quantity-label-${item.id}`}
                        aria-describedby={`quantity-description-${item.id}`}
                      >
                        <span id={`quantity-label-${item.id}`} className="sr-only">
                          Quantity controls for {item.name}
                        </span>
                        <span id={`quantity-description-${item.id}`} className="sr-only">
                          Current quantity: {quantity}. Use plus and minus buttons to adjust.
                        </span>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-10 h-10 rounded-full p-0 focus:ring-2 focus:ring-primary focus:ring-offset-1"
                          onClick={() => handleQuantityChange(item, -1)}
                          disabled={quantity <= 0}
                          data-testid={`button-decrease-${item.id}`}
                          aria-label={`Decrease quantity of ${item.name}. Current quantity: ${quantity}`}
                        >
                          <i className="fas fa-minus text-xs" aria-hidden="true"></i>
                        </Button>
                        
                        <div 
                          className="w-10 h-8 flex items-center justify-center font-medium text-sm border border-border rounded bg-background" 
                          data-testid={`text-quantity-${item.id}`}
                          aria-label={`Quantity: ${quantity}`}
                          aria-live="polite"
                          role="status"
                        >
                          {quantity}
                        </div>
                        
                        <Button
                          size="sm"
                          className="w-10 h-10 rounded-full p-0 focus:ring-2 focus:ring-primary focus:ring-offset-1"
                          onClick={() => handleQuantityChange(item, 1)}
                          disabled={item.stock <= 0 || !item.available}
                          data-testid={`button-increase-${item.id}`}
                          aria-label={`Add ${item.name} to cart. ${item.stock <= 0 ? 'Out of stock' : !item.available ? 'Currently unavailable' : `${item.stock} available. Price: $${item.price}`}`}
                        >
                          <i className="fas fa-plus text-xs" aria-hidden="true"></i>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
