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
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40" role="contentinfo" aria-label="Cart summary and navigation">
        {itemCount > 0 && (
          <section 
            className="p-4 border-b border-border"
            aria-labelledby="cart-summary-title"
            aria-live="polite"
            aria-atomic="true"
          >
            <h2 id="cart-summary-title" className="sr-only">Order Summary</h2>
            <div className="space-y-1 mb-2" role="table" aria-label="Order pricing breakdown">
              <div className="flex items-center justify-between" role="row">
                <span className="text-sm text-muted-foreground" role="rowheader">Subtotal:</span>
                <span className="text-sm font-medium" data-testid="text-subtotal-amount" role="cell" aria-label="Subtotal amount">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between" role="row">
                <span className="text-sm text-muted-foreground" role="rowheader">Tax:</span>
                <span className="text-sm font-medium" data-testid="text-tax-amount" role="cell" aria-label="Tax amount">
                  ${taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border" role="row">
                <span className="text-sm font-semibold" role="rowheader">Total:</span>
                <span 
                  className="text-lg font-bold text-primary" 
                  data-testid="text-cart-total"
                  role="cell"
                  aria-label={`Total amount: ${total.toFixed(2)} dollars`}
                >
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="mb-2">
              <span 
                className="text-sm text-muted-foreground" 
                data-testid="text-cart-items"
                aria-label={`Cart contains ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
              >
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            
            <Button 
              className="w-full py-4 rounded-xl font-heading font-semibold text-lg min-h-[44px] focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={handleStartCheckout}
              disabled={createOrderMutation.isPending}
              data-testid="button-checkout"
              aria-label={createOrderMutation.isPending ? "Creating order, please wait" : `Checkout ${itemCount} items totaling ${total.toFixed(2)} dollars`}
              aria-describedby="cart-summary-title"
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  <span aria-live="polite">Creating Order...</span>
                </>
              ) : (
                "Choose Delivery & Checkout"
              )}
            </Button>
          </section>
        )}

        {/* Navigation */}
        <nav className="flex" role="navigation" aria-label="Main navigation">
          <Link href="/" className="flex-1">
            <button 
              className={`w-full p-4 flex flex-col items-center space-y-1 min-h-[44px] focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none ${
                location === '/' 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="nav-menu"
              aria-label="Menu page"
              aria-current={location === '/' ? 'page' : undefined}
            >
              <i className="fas fa-utensils text-lg" aria-hidden="true"></i>
              <span className="text-xs font-medium">Menu</span>
            </button>
          </Link>
          
          <Link href="/about" className="flex-1">
            <button 
              className={`w-full p-4 flex flex-col items-center space-y-1 min-h-[44px] focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none ${
                location === '/about' 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="nav-about"
              aria-label="About us page"
              aria-current={location === '/about' ? 'page' : undefined}
            >
              <i className="fas fa-info-circle text-lg" aria-hidden="true"></i>
              <span className="text-xs font-medium">About Us</span>
            </button>
          </Link>
        </nav>
      </div>

      {/* Delivery Options Modal */}
      <Dialog open={showDeliveryOptions} onOpenChange={handleCloseCheckout}>
        <DialogContent className="sm:max-w-lg" aria-describedby="delivery-instructions">
          <DialogHeader>
            <DialogTitle>Choose Your Delivery Method</DialogTitle>
          </DialogHeader>
          
          <p id="delivery-instructions" className="sr-only">
            Select how you would like to receive your order. Choose pickup for in-person collection, or select a delivery platform to complete your order through their service.
          </p>
          
          <DeliveryOptions
            selectedMethod={selectedDeliveryMethod}
            onMethodChange={setSelectedDeliveryMethod}
            className="border-0 shadow-none"
          />
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCloseCheckout}
              className="flex-1 focus:ring-2 focus:ring-primary focus:ring-offset-2"
              data-testid="button-cancel-delivery"
              aria-label="Cancel delivery selection and return to cart"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Back to Cart
            </Button>
            <Button
              onClick={handleProceedToOrder}
              disabled={createOrderMutation.isPending}
              className="flex-1 focus:ring-2 focus:ring-primary focus:ring-offset-2"
              data-testid="button-proceed-order"
              aria-label={
                createOrderMutation.isPending 
                  ? "Processing order, please wait" 
                  : selectedDeliveryMethod === "pickup" 
                    ? "Proceed to payment for pickup order"
                    : `Continue to order via ${selectedDeliveryMethod === "grubhub" ? "Grubhub" : "DoorDash"}`
              }
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  <span aria-live="polite">Processing...</span>
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
        <DialogContent className="sm:max-w-md" aria-describedby={paymentSuccess ? "payment-success-message" : "payment-instructions"}>
          <DialogHeader>
            <DialogTitle>
              {paymentSuccess ? "Payment Successful!" : "Complete Your Order"}
            </DialogTitle>
          </DialogHeader>
          
          {paymentSuccess ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
              <p className="text-lg font-semibold mb-2">Thank you for your order!</p>
              <p id="payment-success-message" className="text-muted-foreground">
                Your payment has been processed successfully. This dialog will close automatically.
              </p>
            </div>
          ) : (
            <div>
              <p id="payment-instructions" className="sr-only">
                Complete your payment to finalize your order. Choose from the available payment methods below.
              </p>
              {currentOrder && (
                <PaymentForm
                  amount={parseFloat(currentOrder.total)}
                  orderId={currentOrder.id}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={handlePaymentCancel}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
