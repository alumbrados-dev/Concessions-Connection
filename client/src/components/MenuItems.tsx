import { Item } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MenuItemsProps {
  items: Item[];
}

export default function MenuItems({ items }: MenuItemsProps) {
  const { items: cartItems, updateQuantity, addItem } = useCart();

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
    <div className="p-4 space-y-4">
      {items.map(item => {
        const stockStatus = getStockStatus(item.stock);
        const quantity = getCartQuantity(item.id);
        
        return (
          <div 
            key={item.id} 
            className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden"
            data-testid={`card-item-${item.id}`}
          >
            <div className="flex">
              {item.imageUrl && (
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-24 h-24 object-cover"
                  data-testid={`img-item-${item.id}`}
                />
              )}
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 
                    className="font-heading font-semibold text-lg" 
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
                    className="text-sm text-muted-foreground mb-3" 
                    data-testid={`text-item-description-${item.id}`}
                  >
                    {item.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={stockStatus.color as any}
                      className="flex items-center space-x-1"
                      data-testid={`badge-stock-${item.id}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${stockStatus.dot}`}></div>
                      <span>{stockStatus.text}</span>
                    </Badge>
                    
                    {!item.available && (
                      <Badge 
                        variant="secondary"
                        className="text-xs"
                        data-testid={`badge-unavailable-${item.id}`}
                      >
                        Currently Unavailable
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-8 h-8 rounded-full p-0"
                      onClick={() => handleQuantityChange(item, -1)}
                      disabled={quantity <= 0}
                      data-testid={`button-decrease-${item.id}`}
                    >
                      <i className="fas fa-minus text-xs"></i>
                    </Button>
                    
                    <Badge 
                      variant="outline"
                      className="w-8 h-6 flex items-center justify-center font-medium" 
                      data-testid={`text-quantity-${item.id}`}
                    >
                      {quantity}
                    </Badge>
                    
                    <Button
                      size="sm"
                      className="w-8 h-8 rounded-full p-0"
                      onClick={() => handleQuantityChange(item, 1)}
                      disabled={item.stock <= 0 || !item.available}
                      data-testid={`button-increase-${item.id}`}
                    >
                      <i className="fas fa-plus text-xs"></i>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
