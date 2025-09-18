import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Truck, MapPin, Car, Clock, Star } from "lucide-react";
import { SiGrubhub, SiDoordash } from "react-icons/si";

export interface DeliveryOption {
  id: "pickup" | "grubhub" | "doordash";
  name: string;
  description: string;
  estimatedTime: string;
  fee?: string;
  icon: React.ReactNode;
  available: boolean;
}

interface DeliveryOptionsProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  className?: string;
}

const deliveryOptions: DeliveryOption[] = [
  {
    id: "pickup",
    name: "Direct Pickup",
    description: "Pick up directly from our food truck location",
    estimatedTime: "5-10 min",
    icon: <Truck className="h-5 w-5" />,
    available: true,
  },
  {
    id: "grubhub",
    name: "Grubhub Delivery",
    description: "Order through Grubhub for delivery or pickup",
    estimatedTime: "25-35 min",
    fee: "$2.99",
    icon: <SiGrubhub className="h-5 w-5" />,
    available: true,
  },
  {
    id: "doordash",
    name: "DoorDash Delivery",
    description: "Order through DoorDash for delivery or pickup",
    estimatedTime: "20-30 min",
    fee: "$3.49",
    icon: <SiDoordash className="h-5 w-5" />,
    available: true,
  },
];

export default function DeliveryOptions({ selectedMethod, onMethodChange, className }: DeliveryOptionsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Choose Your Delivery Method
        </CardTitle>
        <CardDescription>
          Select how you'd like to receive your order
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={selectedMethod} 
          onValueChange={onMethodChange}
          className="grid gap-3"
          data-testid="delivery-options"
        >
          {deliveryOptions.map((option) => (
            <div
              key={option.id}
              className={`relative flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                selectedMethod === option.id 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                  : 'border-border'
              } ${
                !option.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <RadioGroupItem 
                value={option.id} 
                id={option.id}
                disabled={!option.available}
                data-testid={`delivery-option-${option.id}`}
              />
              <Label 
                htmlFor={option.id} 
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {option.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {option.name}
                        </p>
                        {option.id === "pickup" && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <Star className="h-3 w-3 fill-current" />
                            Recommended
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {option.estimatedTime}
                    </div>
                    {option.fee && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Delivery fee: {option.fee}
                      </p>
                    )}
                    {option.id === "pickup" && (
                      <p className="text-sm text-green-600 mt-1 font-medium">
                        Free
                      </p>
                    )}
                  </div>
                </div>
              </Label>
              
              {!option.available && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
                  <span className="text-sm font-medium text-muted-foreground">
                    Currently Unavailable
                  </span>
                </div>
              )}
            </div>
          ))}
        </RadioGroup>
        
        {selectedMethod !== "pickup" && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Car className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  External Platform Ordering
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  You'll be redirected to {selectedMethod === "grubhub" ? "Grubhub" : "DoorDash"} to complete your order. 
                  Your cart items will be preserved for easy re-ordering.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { deliveryOptions };