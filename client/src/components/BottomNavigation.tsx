import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function BottomNavigation() {
  const { items, total, itemCount, clearCart } = useCart();
  const { token } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order placed!",
        description: "Your order has been placed successfully.",
      });
      clearCart();
    },
    onError: () => {
      toast({
        title: "Order failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCheckout = () => {
    if (items.length === 0) return;

    createOrderMutation.mutate({
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      total: total.toFixed(2),
      status: 'pending'
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      {itemCount > 0 && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span 
                className="text-lg font-bold text-primary" 
                data-testid="text-cart-total"
              >
                ${total.toFixed(2)}
              </span>
            </div>
            <span 
              className="text-sm text-muted-foreground" 
              data-testid="text-cart-items"
            >
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          
          <Button 
            className="w-full py-4 rounded-xl font-heading font-semibold text-lg"
            onClick={handleCheckout}
            disabled={createOrderMutation.isPending}
            data-testid="button-checkout"
          >
            {createOrderMutation.isPending ? "Processing..." : "Proceed to Checkout"}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex">
        <Link href="/" className="flex-1">
          <button 
            className={`w-full p-4 flex flex-col items-center space-y-1 ${
              location === '/' 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="nav-menu"
          >
            <i className="fas fa-utensils text-lg"></i>
            <span className="text-xs font-medium">Menu</span>
          </button>
        </Link>
        
        <Link href="/about" className="flex-1">
          <button 
            className={`w-full p-4 flex flex-col items-center space-y-1 ${
              location === '/about' 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="nav-about"
          >
            <i className="fas fa-info-circle text-lg"></i>
            <span className="text-xs font-medium">About Us</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
