import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import PaymentForm from "./PaymentForm";
import DeliveryOptions from "./DeliveryOptions";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";

export default function BottomNavigation() {
  const { items, total, subtotal, taxAmount, itemCount, clearCart } = useCart();
  const { token } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [showCheckoutFlow, setShowCheckoutFlow] = useState(false);
  const [showDeliveryOptions, setShowDeliveryOptions] = useState(false);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState("pickup");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

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
    onSuccess: (order) => {
      setCurrentOrder(order);
      
      // Handle different delivery methods
      if (selectedDeliveryMethod === "pickup") {
        setShowPaymentForm(true);
      } else {
        // For external platforms, redirect to their ordering page
        handleExternalPlatformRedirect(order);
      }
    },
    onError: () => {
      toast({
        title: "Order failed",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Start checkout flow by showing delivery options
  const handleStartCheckout = () => {
    if (items.length === 0) return;
    setShowCheckoutFlow(true);
    setShowDeliveryOptions(true);
  };

  // Continue with order creation after delivery method is selected
  const handleProceedToOrder = () => {
    createOrderMutation.mutate({
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      total: total.toFixed(2),
      paymentAmount: total.toFixed(2),
      status: 'pending',
      paymentStatus: 'pending',
      deliveryMethod: selectedDeliveryMethod,
      deliveryData: selectedDeliveryMethod !== "pickup" ? {
        platform: selectedDeliveryMethod,
        items: items.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total: total.toFixed(2)
      } : null
    });
  };

  // Handle redirect to external platforms
  const handleExternalPlatformRedirect = (order: any) => {
    const platformUrls = {
      grubhub: "https://www.grubhub.com/",
      doordash: "https://www.doordash.com/"
    };

    // Create a URL with order context (in real implementation, you'd have specific restaurant URLs)
    const platformUrl = platformUrls[selectedDeliveryMethod as keyof typeof platformUrls];
    
    if (platformUrl) {
      // Store order data for potential reordering
      localStorage.setItem('pendingExternalOrder', JSON.stringify({
        orderId: order.id,
        items: items,
        total: total,
        platform: selectedDeliveryMethod,
        timestamp: new Date().toISOString()
      }));

      toast({
        title: `Redirecting to ${selectedDeliveryMethod === "grubhub" ? "Grubhub" : "DoorDash"}`,
        description: "Your order details have been saved. Complete your order on their platform.",
        duration: 3000,
      });

      // Close modals and clear cart
      setTimeout(() => {
        setShowCheckoutFlow(false);
        setShowDeliveryOptions(false);
        clearCart();
        window.open(platformUrl, '_blank');
      }, 1000);
    }
  };

  const handlePaymentSuccess = (payment: any) => {
    setPaymentSuccess(true);
    
    toast({
      title: "Payment Successful!",
      description: `Your order has been paid and confirmed.`,
    });

    // Clear cart and close modal after a brief delay
    setTimeout(() => {
      clearCart();
      setShowPaymentForm(false);
      setCurrentOrder(null);
      setPaymentSuccess(false);
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setCurrentOrder(null);
    
    // Note: Order is created but not paid - in a real app, you might want to 
    // cancel/delete the unpaid order or set a timeout for payment
    toast({
      title: "Payment Cancelled",
      description: "Your order is saved but not yet paid.",
    });
  };

  // Handle closing the checkout flow
  const handleCloseCheckout = () => {
    setShowCheckoutFlow(false);
    setShowDeliveryOptions(false);
    setShowPaymentForm(false);
    setCurrentOrder(null);
    setPaymentSuccess(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        {itemCount > 0 && (
          <div className="p-4 border-b border-border">
            <div className="space-y-1 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal:</span>
                <span className="text-sm font-medium" data-testid="text-subtotal-amount">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tax:</span>
                <span className="text-sm font-medium" data-testid="text-tax-amount">
                  ${taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-sm font-semibold">Total:</span>
                <span 
                  className="text-lg font-bold text-primary" 
                  data-testid="text-cart-total"
                >
                  ${total.toFixed(2)}
                </span>
              </div>
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
              onClick={handleStartCheckout}
              disabled={createOrderMutation.isPending}
              data-testid="button-checkout"
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Order...
                </>
              ) : (
                "Choose Delivery & Checkout"
              )}
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

      {/* Delivery Options Modal */}
      <Dialog open={showDeliveryOptions} onOpenChange={handleCloseCheckout}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Your Delivery Method</DialogTitle>
          </DialogHeader>
          
          <DeliveryOptions
            selectedMethod={selectedDeliveryMethod}
            onMethodChange={setSelectedDeliveryMethod}
            className="border-0 shadow-none"
          />
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCloseCheckout}
              className="flex-1"
              data-testid="button-cancel-delivery"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Button>
            <Button
              onClick={handleProceedToOrder}
              disabled={createOrderMutation.isPending}
              className="flex-1"
              data-testid="button-proceed-order"
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                selectedDeliveryMethod === "pickup" ? "Proceed to Payment" : `Order via ${selectedDeliveryMethod === "grubhub" ? "Grubhub" : "DoorDash"}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentSuccess ? "Payment Successful!" : "Complete Your Order"}
            </DialogTitle>
          </DialogHeader>
          
          {paymentSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Thank you for your order!</p>
              <p className="text-muted-foreground">
                Your payment has been processed successfully.
              </p>
            </div>
          ) : (
            currentOrder && (
              <PaymentForm
                amount={parseFloat(currentOrder.total)}
                orderId={currentOrder.id}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handlePaymentCancel}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
