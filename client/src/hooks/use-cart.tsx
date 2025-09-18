import { createContext, useContext, useEffect, useState } from "react";
import { Item } from "@shared/schema";

export interface CartItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
  imageUrl?: string;
  taxRate?: string; // Tax rate for this item (e.g., "0.06" for 6%)
}

interface CartContextType {
  items: CartItem[];
  total: number;
  subtotal: number;
  taxAmount: number;
  itemCount: number;
  addItem: (item: Item, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart_items');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart_items', JSON.stringify(items));
  }, [items]);

  // Calculate subtotal (price * quantity for all items)
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  
  // Calculate total tax amount (item tax * quantity for all items)
  const taxAmount = items.reduce((sum, item) => {
    const itemPrice = parseFloat(item.price);
    const itemTaxRate = parseFloat(item.taxRate || "0.06"); // Default to 6% Maryland tax
    const itemTax = itemPrice * itemTaxRate;
    return sum + (itemTax * item.quantity);
  }, 0);
  
  // Calculate total (subtotal + tax)
  const total = subtotal + taxAmount;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = (item: Item, quantity = 1) => {
    setItems(current => {
      const existingItem = current.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        return current.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      
      return [...current, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity,
        imageUrl: item.imageUrl || undefined,
        taxRate: item.taxRate || "0.0600" // Default to Maryland 6% tax
      }];
    });
  };

  const removeItem = (id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    
    setItems(current =>
      current.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  return (
    <CartContext.Provider value={{
      items,
      total,
      subtotal,
      taxAmount,
      itemCount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
