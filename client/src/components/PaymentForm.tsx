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
  const [squareConfigured, setSquareConfigured] = useState(false);
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

        // Check Square environment configuration
        const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
        
        if (!applicationId || !locationId) {
          console.warn('Square payment environment not configured:', {
            hasApplicationId: !!applicationId,
            hasLocationId: !!locationId
          });
          setSquareConfigured(false);
          setIsLoading(false);
          return;
        }
        
        setSquareConfigured(true);
        
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
        // Check if this is a configuration error vs a runtime error
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (errorMessage.includes('not configured') || errorMessage.includes('SDK failed')) {
          setSquareConfigured(false);
        } else {
          setError('Failed to initialize payment form');
        }
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
      <Card className="w-full max-w-md mx-auto" role="dialog" aria-labelledby="loading-title" aria-describedby="loading-description">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" aria-hidden="true" />
            <h2 id="loading-title" className="sr-only">Payment Form Loading</h2>
            <p id="loading-description" aria-live="polite">Loading payment form...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show service unavailable message when Square is not configured
  if (!squareConfigured) {
    return (
      <Card className="w-full max-w-md mx-auto" role="dialog" aria-labelledby="unavailable-title" aria-describedby="unavailable-description">
        <CardHeader>
          <CardTitle id="unavailable-title" className="flex items-center gap-2 text-amber-600">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            Payment Service Unavailable
          </CardTitle>
          <CardDescription>
            Total: <span className="font-semibold text-lg" aria-label="Total amount: ${amount.toFixed(2)}">${amount.toFixed(2)}</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800" role="alert" aria-live="polite">
            <AlertDescription id="unavailable-description" className="text-amber-800 dark:text-amber-200">
              <div className="space-y-2">
                <p className="font-medium">💳 Online payment is temporarily unavailable</p>
                <p className="text-sm">
                  Our payment processing service is currently being configured. 
                  Please try one of these alternatives:
                </p>
                <ul className="text-sm list-disc list-inside ml-4 space-y-1" role="list">
                  <li role="listitem">Pay in person when picking up your order</li>
                  <li role="listitem">Contact us directly to arrange payment</li>
                  <li role="listitem">Try again later</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Disabled Payment Options */}
          <fieldset className="space-y-3 opacity-60" disabled aria-describedby="unavailable-description">
            <legend className="text-sm font-medium text-muted-foreground">Payment Options (Unavailable)</legend>
            
            <Button
              disabled
              className="w-full bg-black text-white cursor-not-allowed"
              data-testid="button-apple-pay-disabled"
              aria-label="Apple Pay - currently unavailable"
            >
              <Smartphone className="h-4 w-4 mr-2" aria-hidden="true" />
              Apple Pay (Unavailable)
            </Button>

            <Button
              disabled
              className="w-full bg-blue-600 text-white cursor-not-allowed"
              data-testid="button-google-pay-disabled"
              aria-label="Google Pay - currently unavailable"
            >
              <Smartphone className="h-4 w-4 mr-2" aria-hidden="true" />
              Google Pay (Unavailable)
            </Button>

            <Button
              disabled
              className="w-full cursor-not-allowed"
              data-testid="button-card-pay-disabled"
              aria-label="Pay with Card - currently unavailable"
            >
              <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
              Pay with Card (Unavailable)
            </Button>
          </fieldset>

          {/* Alternative Contact Info */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>📞 Need help? Contact us directly</p>
            <p>We apologize for the inconvenience</p>
          </div>

          {/* Cancel Button */}
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full focus:ring-2 focus:ring-primary focus:ring-offset-2"
            data-testid="button-cancel-payment"
            aria-label="Close payment form and return to order"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto" role="dialog" aria-labelledby="payment-title" aria-describedby="payment-description">
      <CardHeader>
        <CardTitle id="payment-title" className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" aria-hidden="true" />
          Complete Payment
        </CardTitle>
        <CardDescription id="payment-description">
          Total: <span className="font-semibold text-lg" aria-label="Total amount: ${amount.toFixed(2)}">${amount.toFixed(2)}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" role="alert" aria-live="assertive">
            <AlertDescription id="payment-error">{error}</AlertDescription>
          </Alert>
        )}

        {/* Digital Wallet Options */}
        {(applePayAvailable || googlePayAvailable) && (
          <>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-muted-foreground">Quick Pay Options</legend>
              
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
                  className="w-full bg-black hover:bg-gray-800 text-white focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
                  data-testid="button-apple-pay"
                  aria-label={isProcessing ? "Processing Apple Pay payment..." : `Pay ${amount.toFixed(2)} with Apple Pay`}
                  aria-describedby={error ? "payment-error" : undefined}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" aria-hidden="true" />
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                  data-testid="button-google-pay"
                  aria-label={isProcessing ? "Processing Google Pay payment..." : `Pay ${amount.toFixed(2)} with Google Pay`}
                  aria-describedby={error ? "payment-error" : undefined}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" aria-hidden="true" />
                  )}
                  Pay with Google Pay
                </Button>
              )}
            </fieldset>
            
            <div className="flex items-center gap-4" role="separator" aria-label="Alternative payment methods">
              <Separator className="flex-1" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" aria-hidden="true" />
            </div>
          </>
        )}

        {/* Card Payment Form */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-muted-foreground">Pay with Card</legend>
          
          {/* Square Card Container */}
          <div 
            id="card-container" 
            className="min-h-[120px] p-4 border border-border rounded-md bg-background"
            data-testid="card-container"
            role="group"
            aria-label="Credit card information"
            aria-describedby={error ? "payment-error" : "card-instructions"}
          />
          <div id="card-instructions" className="sr-only">
            Enter your credit card details. All fields are required. Your payment information is secure and encrypted.
          </div>
          
          <Button
            onClick={() => paymentForm?.requestCardNonce()}
            disabled={isProcessing}
            className="w-full focus:ring-2 focus:ring-primary focus:ring-offset-2"
            data-testid="button-pay-card"
            aria-label={isProcessing ? "Processing payment, please wait..." : `Pay ${amount.toFixed(2)} with credit card`}
            aria-describedby={error ? "payment-error" : undefined}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                <span aria-live="polite">Processing Payment...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
                Pay ${amount.toFixed(2)}
              </>
            )}
          </Button>
        </fieldset>

        {/* Cancel Button */}
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full focus:ring-2 focus:ring-primary focus:ring-offset-2"
          data-testid="button-cancel-payment"
          aria-label="Cancel payment and return to order"
        >
          Cancel
        </Button>

        {/* Security Notice */}
        <div className="text-xs text-muted-foreground text-center space-y-1" role="note" aria-label="Security information">
          <p><span aria-hidden="true">🔒</span> Your payment information is secure</p>
          <p>Powered by Square</p>
        </div>
      </CardContent>
    </Card>
  );
}