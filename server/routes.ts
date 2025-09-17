import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertItemSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/magic-link", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // In a real app, you'd send an actual magic link email
      // For now, we'll create or get the user and return a token
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({ 
          email, 
          orderHistory: [], 
          preferences: {} 
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

  app.post("/api/items", async (req, res) => {
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

  app.patch("/api/items/:id/stock", async (req, res) => {
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
