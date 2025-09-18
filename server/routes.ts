import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertItemSchema, 
  insertOrderSchema,
  insertLocalEventSchema,
  insertAdSchema,
  insertTruckLocationSchema,
  insertEmailVerificationSchema,
  insertNotificationPreferencesSchema,
  insertAdClickSchema,
  insertEventClickSchema
} from "@shared/schema";
import { z } from "zod";

// Tax rate validation schema
const taxRateUpdateSchema = z.object({
  taxRate: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 1;
  }, {
    message: "Tax rate must be a number between 0 and 1 (0% to 100%)"
  })
});
import { SquareClient, SquareEnvironment } from "square";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

// Secure helper functions for authentication
function generateVerificationCode(): string {
  // Generate a 6-digit verification code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  if (!adminEmailsEnv) {
    console.warn('⚠️  ADMIN_EMAILS environment variable not set. Admin access will be restricted.');
    return [];
  }
  
  return adminEmailsEnv.split(',').map(email => email.trim()).filter(email => email.length > 0);
}

function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email);
}

// JWT Secret - No fallback for security. Server will fail to start if not configured in production.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production but was not provided');
  }
  return 'dev-only-jwt-secret-not-for-production';
})();
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

// Regular user authentication middleware using JWT
async function requireAuth(req: any, res: any, next: any) {
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

    req.user = user;
    next();
  } catch (error) {
    console.error('User authentication failed:', error);
    res.status(401).json({ error: "Authentication failed" });
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

    // Admin check: Environment variable OR database role
    const isEnvAdmin = isAdminEmail(user.email);
    const isDatabaseAdmin = user.role === "admin";
    const isAdmin = isEnvAdmin || isDatabaseAdmin;
    
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
  // IP-based rate limiting for authentication endpoints
  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      error: "Too many authentication attempts from this IP. Please try again later.",
      retryAfter: Math.ceil(15 * 60) // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use default keyGenerator for proper IPv6 handling
  });

  const verificationRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3, // Limit each IP to 3 verification attempts per windowMs
    message: {
      error: "Too many verification attempts from this IP. Please try again later.",
      retryAfter: Math.ceil(10 * 60) // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use default keyGenerator for proper IPv6 handling
  });

  // Authentication routes - SECURE EMAIL VERIFICATION FLOW
  app.post("/api/auth/request-verification", authRateLimit, async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // Allow admin emails to go through normal verification flow
      // Admin privileges are granted after successful email verification based on ADMIN_EMAILS env var

      // Cleanup expired verifications
      await storage.cleanupExpiredVerifications();
      
      // Check for existing pending verification
      const existingVerification = await storage.getEmailVerificationByEmail(email);
      if (existingVerification && !existingVerification.verified && existingVerification.expiresAt > new Date()) {
        return res.status(429).json({ 
          error: "Verification code already sent. Please check your email or wait before requesting again.",
          expiresIn: Math.ceil((existingVerification.expiresAt.getTime() - Date.now()) / 1000 / 60) // minutes
        });
      }
      
      // Generate verification code
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Create verification record
      await storage.createEmailVerification({
        email,
        code: verificationCode,
        expiresAt,
        attempts: 0,
        verified: false
      });
      
      // In a real implementation, send email here
      // SECURITY: Never log verification codes in any environment
      // Verification codes are sent via email only
      
      // SECURITY: Never return the verification code in the response
      res.json({ 
        success: true, 
        message: "Verification code sent to your email address. Please check your email and enter the code to continue.",
        email: email.replace(/(.{2}).*@/, '$1***@') // Partially hide email for confirmation
      });
    } catch (error) {
      console.error('Request verification error:', error);
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/api/auth/verify-email", verificationRateLimit, async (req, res) => {
    try {
      const { email, code } = z.object({ 
        email: z.string().email(),
        code: z.string().length(6)
      }).parse(req.body);
      
      // SECURITY FIX: Fetch verification by email only (not email+code)
      const verification = await storage.getEmailVerificationByEmail(email);
      
      if (!verification) {
        return res.status(400).json({ error: "No pending verification found for this email" });
      }
      
      if (verification.verified) {
        return res.status(400).json({ error: "Email already verified" });
      }
      
      if (verification.expiresAt < new Date()) {
        return res.status(400).json({ error: "Verification code expired. Please request a new one." });
      }
      
      // SECURITY FIX: Check attempt limit BEFORE validating code
      if (verification.attempts >= 3) {
        return res.status(429).json({ 
          error: "Too many failed attempts. Please request a new verification code.",
          lockoutTime: Math.ceil((verification.expiresAt.getTime() - Date.now()) / 1000 / 60) // minutes until expiry
        });
      }
      
      // SECURITY FIX: Increment attempts on ANY attempt (before code validation)
      await storage.incrementVerificationAttemptsByEmail(email);
      
      // Now validate the provided code against stored code
      if (verification.code !== code) {
        return res.status(400).json({ 
          error: "Invalid verification code",
          attemptsRemaining: Math.max(0, 3 - (verification.attempts + 1))
        });
      }
      
      // Code is correct - mark email as verified
      const verificationSuccess = await storage.markEmailVerified(email, code);
      if (!verificationSuccess) {
        return res.status(400).json({ error: "Verification failed" });
      }
      
      // Create or get user after successful email verification
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({ 
          email, 
          orderHistory: [], 
          preferences: {} 
        });
      }

      // SECURITY FIX: Only generate JWT token AFTER email verification
      const token = generateSecureToken(user.id, user.email);
      
      res.json({ 
        success: true, 
        token, 
        user,
        message: "Email verified successfully. You are now logged in."
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(400).json({ error: "Invalid verification request" });
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

      // Add admin status to response for frontend use
      const isEnvAdmin = isAdminEmail(user.email);
      const isDatabaseAdmin = user.role === "admin";
      const isAdmin = isEnvAdmin || isDatabaseAdmin;
      
      res.json({ 
        user: {
          ...user,
          isAdmin // Add convenience field
        }
      });
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

  app.patch("/api/items/:id/tax-rate", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { taxRate } = taxRateUpdateSchema.parse(req.body);
      
      const item = await storage.updateItemTaxRate(id, taxRate);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Broadcast tax rate update via WebSocket
      broadcastToAll(JSON.stringify({
        type: 'TAX_RATE_UPDATED',
        data: item
      }));
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error.message || "Invalid tax rate" });
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

  // Sponsored Content Management Routes
  app.put("/api/admin/ads/:id/sponsored", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { sponsored } = z.object({ sponsored: z.boolean() }).parse(req.body);
      
      const ad = await storage.updateAdSponsoredStatus(id, sponsored);
      if (!ad) {
        return res.status(404).json({ error: "Ad not found" });
      }
      
      res.json(ad);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.put("/api/admin/events/:id/sponsored", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { sponsored } = z.object({ sponsored: z.boolean() }).parse(req.body);
      
      const event = await storage.updateEventSponsoredStatus(id, sponsored);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get("/api/admin/sponsored/ads", requireAdmin, async (req, res) => {
    try {
      const ads = await storage.getSponsoredAds();
      res.json(ads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sponsored ads" });
    }
  });

  app.get("/api/admin/sponsored/events", requireAdmin, async (req, res) => {
    try {
      const events = await storage.getSponsoredEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sponsored events" });
    }
  });

  // Rate limiting for click tracking to prevent abuse
  const clickTrackingRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 clicks per minute
    message: {
      error: "Too many click tracking requests from this IP. Please slow down.",
      retryAfter: Math.ceil(1 * 60) // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Analytics and Click Tracking Routes
  app.post("/api/analytics/track-click", clickTrackingRateLimit, async (req, res) => {
    try {
      const { type, contentId, userId, ipAddress, userAgent } = z.object({
        type: z.enum(["ad", "event"]),
        contentId: z.string(),
        userId: z.string().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional()
      }).parse(req.body);

      // Get IP address from request if not provided
      const clientIp = ipAddress || req.ip || req.connection.remoteAddress || 
                       req.headers['x-forwarded-for']?.split(',')[0]?.trim();
      
      // Get user agent from request if not provided  
      const clientUserAgent = userAgent || req.headers['user-agent'];

      if (type === "ad") {
        const click = await storage.trackAdClick({
          adId: contentId,
          userId: userId || null,
          ipAddress: clientIp || null,
          userAgent: clientUserAgent || null
        });
        res.json({ success: true, clickId: click.id });
      } else {
        const click = await storage.trackEventClick({
          eventId: contentId,
          userId: userId || null,
          ipAddress: clientIp || null,
          userAgent: clientUserAgent || null
        });
        res.json({ success: true, clickId: click.id });
      }
    } catch (error) {
      console.error('Error tracking click:', error);
      res.status(400).json({ error: "Invalid click tracking data" });
    }
  });

  app.get("/api/admin/analytics/sponsored-content", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getSponsoredContentAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching sponsored content analytics:', error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/analytics/revenue", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional()
      }).parse(req.query);

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const analytics = await storage.getRevenueAnalytics(start, end);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      res.status(500).json({ error: "Failed to fetch revenue analytics" });
    }
  });

  app.get("/api/admin/analytics/ad-clicks/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional()
      }).parse(req.query);

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days ago
      const end = endDate ? new Date(endDate) : new Date(); // Default now

      const clicks = await storage.getAdClicksByDateRange(id, start, end);
      const clickCount = await storage.getAdClickCount(id);
      
      res.json({ clicks, totalClicks: clickCount });
    } catch (error) {
      console.error('Error fetching ad click analytics:', error);
      res.status(500).json({ error: "Failed to fetch ad click analytics" });
    }
  });

  app.get("/api/admin/analytics/event-clicks/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional()
      }).parse(req.query);

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days ago
      const end = endDate ? new Date(endDate) : new Date(); // Default now

      const clicks = await storage.getEventClicksByDateRange(id, start, end);
      const clickCount = await storage.getEventClickCount(id);
      
      res.json({ clicks, totalClicks: clickCount });
    } catch (error) {
      console.error('Error fetching event click analytics:', error);
      res.status(500).json({ error: "Failed to fetch event click analytics" });
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

  // Notification routes
  // Get current user's notification preferences
  app.get("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      let preferences = await storage.getNotificationPreferences(userId);
      
      // Create default preferences if none exist
      if (!preferences) {
        preferences = await storage.createNotificationPreferences({
          userId,
          pushEnabled: false,
          permissionStatus: 'default',
        });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  // Update notification preferences (opt-in/opt-out)
  app.put("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const updates = z.object({
        pushEnabled: z.boolean().optional(),
        permissionStatus: z.enum(['default', 'granted', 'denied']).optional(),
      }).parse(req.body);
      
      let preferences = await storage.getNotificationPreferences(userId);
      
      if (!preferences) {
        // Create new preferences if none exist
        preferences = await storage.createNotificationPreferences({
          userId,
          pushEnabled: updates.pushEnabled ?? false,
          permissionStatus: updates.permissionStatus ?? 'default',
        });
      } else {
        // Update existing preferences
        preferences = await storage.updateNotificationPreferences(userId, updates);
      }
      
      if (!preferences) {
        return res.status(500).json({ error: "Failed to update notification preferences" });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(400).json({ error: "Invalid notification preferences data" });
    }
  });

  // Register push token
  app.post("/api/notifications/register", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { pushToken } = z.object({
        pushToken: z.string().min(1, "Push token is required"),
      }).parse(req.body);
      
      // Update push token and enable notifications
      const preferences = await storage.updateNotificationPreferences(userId, {
        pushToken,
        pushEnabled: true,
        permissionStatus: 'granted',
      });
      
      if (!preferences) {
        return res.status(500).json({ error: "Failed to register push token" });
      }
      
      res.json({ 
        success: true, 
        message: "Push token registered successfully",
        preferences 
      });
    } catch (error) {
      console.error('Error registering push token:', error);
      res.status(400).json({ error: "Invalid push token data" });
    }
  });

  // Admin routes for notification management
  app.get("/api/admin/notifications/users", requireAdmin, async (req, res) => {
    try {
      const usersWithPush = await storage.getUsersWithPushEnabled();
      res.json(usersWithPush);
    } catch (error) {
      console.error('Error fetching users with push enabled:', error);
      res.status(500).json({ error: "Failed to fetch users with push notifications" });
    }
  });

  // Rate limit for admin notification sending - prevent spam
  const adminNotificationRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit admin to 5 notification broadcasts per minute
    message: {
      error: "Too many notification broadcasts. Please wait before sending more notifications.",
      retryAfter: 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Send notification to all users (admin only)
  app.post("/api/admin/notifications/send", adminNotificationRateLimit, requireAdmin, async (req, res) => {
    try {
      const { title, body, data } = z.object({
        title: z.string().min(1, "Title is required"),
        body: z.string().min(1, "Body is required"),
        data: z.record(z.any()).optional(),
      }).parse(req.body);
      
      const usersWithPush = await storage.getUsersWithPushEnabled();
      
      if (usersWithPush.length === 0) {
        return res.json({ 
          success: true, 
          message: "No users have push notifications enabled",
          sent: 0 
        });
      }
      
      // In a real implementation, you would send notifications here
      // For now, we'll just return the count of users who would receive the notification
      const pushTokens = usersWithPush
        .filter(user => user.pushToken)
        .map(user => user.pushToken);
      
      // TODO: Implement actual push notification sending
      // This would use FCM, APNS, or another push service
      console.log(`Admin notification broadcast - User: ${req.user.email} | Recipients: ${pushTokens.length} devices:`, {
        title,
        body,
        data,
        tokens: pushTokens,
        timestamp: new Date().toISOString()
      });
      
      res.json({ 
        success: true, 
        message: `Notification queued for ${pushTokens.length} devices`,
        sent: pushTokens.length,
        recipients: usersWithPush.length
      });
    } catch (error) {
      console.error('Error sending notifications:', error);
      res.status(400).json({ error: "Invalid notification data" });
    }
  });

  // Points system routes
  app.get("/api/points/status", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const status = await storage.getUserPointsStatus(userId);
      
      if (!status) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(status);
    } catch (error) {
      console.error('Error fetching user points status:', error);
      res.status(500).json({ error: "Failed to fetch points status" });
    }
  });

  app.put("/api/points/preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { pointsEnabled } = z.object({
        pointsEnabled: z.boolean(),
      }).parse(req.body);
      
      const updatedUser = await storage.updateUserPointsSettings(userId, pointsEnabled);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        success: true,
        message: pointsEnabled ? "Points system enabled!" : "Points system disabled.",
        pointsEnabled: updatedUser.pointsEnabled,
        totalPoints: updatedUser.totalPoints || 0
      });
    } catch (error) {
      console.error('Error updating points preferences:', error);
      res.status(400).json({ error: "Invalid points preferences data" });
    }
  });

  app.get("/api/points/balance", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const balance = await storage.getUserPointsBalance(userId);
      
      res.json({ 
        totalPoints: balance,
        message: `You have ${balance} loyalty points!`
      });
    } catch (error) {
      console.error('Error fetching points balance:', error);
      res.status(500).json({ error: "Failed to fetch points balance" });
    }
  });

  // Admin route for manually awarding points
  app.post("/api/admin/points/award", requireAdmin, async (req, res) => {
    try {
      const { userId, points, reason } = z.object({
        userId: z.string(),
        points: z.number().int().positive(),
        reason: z.string().optional()
      }).parse(req.body);
      
      const updatedUser = await storage.awardPoints(userId, points);
      
      if (!updatedUser) {
        return res.status(400).json({ error: "Failed to award points. User may not have points enabled or may not exist." });
      }
      
      res.json({
        success: true,
        message: `Successfully awarded ${points} points to user.`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          totalPoints: updatedUser.totalPoints,
          pointsEnabled: updatedUser.pointsEnabled
        },
        reason: reason || "Manual award by admin"
      });
    } catch (error) {
      console.error('Error awarding points:', error);
      res.status(400).json({ error: "Invalid points award data" });
    }
  });

  // Admin routes for user management
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { search } = req.query;
      let users;
      
      if (search && typeof search === 'string') {
        users = await storage.searchUsers(search);
      } else {
        users = await storage.getAllUsers();
      }
      
      res.json(users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = z.object({ 
        role: z.enum(["admin", "customer"]) 
      }).parse(req.body);
      
      // Get the user being updated
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if we're trying to demote an admin to customer
      if (targetUser.role === "admin" && role === "customer") {
        const currentAdminCount = await storage.countAdminUsers();
        
        // Prevent demoting the last admin
        if (currentAdminCount <= 1) {
          return res.status(400).json({ 
            error: "Cannot demote the last remaining admin. The system must have at least one administrator." 
          });
        }
        
        // Prevent self-demotion (optional security measure)
        if (req.user && req.user.id === id) {
          return res.status(400).json({ 
            error: "You cannot demote yourself from admin role. Another admin must perform this action." 
          });
        }
      }
      
      const updatedUser = await storage.updateUserRole(id, role);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Failed to update user role:', error);
      res.status(400).json({ error: "Invalid request" });
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
        return res.status(503).json({ 
          error: "Payment service unavailable",
          details: "Square payment processing is not configured. Please contact support.",
          code: "PAYMENT_SERVICE_UNAVAILABLE"
        });
      }
      
      if (!locationId) {
        return res.status(503).json({ 
          error: "Payment service unavailable",
          details: "Square payment processing is not configured. Please contact support.",
          code: "PAYMENT_SERVICE_UNAVAILABLE"
        });
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

          // Award loyalty points if user has opted in
          try {
            const userPointsStatus = await storage.getUserPointsStatus(tokenData.userId);
            if (userPointsStatus?.pointsEnabled) {
              // Calculate points: 10 points per $10 spent
              const orderTotal = parseFloat(order.total);
              const pointsToAward = Math.floor(orderTotal / 10) * 10; // 10 points per $10, rounded down
              
              if (pointsToAward > 0) {
                const updatedUserWithPoints = await storage.awardPoints(tokenData.userId, pointsToAward);
                if (updatedUserWithPoints) {
                  console.log(`Points awarded: ${pointsToAward} points to user ${tokenData.userId} for order ${orderId} ($${orderTotal})`);
                } else {
                  console.warn(`Failed to award points to user ${tokenData.userId} for order ${orderId}`);
                }
              }
            }
          } catch (pointsError) {
            // Don't fail the payment if points awarding fails - just log it
            console.error('Error awarding points:', pointsError);
          }

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

  // AI Hostess route - integrates with OpenAI for AI hostess responses
  app.post("/api/ai/chat", async (req, res) => {
    try {
      // Check if AI is enabled before processing
      const aiEnabledSetting = await storage.getSetting('ai-enabled');
      const isAIEnabled = aiEnabledSetting?.value === 'true';
      
      if (!isAIEnabled) {
        return res.status(503).json({ 
          error: "AI functionality is currently disabled",
          message: "AI voice assistant is not available at this time. Please contact an administrator.",
          suggestedActions: []
        });
      }

      const { message, context } = z.object({
        message: z.string(),
        context: z.object({
          currentItem: z.string().optional(),
          cartItems: z.array(z.any()).optional(),
          menuItems: z.array(z.any()).optional()
        }).optional()
      }).parse(req.body);

      // Use the server-side OpenAI integration for AI hostess
      const { generateHostessResponse } = await import('./lib/openai');
      const response = await generateHostessResponse(message, context);
      
      res.json(response);
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({ 
        error: "AI service unavailable",
        message: "I'm having trouble right now. Please try again later!",
        suggestedActions: []
      });
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
