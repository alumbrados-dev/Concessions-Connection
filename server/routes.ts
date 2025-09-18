import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertItemSchema, 
  insertOrderSchema,
  insertLocalEventSchema,
  insertAdSchema,
  insertTruckLocationSchema
} from "@shared/schema";
import { z } from "zod";
import { SquareClient, SquareEnvironment } from "square";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

// JWT Secret - In production, this should be a strong random secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'concession-connection-dev-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Helper functions for JWT token management
function generateSecureToken(userId: string, email: string): string {
  return jwt.sign(
    { 
      userId, 
      email,
      iat: Math.floor(Date.now() / 1000),
      // Add entropy to prevent token guessing
      nonce: randomUUID() 
    },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'concession-connection',
      audience: 'concession-connection-users'
    }
  );
}

function verifySecureToken(token: string): { userId: string; email: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'concession-connection',
      audience: 'concession-connection-users'
    }) as any;
    
    return {
      userId: payload.userId,
      email: payload.email
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Secure admin authentication middleware using JWT
async function requireAdmin(req: any, res: any, next: any) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify JWT token
    const tokenData = verifySecureToken(token);
    if (!tokenData) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get user from database using verified user ID
    const user = await storage.getUser(tokenData.userId);
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Verify email matches token (prevents token reuse if user email changes)
    if (user.email !== tokenData.email) {
      return res.status(401).json({ error: "Token email mismatch" });
    }

    // Strict admin allowlist - only these exact emails have admin access
    // In production, this should use environment variables or database roles
    const adminEmails = [
      'admin@concessionconnection.com',
      'admin@replit.com',
      'stace.mitchell27@gmail.com'  // Add actual admin user for testing
    ];
    const isAdmin = adminEmails.includes(user.email);
    
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin authentication failed:', error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/magic-link", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // Block unauthorized creation of admin accounts
      const adminEmails = [
        'admin@concessionconnection.com',
        'admin@replit.com',
        'stace.mitchell27@gmail.com'
      ];
      
      const existingUser = await storage.getUserByEmail(email);
      
      // If this is an admin email and user doesn't exist, block creation
      if (adminEmails.includes(email) && !existingUser) {
        return res.status(403).json({ 
          error: "Admin account creation is restricted. Contact system administrator." 
        });
      }
      
      // For non-admin users, create or get user normally
      let user = existingUser;
      if (!user && !adminEmails.includes(email)) {
        user = await storage.createUser({ 
          email, 
          orderHistory: [], 
          preferences: {} 
        });
      } else if (!user) {
        // This should not happen due to the check above, but add safety
        return res.status(403).json({ 
          error: "User account not found. Contact system administrator." 
        });
      }

      // Generate secure JWT token
      const token = generateSecureToken(user.id, user.email);
      
      res.json({ success: true, token, user });
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/api/auth/verify", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      // Verify JWT token
      const tokenData = verifySecureToken(token);
      if (!tokenData) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Get user from database using verified user ID
      const user = await storage.getUser(tokenData.userId);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Verify email matches token (prevents token reuse if user email changes)
      if (user.email !== tokenData.email) {
        return res.status(401).json({ error: "Token email mismatch" });
      }

      res.json({ user });
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ error: "Invalid or expired token" });
    }
  });

  // Menu routes
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.post("/api/items", requireAdmin, async (req, res) => {
    try {
      const itemData = insertItemSchema.parse(req.body);
      const item = await storage.createItem(itemData);
      
      // Broadcast inventory update via WebSocket
      broadcastToAll(JSON.stringify({
        type: 'ITEM_CREATED',
        data: item
      }));
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid item data" });
    }
  });

  app.patch("/api/items/:id/stock", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { stock } = z.object({ stock: z.number() }).parse(req.body);
      
      const item = await storage.updateItemStock(id, stock);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Broadcast inventory update via WebSocket
      broadcastToAll(JSON.stringify({
        type: 'STOCK_UPDATED',
        data: item
      }));
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // Additional item management routes for admin
  app.put("/api/items/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertItemSchema.partial().parse(req.body);
      
      const item = await storage.updateItem(id, updates);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Broadcast update via WebSocket
      broadcastToAll(JSON.stringify({
        type: 'ITEM_UPDATED',
        data: item
      }));
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.delete("/api/items/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteItem(id);
      
      if (!success) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Broadcast deletion via WebSocket
      broadcastToAll(JSON.stringify({
        type: 'ITEM_DELETED',
        data: { id }
      }));
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Events and ads routes
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getActiveEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/ads", async (req, res) => {
    try {
      const ads = await storage.getActiveAds();
      res.json(ads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ads" });
    }
  });

  // Admin routes for events management
  app.get("/api/admin/events", requireAdmin, async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/admin/events", requireAdmin, async (req, res) => {
    try {
      const eventData = insertLocalEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid event data" });
    }
  });

  app.put("/api/admin/events/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertLocalEventSchema.partial().parse(req.body);
      
      const event = await storage.updateEvent(id, updates);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.delete("/api/admin/events/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteEvent(id);
      
      if (!success) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // Admin routes for ads management
  app.get("/api/admin/ads", requireAdmin, async (req, res) => {
    try {
      const ads = await storage.getAllAds();
      res.json(ads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ads" });
    }
  });

  app.post("/api/admin/ads", requireAdmin, async (req, res) => {
    try {
      const adData = insertAdSchema.parse(req.body);
      const ad = await storage.createAd(adData);
      res.json(ad);
    } catch (error) {
      res.status(400).json({ error: "Invalid ad data" });
    }
  });

  app.put("/api/admin/ads/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertAdSchema.partial().parse(req.body);
      
      const ad = await storage.updateAd(id, updates);
      if (!ad) {
        return res.status(404).json({ error: "Ad not found" });
      }
      
      res.json(ad);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.delete("/api/admin/ads/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAd(id);
      
      if (!success) {
        return res.status(404).json({ error: "Ad not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete ad" });
    }
  });

  // Admin routes for truck location management
  app.get("/api/admin/location", requireAdmin, async (req, res) => {
    try {
      const location = await storage.getTruckLocation();
      res.json(location || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch truck location" });
    }
  });

  app.put("/api/admin/location", requireAdmin, async (req, res) => {
    try {
      const locationData = insertTruckLocationSchema.parse(req.body);
      const location = await storage.updateTruckLocation(locationData);
      res.json(location);
    } catch (error) {
      res.status(400).json({ error: "Invalid location data" });
    }
  });

  // Admin routes for settings management
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/admin/settings/:key", requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  app.put("/api/admin/settings/:key", requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = z.object({ value: z.string() }).parse(req.body);
      
      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // Admin route for orders management
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Order routes - Secured with JWT authentication
  app.post("/api/orders", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify JWT token
      const tokenData = verifySecureToken(token);
      if (!tokenData) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Verify user exists
      const user = await storage.getUser(tokenData.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Verify email matches token
      if (user.email !== tokenData.email) {
        return res.status(401).json({ error: "Token email mismatch" });
      }

      const orderData = insertOrderSchema.parse({ ...req.body, userId: tokenData.userId });
      
      const order = await storage.createOrder(orderData);
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: "Invalid order data" });
    }
  });

  // Payment routes - Secured with JWT authentication
  app.post("/api/payments", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { sourceId, verificationToken, currency = "USD", orderId } = z.object({
        sourceId: z.string(),
        verificationToken: z.string().optional(),
        currency: z.string().default("USD"),
        orderId: z.string()
      }).parse(req.body);

      // Verify JWT token
      const tokenData = verifySecureToken(token);
      if (!tokenData) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Verify user exists
      const user = await storage.getUser(tokenData.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Verify email matches token
      if (user.email !== tokenData.email) {
        return res.status(401).json({ error: "Token email mismatch" });
      }
      
      // Verify the order exists and belongs to the authenticated user
      const order = await storage.getOrder(orderId);
      if (!order || order.userId !== tokenData.userId) {
        return res.status(404).json({ error: "Order not found or access denied" });
      }

      // Check if order is already paid
      if (order.paymentStatus === "completed") {
        return res.status(400).json({ error: "Order already paid" });
      }

      // Initialize Square client - require proper environment variables
      const accessToken = process.env.SQUARE_ACCESS_TOKEN;
      const locationId = process.env.SQUARE_LOCATION_ID;
      
      if (!accessToken) {
        return res.status(500).json({ error: "Square access token not configured" });
      }
      
      if (!locationId) {
        return res.status(500).json({ error: "Square location ID not configured" });
      }
      
      const squareClient = new SquareClient({
        accessToken,
        environment: process.env.NODE_ENV === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox
      });

      const paymentsApi = squareClient.payments;

      // Update order status to processing
      await storage.updateOrderPaymentStatus(orderId, "processing");

      try {
        // SECURITY: Use server-side order total instead of client-supplied amount
        const orderTotal = parseFloat(order.total.toString());
        const amountInCents = Math.round(orderTotal * 100);
        
        // Create payment request
        const paymentRequest: any = {
          sourceId,
          idempotencyKey: randomUUID(),
          amountMoney: {
            amount: BigInt(amountInCents), // Use server-computed amount in cents
            currency
          },
          autocomplete: true,
          locationId,
          referenceId: orderId,
          note: `Payment for order ${orderId} - Total: $${orderTotal.toFixed(2)}`
        };

        // Add verification token for 3DS if provided
        if (verificationToken) {
          paymentRequest.verificationToken = verificationToken;
        }

        // Process payment with Square
        const response = await paymentsApi.createPayment(paymentRequest);

        if (response.result.payment) {
          const payment = response.result.payment;
          
          // Determine payment method from source type
          let paymentMethod = "card";
          if (sourceId.startsWith('cnon:apple-pay')) {
            paymentMethod = "apple_pay";
          } else if (sourceId.startsWith('cnon:google-pay')) {
            paymentMethod = "google_pay";
          }

          // Update order with successful payment
          const updatedOrder = await storage.updateOrderPaymentStatus(
            orderId, 
            "completed", 
            payment.id,
            paymentMethod
          );

          res.json({
            success: true,
            payment: {
              id: payment.id,
              status: payment.status,
              totalMoney: payment.totalMoney,
              createdAt: payment.createdAt
            },
            order: updatedOrder
          });
        } else {
          // Payment failed
          await storage.updateOrderPaymentStatus(orderId, "failed");
          res.status(400).json({ 
            error: "Payment failed", 
            details: response.result.errors || [] 
          });
        }
      } catch (squareError: any) {
        // Handle Square API errors
        console.error('Square payment error:', squareError);
        
        await storage.updateOrderPaymentStatus(orderId, "failed");
        
        // Check for specific Square error types
        if (squareError.errors) {
          const errorCode = squareError.errors[0]?.code;
          const errorDetail = squareError.errors[0]?.detail;
          
          // Handle 3DS verification required
          if (errorCode === 'VERIFY_CVV' || errorCode === 'VERIFY_AVS') {
            return res.status(400).json({
              error: "Card verification required",
              code: errorCode,
              details: errorDetail,
              requiresVerification: true
            });
          }
          
          // Handle declined cards
          if (errorCode === 'CARD_DECLINED' || errorCode === 'CVV_FAILURE') {
            return res.status(400).json({
              error: "Card declined",
              code: errorCode,
              details: errorDetail
            });
          }
          
          // Handle insufficient funds
          if (errorCode === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({
              error: "Insufficient funds",
              code: errorCode,
              details: errorDetail
            });
          }
        }
        
        res.status(500).json({ 
          error: "Payment processing failed", 
          details: squareError.message 
        });
      }
    } catch (error) {
      console.error('Payment endpoint error:', error);
      res.status(400).json({ error: "Invalid payment data" });
    }
  });

  // AI Hostess route
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, context } = z.object({
        message: z.string(),
        context: z.object({
          currentItem: z.string().optional(),
          cartItems: z.array(z.any()).optional(),
        }).optional()
      }).parse(req.body);

      // This would integrate with OpenAI
      // For now, return a mock response
      const responses = [
        "Hi! Welcome to TruckEats! How can I help you today?",
        "That's a great choice! Would you like to make that a combo with fries and a drink?",
        "Our Classic Burger is very popular! Would you like to add some crispy fries to go with it?",
        "I'd recommend trying our Fresh Lemonade - it's perfect with any meal!",
      ];

      const response = responses[Math.floor(Math.random() * responses.length)];
      
      res.json({ 
        message: response,
        suggestedActions: ["add_combo", "view_specials", "checkout"]
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected to WebSocket');

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  function broadcastToAll(message: string) {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  return httpServer;
}
