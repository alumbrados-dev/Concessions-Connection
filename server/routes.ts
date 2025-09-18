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

// Admin authentication middleware
async function requireAdmin(req: any, res: any, next: any) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = Buffer.from(token, 'base64').toString();
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
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

      // In production, generate a proper JWT or session token
      const token = Buffer.from(user.id).toString('base64');
      
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

      const userId = Buffer.from(token, 'base64').toString();
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
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

  // Order routes
  app.post("/api/orders", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = Buffer.from(token, 'base64').toString();
      const orderData = insertOrderSchema.parse({ ...req.body, userId });
      
      const order = await storage.createOrder(orderData);
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: "Invalid order data" });
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
