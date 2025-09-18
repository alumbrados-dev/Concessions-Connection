import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CreditCard, Smartphone, Loader2 } from "lucide-react";

interface PaymentFormProps {
  amount: number;
  orderId: string;
  onSuccess: (payment: any) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface SquarePaymentForm {
  card?: any;
  applePay?: any;
  googlePay?: any;
  requestCardNonce(): void;
  requestApplePayNonce(): void;
  requestGooglePayNonce(): void;
  destroy(): void;
}

declare global {
  interface Window {
    Square?: any;
    SqPaymentForm?: any;
  }
}

export default function PaymentForm({ amount, orderId, onSuccess, onError, onCancel }: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);
  const [paymentForm, setPaymentForm] = useState<SquarePaymentForm | null>(null);
  
  const formRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { token } = useAuth();

  // Initialize Square Payment Form
  useEffect(() => {
    const initializeSquare = async () => {
      try {
        // Load Square Web SDK with environment-aware URL
        if (!window.Square) {
          const script = document.createElement('script');
          // Use production URL for production environment, sandbox for development
          const isProduction = import.meta.env.PROD || import.meta.env.VITE_NODE_ENV === 'production';
          script.src = isProduction 
            ? 'https://web.squarecdn.com/v1/square.js'  // Production Square Web SDK
            : 'https://sandbox.web.squarecdn.com/v1/square.js';  // Sandbox Square Web SDK
          script.async = true;
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        if (!window.Square) {
          throw new Error('Square SDK failed to load');
        }

        // Initialize payments - require proper environment variables
        const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
        
        if (!applicationId) {
          throw new Error('Square Application ID not configured. Please set VITE_SQUARE_APPLICATION_ID environment variable.');
        }
        
        if (!locationId) {
          throw new Error('Square Location ID not configured. Please set VITE_SQUARE_LOCATION_ID environment variable.');
        }
        
        const payments = window.Square.payments(applicationId, locationId);

        // Check Apple Pay availability
        const applePay = await payments.applePay();
        if (applePay) {
          const applePayStatus = await applePay.checkAvailability();
          setApplePayAvailable(applePayStatus.isAvailable);
        }

        // Check Google Pay availability
        const googlePay = await payments.googlePay();
        if (googlePay) {
          const googlePayStatus = await googlePay.checkAvailability();
          setGooglePayAvailable(googlePayStatus.isAvailable);
        }

        // Initialize card payment form
        const card = await payments.card();
        await card.attach('#card-container');

        // Create payment form object
        const formInstance = {
          card,
          applePay: applePayAvailable ? applePay : null,
          googlePay: googlePayAvailable ? googlePay : null,
          requestCardNonce: async () => {
            await handlePayment(card);
          },
          requestApplePayNonce: async () => {
            // Legacy handler - wallet buttons now handle their own flows
            console.warn('Legacy Apple Pay handler called. Use wallet button instead.');
          },
          requestGooglePayNonce: async () => {
            // Legacy handler - wallet buttons now handle their own flows
            console.warn('Legacy Google Pay handler called. Use wallet button instead.');
          },
          destroy: () => {
            card.destroy();
          }
        };

        setPaymentForm(formInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('Square initialization error:', err);
        setError('Failed to initialize payment form');
        setIsLoading(false);
      }
    };

    initializeSquare();

    return () => {
      if (paymentForm) {
        paymentForm.destroy();
      }
    };
  }, []);

  const handlePayment = async (paymentMethod: any, preTokenizedResult?: any) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // Get payment token from Square - either pre-tokenized (wallets) or tokenize now (cards)
      const tokenResult = preTokenizedResult || await paymentMethod.tokenize();
      
      if (tokenResult.status === 'OK') {
        const { token: sourceId, details } = tokenResult;
        
        // Implement proper 3DS verification using verifyBuyer
        let verificationToken;
        try {
          // Get payments instance for verifyBuyer
          const payments = window.Square.payments(
            import.meta.env.VITE_SQUARE_APPLICATION_ID!,
            import.meta.env.VITE_SQUARE_LOCATION_ID!
          );
          
          const verificationDetails = {
            amount: amount.toString(),
            billingContact: {
              givenName: 'Customer', // In production, get from user data
              familyName: 'User'
            },
            currencyCode: 'USD',
            intent: 'CHARGE'
          };
          
          const verificationResult = await payments.verifyBuyer(sourceId, verificationDetails);
          if (verificationResult.token) {
            verificationToken = verificationResult.token;
          }
        } catch (verificationError) {
          console.log('3DS verification skipped or failed:', verificationError);
          // Continue without verification token - server will handle SCA requirements
        }
        
        // Submit payment to backend (amount removed for security)
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sourceId,
            verificationToken,
            currency: 'USD',
            orderId
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast({
            title: "Payment Successful!",
            description: `Your payment of $${amount.toFixed(2)} has been processed.`,
          });
          onSuccess(data);
        } else {
          // Handle specific error cases
          if (data.requiresVerification) {
            setError('Additional verification required. Please try again.');
          } else {
            setError(data.error || 'Payment failed');
          }
          onError(data.error || 'Payment failed');
        }
      } else {
        const errorMessage = tokenResult.errors?.[0]?.message || 'Payment tokenization failed';
        setError(errorMessage);
        onError(errorMessage);
      }
    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = 'Payment processing failed. Please try again.';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading payment form...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Payment
        </CardTitle>
        <CardDescription>
          Total: <span className="font-semibold text-lg">${amount.toFixed(2)}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Digital Wallet Options */}
        {(applePayAvailable || googlePayAvailable) && (
          <>
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Quick Pay Options</p>
              
              {applePayAvailable && (
                <Button
                  onClick={async () => {
                    if (!paymentForm?.applePay) return;
                    
                    // Implement proper Apple Pay payment request with correct Square Web SDK flow
                    const paymentRequest = {
                      countryCode: 'US',
                      currencyCode: 'USD',
                      total: {
                        label: 'Total',
                        amount: amount.toString(),
                        pending: false
                      },
                      displayItems: [{
                        label: 'Order Total',
                        amount: amount.toString(),
                        pending: false
                      }],
                      requestShippingContact: false,
                      requestBillingContact: true
                    };
                    
                    try {
                      // Use the correct Square Web SDK tokenize flow
                      const tokenResult = await paymentForm.applePay.tokenize({ paymentRequest });
                      
                      if (tokenResult.status === 'OK') {
                        await handlePayment(paymentForm.applePay, tokenResult);
                      } else {
                        setError('Apple Pay tokenization failed. Please try a different payment method.');
                      }
                    } catch (error) {
                      console.error('Apple Pay error:', error);
                      setError('Apple Pay failed. Please try a different payment method.');
                    }
                  }}
                  disabled={isProcessing}
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  data-testid="button-apple-pay"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" />
                  )}
                  Pay with Apple Pay
                </Button>
              )}

              {googlePayAvailable && (
                <Button
                  onClick={async () => {
                    if (!paymentForm?.googlePay) return;
                    
                    // Implement proper Google Pay payment request with correct Square Web SDK flow
                    const paymentRequest = {
                      countryCode: 'US',
                      currencyCode: 'USD',
                      total: {
                        label: 'Total',
                        amount: amount.toString()
                      },
                      displayItems: [{
                        label: 'Order Total',
                        amount: amount.toString()
                      }]
                    };
                    
                    try {
                      // Use the correct Square Web SDK tokenize flow
                      const tokenResult = await paymentForm.googlePay.tokenize({ paymentRequest });
                      
                      if (tokenResult.status === 'OK') {
                        await handlePayment(paymentForm.googlePay, tokenResult);
                      } else {
                        setError('Google Pay tokenization failed. Please try a different payment method.');
                      }
                    } catch (error) {
                      console.error('Google Pay error:', error);
                      setError('Google Pay failed. Please try a different payment method.');
                    }
                  }}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-google-pay"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" />
                  )}
                  Pay with Google Pay
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>
          </>
        )}

        {/* Card Payment Form */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Pay with Card</p>
          
          {/* Square Card Container */}
          <div 
            id="card-container" 
            className="min-h-[120px] p-4 border border-border rounded-md bg-background"
            data-testid="card-container"
          />
          
          <Button
            onClick={() => paymentForm?.requestCardNonce()}
            disabled={isProcessing}
            className="w-full"
            data-testid="button-pay-card"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${amount.toFixed(2)}
              </>
            )}
          </Button>
        </div>

        {/* Cancel Button */}
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full"
          data-testid="button-cancel-payment"
        >
          Cancel
        </Button>

        {/* Security Notice */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>🔒 Your payment information is secure</p>
          <p>Powered by Square</p>
        </div>
      </CardContent>
    </Card>
  );
}