import { type User, type InsertUser, type Item, type InsertItem, type LocalEvent, type InsertLocalEvent, type Ad, type InsertAd, type Order, type InsertOrder, type TruckLocation, type InsertTruckLocation, type Settings, type InsertSettings, type EmailVerification, type InsertEmailVerification, type NotificationPreferences, type InsertNotificationPreferences, type AdClick, type InsertAdClick, type EventClick, type InsertEventClick } from "@shared/schema";
import { db, users, items, localEvents, ads, orders, truckLocation, settings, emailVerifications, notificationPreferences, adClicks, eventClicks } from "./lib/db";
import { eq, and, sql, like, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  updateUserRole(userId: string, role: "admin" | "customer"): Promise<User | undefined>;
  countAdminUsers(): Promise<number>;

  // Item operations
  getAllItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, updates: Partial<Item>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;
  updateItemStock(id: string, stock: number): Promise<Item | undefined>;
  updateItemTaxRate(id: string, taxRate: string): Promise<Item | undefined>;

  // Event operations
  getAllEvents(): Promise<LocalEvent[]>;
  getActiveEvents(): Promise<LocalEvent[]>;
  getEvent(id: string): Promise<LocalEvent | undefined>;
  createEvent(event: InsertLocalEvent): Promise<LocalEvent>;
  updateEvent(id: string, updates: Partial<LocalEvent>): Promise<LocalEvent | undefined>;
  deleteEvent(id: string): Promise<boolean>;

  // Ad operations
  getAllAds(): Promise<Ad[]>;
  getActiveAds(): Promise<Ad[]>;
  getAd(id: string): Promise<Ad | undefined>;
  createAd(ad: InsertAd): Promise<Ad>;
  updateAd(id: string, updates: Partial<Ad>): Promise<Ad | undefined>;
  deleteAd(id: string): Promise<boolean>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(orderId: string): Promise<Order | undefined>;
  getUserOrders(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderPaymentStatus(orderId: string, paymentStatus: string, transactionId?: string, paymentMethod?: string): Promise<Order | undefined>;

  // Truck location operations
  getTruckLocation(): Promise<TruckLocation | undefined>;
  updateTruckLocation(location: InsertTruckLocation): Promise<TruckLocation>;

  // Settings operations
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(key: string, value: string): Promise<Settings>;
  getAllSettings(): Promise<Settings[]>;

  // Email verification operations
  createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification>;
  getEmailVerification(email: string, code: string): Promise<EmailVerification | undefined>;
  getEmailVerificationByEmail(email: string): Promise<EmailVerification | undefined>;
  markEmailVerified(email: string, code: string): Promise<boolean>;
  incrementVerificationAttempts(email: string, code: string): Promise<boolean>;
  incrementVerificationAttemptsByEmail(email: string): Promise<boolean>;
  cleanupExpiredVerifications(): Promise<void>;

  // Notification preference operations
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences>;
  updateNotificationPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences | undefined>;
  updatePushToken(userId: string, pushToken: string): Promise<NotificationPreferences | undefined>;
  togglePushNotifications(userId: string, enabled: boolean): Promise<NotificationPreferences | undefined>;
  getUsersWithPushEnabled(): Promise<NotificationPreferences[]>;

  // Points system operations
  updateUserPointsSettings(userId: string, pointsEnabled: boolean): Promise<User | undefined>;
  getUserPointsBalance(userId: string): Promise<number>;
  awardPoints(userId: string, points: number): Promise<User | undefined>;
  getUserPointsStatus(userId: string): Promise<{ pointsEnabled: boolean; totalPoints: number } | undefined>;

  // Sponsored content operations
  updateAdSponsoredStatus(adId: string, sponsored: boolean): Promise<Ad | undefined>;
  updateEventSponsoredStatus(eventId: string, sponsored: boolean): Promise<LocalEvent | undefined>;
  getSponsoredAds(): Promise<Ad[]>;
  getSponsoredEvents(): Promise<LocalEvent[]>;

  // Click tracking operations
  trackAdClick(click: InsertAdClick): Promise<AdClick>;
  trackEventClick(click: InsertEventClick): Promise<EventClick>;
  getAdClickCount(adId: string): Promise<number>;
  getEventClickCount(eventId: string): Promise<number>;
  getAdClicksByDateRange(adId: string, startDate: Date, endDate: Date): Promise<AdClick[]>;
  getEventClicksByDateRange(eventId: string, startDate: Date, endDate: Date): Promise<EventClick[]>;
  
  // Analytics operations
  getSponsoredContentAnalytics(): Promise<{
    adClicks: { adId: string; bizName: string; clickCount: number; sponsored: boolean }[];
    eventClicks: { eventId: string; eventName: string; clickCount: number; sponsored: boolean }[];
    totalSponsoredAdClicks: number;
    totalSponsoredEventClicks: number;
  }>;
  getRevenueAnalytics(startDate?: Date, endDate?: Date): Promise<{
    sponsoredAdClicks: number;
    sponsoredEventClicks: number;
    clicksByDate: { date: string; adClicks: number; eventClicks: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  private initialized = false;
  private fallbackMode = false;
  private fallbackData = {
    users: new Map<string, User>(),
    items: new Map<string, Item>(),
    events: new Map<string, LocalEvent>(),
    ads: new Map<string, Ad>(),
    orders: new Map<string, Order>(),
    truckLocation: null as TruckLocation | null,
    settings: new Map<string, Settings>(),
    emailVerifications: new Map<string, EmailVerification>(),
    notificationPreferences: new Map<string, NotificationPreferences>(),
  };

  constructor() {
    // Initialize data asynchronously to avoid blocking the constructor
    this.initializeData().catch(console.error);
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeData();
    }
  }

  private async initializeData() {
    try {
      // Check if data already exists
      const existingItems = await db.select().from(items).limit(1);
      if (existingItems.length > 0) {
        this.initialized = true;
        return; // Data already initialized
      }
    } catch (error) {
      console.error('Database connection error during initialization:', error);
      console.log('App will continue with fallback data');
      this.fallbackMode = true;
      this.initializeFallbackData();
      this.initialized = true;
      return;
    }

    // Concessions Connection Menu Items - Exact specification match
    const menuItems: InsertItem[] = [
      // Starters & Snacks
      {
        name: "Jumbo Pretzel",
        description: "Warm, salted/unsalted pretzels, nacho cheese or mustard",
        price: "4.00",
        stock: 20,
        category: "starters",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Mozzarella Sticks (6)",
        description: "Served with marinara for dipping",
        price: "7.00",
        stock: 15,
        category: "starters",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Nachos",
        description: "Corn chips topped with nacho cheese (salsa & jalapeños optional)",
        price: "7.00",
        stock: 12,
        category: "starters",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "French Fries",
        description: "Plain or Old Bay seasoned",
        price: "4.00",
        stock: 25,
        category: "starters",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Chippin' Apple Dippers",
        description: "Cinnamon pita chips, fresh apples, caramel drizzle",
        price: "9.00",
        stock: 8,
        category: "starters",
        available: true,
        taxRate: "0.0600",
      },
      // Off the Grill
      {
        name: "Sliders (3)",
        description: "Horsemon Farm 100% Angus beef sliders; cheese optional; lettuce, tomato, onion; mini buns",
        price: "12.00",
        stock: 10,
        category: "grill",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Sliders (6)",
        description: "Horsemon Farm 100% Angus beef sliders; cheese optional; lettuce, tomato, onion; mini buns",
        price: "22.00",
        stock: 8,
        category: "grill",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Sliders (12)",
        description: "Horsemon Farm 100% Angus beef sliders; cheese optional; lettuce, tomato, onion; mini buns",
        price: "32.00",
        stock: 5,
        category: "grill",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Hot Dog",
        description: "Sabrett 100% beef with that \"snap\"",
        price: "4.00",
        stock: 18,
        category: "grill",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Cheese Steak Sandwich",
        description: "Rib-eye chip steak, provolone, sautéed onions & peppers, hoagie roll",
        price: "9.00",
        stock: 12,
        category: "grill",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Chicken Cheese Sandwich",
        description: "Chicken tenders, provolone, sautéed onions & peppers, hoagie roll",
        price: "9.00",
        stock: 12,
        category: "grill",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Chicken Tenders (3) & Fries",
        description: "Tenderloins with plain or seasoned fries",
        price: "9.00",
        stock: 10,
        category: "grill",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Gyro",
        description: "Lamb in pita, feta, tomatoes, onions, tzatziki",
        price: "9.00",
        stock: 8,
        category: "grill",
        available: true,
        taxRate: "0.0600",
      },
      // Refreshments
      {
        name: "Lemonade (32 oz.)",
        description: "Fresh-squeezed; optional strawberry/raspberry/blueberry purees",
        price: "8.00",
        stock: 20,
        category: "drinks",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Apple Cider",
        description: "Martinelli's, cold or warm",
        price: "4.00",
        stock: 15,
        category: "drinks",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Bottled Water",
        description: "Deer Park spring water",
        price: "2.00",
        stock: 30,
        category: "drinks",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Can, Bottle, & Boxed Drinks",
        description: "Coke, Diet/Zero, Sprite, Fanta Orange, Juicy Juice",
        price: "2.00",
        stock: 25,
        category: "drinks",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Gatorade",
        description: "Assorted flavors",
        price: "3.00",
        stock: 15,
        category: "drinks",
        available: true,
        taxRate: "0.0600",
      },
      // Extras
      {
        name: "Garden Salad",
        description: "Mixed greens, cucumbers, carrots, grape tomatoes",
        price: "7.00",
        stock: 10,
        category: "extras",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Cool Wrap",
        description: "Chicken, romaine, parmesan, croutons",
        price: "7.00",
        stock: 8,
        category: "extras",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Potato Chips",
        description: "Assorted UTZ chips",
        price: "1.50",
        stock: 40,
        category: "extras",
        available: true,
        taxRate: "0.0600",
      },
      {
        name: "Caesar Salad",
        description: "Crisp romaine, parmesan, croutons, Caesar dressing",
        price: "7.00",
        stock: 10,
        category: "extras",
        available: true,
        taxRate: "0.0600",
      },
    ];

    // Insert menu items
    try {
      // Insert menu items
      await db.insert(items).values(menuItems);

      // Sample events
      const sampleEvents: InsertLocalEvent[] = [
        {
          eventName: "Mason District Community Festival",
          dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          location: "Near Mason District Park, Annandale, VA",
          description: "Join us at the community festival for delicious food and family fun!",
          active: true,
        },
      ];

      await db.insert(localEvents).values(sampleEvents);

      // Sample ads
      const sampleAds: InsertAd[] = [
        {
          bizName: "Mason District Park",
          description: "Beautiful park with walking trails and playgrounds - 0.2 miles away",
          location: "Annandale, VA",
          link: "https://www.fairfaxcounty.gov/parks/mason-district",
          active: true,
        },
      ];

      await db.insert(ads).values(sampleAds);
      console.log('Database initialized successfully');

      // Admin seeding: Create admin users from ADMIN_EMAILS environment variable
      await this.seedAdminUsers();
    } catch (error) {
      console.error('Failed to initialize database, using fallback mode:', error);
      this.fallbackMode = true;
      this.initializeFallbackData();
    }
    this.initialized = true;
  }

  private initializeFallbackData() {
    // Complete menu data for fallback mode - matching specification exactly
    const fallbackItems: Item[] = [
      // Starters & Snacks
      {
        id: "item-1",
        name: "Jumbo Pretzel",
        description: "Warm, salted/unsalted pretzels, nacho cheese or mustard",
        price: "4.00",
        stock: 20,
        category: "starters",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-2",
        name: "Mozzarella Sticks (6)",
        description: "Served with marinara for dipping",
        price: "7.00",
        stock: 15,
        category: "starters",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-3",
        name: "Nachos",
        description: "Corn chips topped with nacho cheese (salsa & jalapeños optional)",
        price: "7.00",
        stock: 12,
        category: "starters",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-4",
        name: "French Fries",
        description: "Plain or Old Bay seasoned",
        price: "4.00",
        stock: 25,
        category: "starters",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-5",
        name: "Chippin' Apple Dippers",
        description: "Cinnamon pita chips, fresh apples, caramel drizzle",
        price: "9.00",
        stock: 8,
        category: "starters",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      // Off the Grill
      {
        id: "item-6",
        name: "Sliders (3)",
        description: "Horsemon Farm 100% Angus beef sliders; cheese optional; lettuce, tomato, onion; mini buns",
        price: "12.00",
        stock: 10,
        category: "grill",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-7",
        name: "Sliders (6)",
        description: "Horsemon Farm 100% Angus beef sliders; cheese optional; lettuce, tomato, onion; mini buns",
        price: "22.00",
        stock: 8,
        category: "grill",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-8",
        name: "Sliders (12)",
        description: "Horsemon Farm 100% Angus beef sliders; cheese optional; lettuce, tomato, onion; mini buns",
        price: "32.00",
        stock: 5,
        category: "grill",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-9",
        name: "Hot Dog",
        description: "Sabrett 100% beef with that \"snap\"",
        price: "4.00",
        stock: 18,
        category: "grill",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-10",
        name: "Cheese Steak Sandwich",
        description: "Rib-eye chip steak, provolone, sautéed onions & peppers, hoagie roll",
        price: "9.00",
        stock: 12,
        category: "grill",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-11",
        name: "Chicken Cheese Sandwich",
        description: "Chicken tenders, provolone, sautéed onions & peppers, hoagie roll",
        price: "9.00",
        stock: 12,
        category: "grill",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-12",
        name: "Chicken Tenders (3) & Fries",
        description: "Tenderloins with plain or seasoned fries",
        price: "9.00",
        stock: 10,
        category: "grill",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-13",
        name: "Gyro",
        description: "Lamb in pita, feta, tomatoes, onions, tzatziki",
        price: "9.00",
        stock: 8,
        category: "grill",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      // Refreshments
      {
        id: "item-14",
        name: "Lemonade (32 oz.)",
        description: "Fresh-squeezed; optional strawberry/raspberry/blueberry purees",
        price: "8.00",
        stock: 20,
        category: "drinks",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-15",
        name: "Apple Cider",
        description: "Martinelli's, cold or warm",
        price: "4.00",
        stock: 15,
        category: "drinks",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-16",
        name: "Bottled Water",
        description: "Deer Park spring water",
        price: "2.00",
        stock: 30,
        category: "drinks",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-17",
        name: "Can, Bottle, & Boxed Drinks",
        description: "Coke, Diet/Zero, Sprite, Fanta Orange, Juicy Juice",
        price: "2.00",
        stock: 25,
        category: "drinks",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-18",
        name: "Gatorade",
        description: "Assorted flavors",
        price: "3.00",
        stock: 15,
        category: "drinks",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      // Extras
      {
        id: "item-19",
        name: "Garden Salad",
        description: "Mixed greens, cucumbers, carrots, grape tomatoes",
        price: "7.00",
        stock: 10,
        category: "extras",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-20",
        name: "Cool Wrap",
        description: "Chicken, romaine, parmesan, croutons",
        price: "7.00",
        stock: 8,
        category: "extras",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-21",
        name: "Potato Chips",
        description: "Assorted UTZ chips",
        price: "1.50",
        stock: 40,
        category: "extras",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-22",
        name: "Caesar Salad",
        description: "Crisp romaine, parmesan, croutons, Caesar dressing",
        price: "7.00",
        stock: 10,
        category: "extras",
        imageUrl: null,
        available: true,
        updatedAt: new Date(),
      },
    ];

    fallbackItems.forEach(item => this.fallbackData.items.set(item.id, item));

    const fallbackEvent: LocalEvent = {
      id: "event-1",
      eventName: "Mason District Community Festival", 
      dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      location: "Near Mason District Park, Annandale, VA",
      description: "Join us at the community festival for delicious food and family fun!",
      imageUrl: null,
      active: true,
    };

    this.fallbackData.events.set(fallbackEvent.id, fallbackEvent);
  }

  private async seedAdminUsers(): Promise<void> {
    try {
      // Check if admin users already exist
      const existingAdminCount = await this.countAdminUsers();
      if (existingAdminCount > 0) {
        return; // Admin users already exist, no seeding needed
      }

      // Get admin emails from environment variable
      const adminEmailsEnv = process.env.ADMIN_EMAILS;
      if (!adminEmailsEnv) {
        console.log('⚠️  ADMIN_EMAILS environment variable not set. Skipping admin user seeding.');
        return;
      }

      const adminEmails = adminEmailsEnv.split(',').map(email => email.trim()).filter(email => email.length > 0);
      if (adminEmails.length === 0) {
        console.log('⚠️  No valid admin emails found in ADMIN_EMAILS. Skipping admin user seeding.');
        return;
      }

      console.log(`🔧 Seeding ${adminEmails.length} admin user(s) from ADMIN_EMAILS...`);

      // Create admin users for each email
      for (const email of adminEmails) {
        // Check if user already exists
        const existingUser = await this.getUserByEmail(email);
        if (existingUser) {
          // User exists, ensure they have admin role
          if (existingUser.role !== "admin") {
            await this.updateUserRole(existingUser.id, "admin");
            console.log(`✅ Updated existing user ${email} to admin role`);
          } else {
            console.log(`ℹ️  User ${email} already exists as admin`);
          }
        } else {
          // Create new admin user
          const adminUser = await this.createUser({
            email,
            role: "admin",
            orderHistory: [],
            preferences: {}
          });
          console.log(`✅ Created new admin user: ${email}`);
        }
      }

      console.log('🎉 Admin user seeding completed successfully');
    } catch (error) {
      console.error('❌ Failed to seed admin users:', error);
      // Don't throw error - initialization should continue even if admin seeding fails
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return this.fallbackData.users.get(id);
    }
    
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      return this.fallbackData.users.get(id);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.users.values()).find(user => user.email === email);
    }
    
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      return Array.from(this.fallbackData.users.values()).find(user => user.email === email);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const id = randomUUID();
      const user: User = {
        ...insertUser,
        id,
        role: insertUser.role || "customer",
        orderHistory: insertUser.orderHistory || [],
        preferences: insertUser.preferences || {},
        createdAt: new Date(),
      };
      this.fallbackData.users.set(id, user);
      return user;
    }
    
    try {
      const result = await db.insert(users).values(insertUser).returning();
      return result[0];
    } catch (error) {
      // Fallback to in-memory storage
      const id = randomUUID();
      const user: User = {
        ...insertUser,
        id,
        role: insertUser.role || "customer",
        orderHistory: insertUser.orderHistory || [],
        preferences: insertUser.preferences || {},
        createdAt: new Date(),
      };
      this.fallbackData.users.set(id, user);
      return user;
    }
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.users.values());
    }
    
    try {
      return await db.select().from(users);
    } catch (error) {
      return Array.from(this.fallbackData.users.values());
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.users.values())
        .filter(user => user.email.toLowerCase().includes(query.toLowerCase()));
    }
    
    try {
      return await db.select().from(users).where(ilike(users.email, `%${query}%`));
    } catch (error) {
      return Array.from(this.fallbackData.users.values())
        .filter(user => user.email.toLowerCase().includes(query.toLowerCase()));
    }
  }

  async updateUserRole(userId: string, role: "admin" | "customer"): Promise<User | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const user = this.fallbackData.users.get(userId);
      if (user) {
        user.role = role;
        this.fallbackData.users.set(userId, user);
        return user;
      }
      return undefined;
    }
    
    try {
      const result = await db.update(users).set({ role }).where(eq(users.id, userId)).returning();
      return result[0] || undefined;
    } catch (error) {
      const user = this.fallbackData.users.get(userId);
      if (user) {
        user.role = role;
        this.fallbackData.users.set(userId, user);
        return user;
      }
      return undefined;
    }
  }

  async countAdminUsers(): Promise<number> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.users.values())
        .filter(user => user.role === "admin").length;
    }
    
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "admin"));
      return Number(result[0]?.count || 0);
    } catch (error) {
      return Array.from(this.fallbackData.users.values())
        .filter(user => user.role === "admin").length;
    }
  }

  // Item operations
  async getAllItems(): Promise<Item[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.items.values());
    }
    
    try {
      return await db.select().from(items);
    } catch (error) {
      return Array.from(this.fallbackData.items.values());
    }
  }

  async getItem(id: string): Promise<Item | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return this.fallbackData.items.get(id);
    }
    
    try {
      const result = await db.select().from(items).where(eq(items.id, id)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      return this.fallbackData.items.get(id);
    }
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const id = randomUUID();
      const item: Item = {
        ...insertItem,
        id,
        description: insertItem.description ?? null,
        imageUrl: insertItem.imageUrl ?? null,
        stock: insertItem.stock ?? 0,
        available: insertItem.available ?? true,
        updatedAt: new Date(),
      };
      this.fallbackData.items.set(id, item);
      return item;
    }
    
    try {
      const result = await db.insert(items).values(insertItem).returning();
      return result[0];
    } catch (error) {
      const id = randomUUID();
      const item: Item = {
        ...insertItem,
        id,
        description: insertItem.description ?? null,
        imageUrl: insertItem.imageUrl ?? null,
        stock: insertItem.stock ?? 0,
        available: insertItem.available ?? true,
        updatedAt: new Date(),
      };
      this.fallbackData.items.set(id, item);
      return item;
    }
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<Item | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const existing = this.fallbackData.items.get(id);
      if (existing) {
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        this.fallbackData.items.set(id, updated);
        return updated;
      }
      return undefined;
    }
    
    try {
      const result = await db.update(items)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(items.id, id))
        .returning();
      return result[0] || undefined;
    } catch (error) {
      const existing = this.fallbackData.items.get(id);
      if (existing) {
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        this.fallbackData.items.set(id, updated);
        return updated;
      }
      return undefined;
    }
  }

  async updateItemStock(id: string, stock: number): Promise<Item | undefined> {
    return this.updateItem(id, { stock });
  }

  async updateItemTaxRate(id: string, taxRate: string): Promise<Item | undefined> {
    return this.updateItem(id, { taxRate });
  }

  async deleteItem(id: string): Promise<boolean> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return this.fallbackData.items.delete(id);
    }
    
    try {
      await db.delete(items).where(eq(items.id, id));
      return true;
    } catch (error) {
      return this.fallbackData.items.delete(id);
    }
  }

  // Event operations
  async getAllEvents(): Promise<LocalEvent[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.events.values());
    }
    
    try {
      return await db.select().from(localEvents);
    } catch (error) {
      return Array.from(this.fallbackData.events.values());
    }
  }

  async getActiveEvents(): Promise<LocalEvent[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.events.values()).filter(event => event.active);
    }
    
    try {
      return await db.select().from(localEvents).where(eq(localEvents.active, true));
    } catch (error) {
      return Array.from(this.fallbackData.events.values()).filter(event => event.active);
    }
  }

  async getEvent(id: string): Promise<LocalEvent | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return this.fallbackData.events.get(id);
    }
    
    try {
      const result = await db.select().from(localEvents).where(eq(localEvents.id, id)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      return this.fallbackData.events.get(id);
    }
  }

  async createEvent(insertEvent: InsertLocalEvent): Promise<LocalEvent> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const id = randomUUID();
      const event: LocalEvent = {
        ...insertEvent,
        id,
        imageUrl: insertEvent.imageUrl ?? null,
        description: insertEvent.description ?? null,
        active: insertEvent.active ?? true,
      };
      this.fallbackData.events.set(id, event);
      return event;
    }
    
    try {
      const result = await db.insert(localEvents).values(insertEvent).returning();
      return result[0];
    } catch (error) {
      const id = randomUUID();
      const event: LocalEvent = {
        ...insertEvent,
        id,
        imageUrl: insertEvent.imageUrl ?? null,
        description: insertEvent.description ?? null,
        active: insertEvent.active ?? true,
      };
      this.fallbackData.events.set(id, event);
      return event;
    }
  }

  async updateEvent(id: string, updates: Partial<LocalEvent>): Promise<LocalEvent | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const existing = this.fallbackData.events.get(id);
      if (existing) {
        const updated = { ...existing, ...updates };
        this.fallbackData.events.set(id, updated);
        return updated;
      }
      return undefined;
    }
    
    try {
      const result = await db.update(localEvents)
        .set(updates)
        .where(eq(localEvents.id, id))
        .returning();
      return result[0] || undefined;
    } catch (error) {
      const existing = this.fallbackData.events.get(id);
      if (existing) {
        const updated = { ...existing, ...updates };
        this.fallbackData.events.set(id, updated);
        return updated;
      }
      return undefined;
    }
  }

  async deleteEvent(id: string): Promise<boolean> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return this.fallbackData.events.delete(id);
    }
    
    try {
      await db.delete(localEvents).where(eq(localEvents.id, id));
      return true;
    } catch (error) {
      return this.fallbackData.events.delete(id);
    }
  }

  // Ad operations
  async getAllAds(): Promise<Ad[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.ads.values());
    }
    
    try {
      return await db.select().from(ads);
    } catch (error) {
      return Array.from(this.fallbackData.ads.values());
    }
  }

  async getActiveAds(): Promise<Ad[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.ads.values()).filter(ad => ad.active);
    }
    
    try {
      return await db.select().from(ads).where(eq(ads.active, true));
    } catch (error) {
      return Array.from(this.fallbackData.ads.values()).filter(ad => ad.active);
    }
  }

  async getAd(id: string): Promise<Ad | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return this.fallbackData.ads.get(id);
    }
    
    try {
      const result = await db.select().from(ads).where(eq(ads.id, id)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      return this.fallbackData.ads.get(id);
    }
  }

  async createAd(insertAd: InsertAd): Promise<Ad> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const id = randomUUID();
      const ad: Ad = {
        ...insertAd,
        id,
        imageUrl: insertAd.imageUrl ?? null,
        link: insertAd.link ?? null,
        description: insertAd.description ?? null,
        active: insertAd.active ?? true,
      };
      this.fallbackData.ads.set(id, ad);
      return ad;
    }
    
    try {
      const result = await db.insert(ads).values(insertAd).returning();
      return result[0];
    } catch (error) {
      const id = randomUUID();
      const ad: Ad = {
        ...insertAd,
        id,
        imageUrl: insertAd.imageUrl ?? null,
        link: insertAd.link ?? null,
        description: insertAd.description ?? null,
        active: insertAd.active ?? true,
      };
      this.fallbackData.ads.set(id, ad);
      return ad;
    }
  }

  async updateAd(id: string, updates: Partial<Ad>): Promise<Ad | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const existing = this.fallbackData.ads.get(id);
      if (existing) {
        const updated = { ...existing, ...updates };
        this.fallbackData.ads.set(id, updated);
        return updated;
      }
      return undefined;
    }
    
    try {
      const result = await db.update(ads)
        .set(updates)
        .where(eq(ads.id, id))
        .returning();
      return result[0] || undefined;
    } catch (error) {
      const existing = this.fallbackData.ads.get(id);
      if (existing) {
        const updated = { ...existing, ...updates };
        this.fallbackData.ads.set(id, updated);
        return updated;
      }
      return undefined;
    }
  }

  async deleteAd(id: string): Promise<boolean> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return this.fallbackData.ads.delete(id);
    }
    
    try {
      await db.delete(ads).where(eq(ads.id, id));
      return true;
    } catch (error) {
      return this.fallbackData.ads.delete(id);
    }
  }

  // Order operations
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    await this.ensureInitialized();
    
    try {
      const result = await db.insert(orders).values(insertOrder).returning();
      return result[0];
    } catch (error) {
      const id = randomUUID();
      const order: Order = {
        ...insertOrder,
        id,
        status: insertOrder.status ?? "pending",
        paymentStatus: insertOrder.paymentStatus ?? "pending",
        transactionId: insertOrder.transactionId ?? null,
        paymentMethod: insertOrder.paymentMethod ?? null,
        paymentAmount: insertOrder.paymentAmount ?? null,
        paymentCurrency: insertOrder.paymentCurrency ?? "USD",
        createdAt: new Date(),
      };
      this.fallbackData.orders.set(id, order);
      return order;
    }
  }

  async getOrder(orderId: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return this.fallbackData.orders.get(orderId);
    }
    
    try {
      const result = await db.select().from(orders).where(eq(orders.id, orderId));
      return result[0];
    } catch (error) {
      return this.fallbackData.orders.get(orderId);
    }
  }

  async updateOrderPaymentStatus(orderId: string, paymentStatus: string, transactionId?: string, paymentMethod?: string): Promise<Order | undefined> {
    await this.ensureInitialized();
    
    try {
      const updates: any = { paymentStatus };
      if (transactionId) updates.transactionId = transactionId;
      if (paymentMethod) updates.paymentMethod = paymentMethod;
      
      const result = await db.update(orders)
        .set(updates)
        .where(eq(orders.id, orderId))
        .returning();
      return result[0];
    } catch (error) {
      // Fallback mode
      const existingOrder = this.fallbackData.orders.get(orderId);
      if (existingOrder) {
        const updatedOrder = {
          ...existingOrder,
          paymentStatus,
          ...(transactionId && { transactionId }),
          ...(paymentMethod && { paymentMethod })
        };
        this.fallbackData.orders.set(orderId, updatedOrder);
        return updatedOrder;
      }
      return undefined;
    }
  }

  async getAllOrders(): Promise<Order[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.orders.values());
    }
    
    try {
      return await db.select().from(orders);
    } catch (error) {
      return Array.from(this.fallbackData.orders.values());
    }
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.orders.values()).filter(order => order.userId === userId);
    }
    
    try {
      return await db.select().from(orders).where(eq(orders.userId, userId));
    } catch (error) {
      return Array.from(this.fallbackData.orders.values()).filter(order => order.userId === userId);
    }
  }

  // Truck location operations
  async getTruckLocation(): Promise<TruckLocation | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return this.fallbackData.truckLocation || undefined;
    }
    
    try {
      const result = await db.select().from(truckLocation).limit(1);
      return result[0] || undefined;
    } catch (error) {
      return this.fallbackData.truckLocation || undefined;
    }
  }

  async updateTruckLocation(location: InsertTruckLocation): Promise<TruckLocation> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const id = this.fallbackData.truckLocation?.id || randomUUID();
      const truckLoc: TruckLocation = {
        ...location,
        id,
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        radius: location.radius ?? "5.00",
        gpsEnabled: location.gpsEnabled ?? false,
        updatedAt: new Date(),
      };
      this.fallbackData.truckLocation = truckLoc;
      return truckLoc;
    }
    
    try {
      // First try to update existing record
      const existing = await this.getTruckLocation();
      if (existing) {
        const result = await db.update(truckLocation)
          .set({ ...location, updatedAt: new Date() })
          .where(eq(truckLocation.id, existing.id))
          .returning();
        return result[0];
      } else {
        // Create new record
        const result = await db.insert(truckLocation).values(location).returning();
        return result[0];
      }
    } catch (error) {
      const id = this.fallbackData.truckLocation?.id || randomUUID();
      const truckLoc: TruckLocation = {
        ...location,
        id,
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        radius: location.radius ?? "5.00",
        gpsEnabled: location.gpsEnabled ?? false,
        updatedAt: new Date(),
      };
      this.fallbackData.truckLocation = truckLoc;
      return truckLoc;
    }
  }

  // Settings operations
  async getSetting(key: string): Promise<Settings | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return this.fallbackData.settings.get(key);
    }
    
    try {
      const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      return result[0] || undefined;
    } catch (error) {
      return this.fallbackData.settings.get(key);
    }
  }

  async setSetting(key: string, value: string): Promise<Settings> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const existing = this.fallbackData.settings.get(key);
      const id = existing?.id || randomUUID();
      const setting: Settings = {
        id,
        key,
        value,
        updatedAt: new Date(),
      };
      this.fallbackData.settings.set(key, setting);
      return setting;
    }
    
    try {
      // First try to update existing setting
      const existing = await this.getSetting(key);
      if (existing) {
        const result = await db.update(settings)
          .set({ value, updatedAt: new Date() })
          .where(eq(settings.id, existing.id))
          .returning();
        return result[0];
      } else {
        // Create new setting
        const result = await db.insert(settings).values({ key, value }).returning();
        return result[0];
      }
    } catch (error) {
      const existing = this.fallbackData.settings.get(key);
      const id = existing?.id || randomUUID();
      const setting: Settings = {
        id,
        key,
        value,
        updatedAt: new Date(),
      };
      this.fallbackData.settings.set(key, setting);
      return setting;
    }
  }

  async getAllSettings(): Promise<Settings[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.settings.values());
    }
    
    try {
      return await db.select().from(settings);
    } catch (error) {
      return Array.from(this.fallbackData.settings.values());
    }
  }

  // Email verification operations
  async createEmailVerification(insertVerification: InsertEmailVerification): Promise<EmailVerification> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const id = randomUUID();
      const verification: EmailVerification = {
        ...insertVerification,
        id,
        attempts: insertVerification.attempts || 0,
        verified: insertVerification.verified || false,
        createdAt: new Date(),
      };
      this.fallbackData.emailVerifications.set(id, verification);
      return verification;
    }
    
    try {
      const result = await db.insert(emailVerifications).values(insertVerification).returning();
      return result[0];
    } catch (error) {
      const id = randomUUID();
      const verification: EmailVerification = {
        ...insertVerification,
        id,
        attempts: insertVerification.attempts || 0,
        verified: insertVerification.verified || false,
        createdAt: new Date(),
      };
      this.fallbackData.emailVerifications.set(id, verification);
      return verification;
    }
  }

  async getEmailVerification(email: string, code: string): Promise<EmailVerification | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.emailVerifications.values())
        .find(v => v.email === email && v.code === code);
    }
    
    try {
      const result = await db.select().from(emailVerifications)
        .where(and(eq(emailVerifications.email, email), eq(emailVerifications.code, code)))
        .limit(1);
      return result[0] || undefined;
    } catch (error) {
      return Array.from(this.fallbackData.emailVerifications.values())
        .find(v => v.email === email && v.code === code);
    }
  }

  async getEmailVerificationByEmail(email: string): Promise<EmailVerification | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.emailVerifications.values())
        .find(v => v.email === email && !v.verified);
    }
    
    try {
      const result = await db.select().from(emailVerifications)
        .where(eq(emailVerifications.email, email))
        .orderBy(emailVerifications.createdAt)
        .limit(1);
      return result[0] || undefined;
    } catch (error) {
      return Array.from(this.fallbackData.emailVerifications.values())
        .find(v => v.email === email && !v.verified);
    }
  }

  async markEmailVerified(email: string, code: string): Promise<boolean> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const verification = Array.from(this.fallbackData.emailVerifications.values())
        .find(v => v.email === email && v.code === code);
      if (verification) {
        verification.verified = true;
        this.fallbackData.emailVerifications.set(verification.id, verification);
        return true;
      }
      return false;
    }
    
    try {
      const result = await db.update(emailVerifications)
        .set({ verified: true })
        .where(and(eq(emailVerifications.email, email), eq(emailVerifications.code, code)))
        .returning();
      return result.length > 0;
    } catch (error) {
      const verification = Array.from(this.fallbackData.emailVerifications.values())
        .find(v => v.email === email && v.code === code);
      if (verification) {
        verification.verified = true;
        this.fallbackData.emailVerifications.set(verification.id, verification);
        return true;
      }
      return false;
    }
  }

  async incrementVerificationAttempts(email: string, code: string): Promise<boolean> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const verification = Array.from(this.fallbackData.emailVerifications.values())
        .find(v => v.email === email && v.code === code);
      if (verification) {
        verification.attempts = (verification.attempts || 0) + 1;
        this.fallbackData.emailVerifications.set(verification.id, verification);
        return true;
      }
      return false;
    }
    
    try {
      const result = await db.update(emailVerifications)
        .set({ attempts: sql`attempts + 1` })
        .where(and(eq(emailVerifications.email, email), eq(emailVerifications.code, code)))
        .returning();
      return result.length > 0;
    } catch (error) {
      const verification = Array.from(this.fallbackData.emailVerifications.values())
        .find(v => v.email === email && v.code === code);
      if (verification) {
        verification.attempts = (verification.attempts || 0) + 1;
        this.fallbackData.emailVerifications.set(verification.id, verification);
        return true;
      }
      return false;
    }
  }

  async incrementVerificationAttemptsByEmail(email: string): Promise<boolean> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const verification = Array.from(this.fallbackData.emailVerifications.values())
        .find(v => v.email === email && !v.verified);
      if (verification) {
        verification.attempts = (verification.attempts || 0) + 1;
        this.fallbackData.emailVerifications.set(verification.id, verification);
        return true;
      }
      return false;
    }
    
    try {
      const result = await db.update(emailVerifications)
        .set({ attempts: sql`attempts + 1` })
        .where(and(eq(emailVerifications.email, email), eq(emailVerifications.verified, false)))
        .returning();
      return result.length > 0;
    } catch (error) {
      const verification = Array.from(this.fallbackData.emailVerifications.values())
        .find(v => v.email === email && !v.verified);
      if (verification) {
        verification.attempts = (verification.attempts || 0) + 1;
        this.fallbackData.emailVerifications.set(verification.id, verification);
        return true;
      }
      return false;
    }
  }

  async cleanupExpiredVerifications(): Promise<void> {
    await this.ensureInitialized();
    
    const now = new Date();
    
    if (this.fallbackMode) {
      const toDelete = Array.from(this.fallbackData.emailVerifications.entries())
        .filter(([_, v]) => v.expiresAt < now)
        .map(([id, _]) => id);
      
      toDelete.forEach(id => this.fallbackData.emailVerifications.delete(id));
      return;
    }
    
    try {
      await db.delete(emailVerifications)
        .where(sql`${emailVerifications.expiresAt} < ${now}`);
    } catch (error) {
      const toDelete = Array.from(this.fallbackData.emailVerifications.entries())
        .filter(([_, v]) => v.expiresAt < now)
        .map(([id, _]) => id);
      
      toDelete.forEach(id => this.fallbackData.emailVerifications.delete(id));
    }
  }

  // Notification preference operations
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.notificationPreferences.values()).find(pref => pref.userId === userId);
    }
    
    try {
      const [preference] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
      return preference;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return undefined;
    }
  }

  async createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const newPreferences: NotificationPreferences = {
        id: randomUUID(),
        ...preferences,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.fallbackData.notificationPreferences.set(newPreferences.id, newPreferences);
      return newPreferences;
    }
    
    try {
      const [created] = await db.insert(notificationPreferences).values(preferences).returning();
      return created;
    } catch (error) {
      console.error('Error creating notification preferences:', error);
      throw new Error('Failed to create notification preferences');
    }
  }

  async updateNotificationPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const existing = Array.from(this.fallbackData.notificationPreferences.values()).find(pref => pref.userId === userId);
      if (!existing) return undefined;
      
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.fallbackData.notificationPreferences.set(existing.id, updated);
      return updated;
    }
    
    try {
      const [updated] = await db.update(notificationPreferences)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return undefined;
    }
  }

  async updatePushToken(userId: string, pushToken: string): Promise<NotificationPreferences | undefined> {
    await this.ensureInitialized();
    
    return this.updateNotificationPreferences(userId, { pushToken });
  }

  async togglePushNotifications(userId: string, enabled: boolean): Promise<NotificationPreferences | undefined> {
    await this.ensureInitialized();
    
    return this.updateNotificationPreferences(userId, { pushEnabled: enabled });
  }

  async getUsersWithPushEnabled(): Promise<NotificationPreferences[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.notificationPreferences.values())
        .filter(pref => pref.pushEnabled && pref.pushToken);
    }
    
    try {
      const enabledUsers = await db.select().from(notificationPreferences)
        .where(and(
          eq(notificationPreferences.pushEnabled, true),
          sql`${notificationPreferences.pushToken} IS NOT NULL`
        ));
      return enabledUsers;
    } catch (error) {
      console.error('Error getting users with push enabled:', error);
      return [];
    }
  }

  // Points system methods
  async updateUserPointsSettings(userId: string, pointsEnabled: boolean): Promise<User | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const user = this.fallbackData.users.get(userId);
      if (user) {
        user.pointsEnabled = pointsEnabled;
        this.fallbackData.users.set(userId, user);
        return user;
      }
      return undefined;
    }
    
    try {
      const result = await db.update(users).set({ pointsEnabled }).where(eq(users.id, userId)).returning();
      return result[0] || undefined;
    } catch (error) {
      console.error('Error updating user points settings:', error);
      const user = this.fallbackData.users.get(userId);
      if (user) {
        user.pointsEnabled = pointsEnabled;
        this.fallbackData.users.set(userId, user);
        return user;
      }
      return undefined;
    }
  }

  async getUserPointsBalance(userId: string): Promise<number> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const user = this.fallbackData.users.get(userId);
      return user?.totalPoints || 0;
    }
    
    try {
      const result = await db.select({ totalPoints: users.totalPoints }).from(users).where(eq(users.id, userId)).limit(1);
      return result[0]?.totalPoints || 0;
    } catch (error) {
      console.error('Error getting user points balance:', error);
      const user = this.fallbackData.users.get(userId);
      return user?.totalPoints || 0;
    }
  }

  async awardPoints(userId: string, points: number): Promise<User | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const user = this.fallbackData.users.get(userId);
      if (user && user.pointsEnabled) {
        user.totalPoints = (user.totalPoints || 0) + points;
        this.fallbackData.users.set(userId, user);
        return user;
      }
      return undefined;
    }
    
    try {
      // First check if user has points enabled
      const userCheck = await db.select({ pointsEnabled: users.pointsEnabled, totalPoints: users.totalPoints })
        .from(users).where(eq(users.id, userId)).limit(1);
      
      if (!userCheck[0]?.pointsEnabled) {
        return undefined; // Don't award points if user hasn't opted in
      }
      
      const newTotal = (userCheck[0].totalPoints || 0) + points;
      const result = await db.update(users)
        .set({ totalPoints: newTotal })
        .where(eq(users.id, userId))
        .returning();
      return result[0] || undefined;
    } catch (error) {
      console.error('Error awarding points:', error);
      const user = this.fallbackData.users.get(userId);
      if (user && user.pointsEnabled) {
        user.totalPoints = (user.totalPoints || 0) + points;
        this.fallbackData.users.set(userId, user);
        return user;
      }
      return undefined;
    }
  }

  async getUserPointsStatus(userId: string): Promise<{ pointsEnabled: boolean; totalPoints: number } | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const user = this.fallbackData.users.get(userId);
      if (user) {
        return {
          pointsEnabled: user.pointsEnabled || false,
          totalPoints: user.totalPoints || 0
        };
      }
      return undefined;
    }
    
    try {
      const result = await db.select({ 
        pointsEnabled: users.pointsEnabled, 
        totalPoints: users.totalPoints 
      }).from(users).where(eq(users.id, userId)).limit(1);
      
      if (result[0]) {
        return {
          pointsEnabled: result[0].pointsEnabled || false,
          totalPoints: result[0].totalPoints || 0
        };
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user points status:', error);
      const user = this.fallbackData.users.get(userId);
      if (user) {
        return {
          pointsEnabled: user.pointsEnabled || false,
          totalPoints: user.totalPoints || 0
        };
      }
      return undefined;
    }
  }

  // Sponsored content operations
  async updateAdSponsoredStatus(adId: string, sponsored: boolean): Promise<Ad | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const ad = this.fallbackData.ads.get(adId);
      if (ad) {
        ad.sponsored = sponsored;
        this.fallbackData.ads.set(adId, ad);
        return ad;
      }
      return undefined;
    }
    
    try {
      const result = await db.update(ads)
        .set({ sponsored })
        .where(eq(ads.id, adId))
        .returning();
      return result[0] || undefined;
    } catch (error) {
      console.error('Error updating ad sponsored status:', error);
      const ad = this.fallbackData.ads.get(adId);
      if (ad) {
        ad.sponsored = sponsored;
        this.fallbackData.ads.set(adId, ad);
        return ad;
      }
      return undefined;
    }
  }

  async updateEventSponsoredStatus(eventId: string, sponsored: boolean): Promise<LocalEvent | undefined> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const event = this.fallbackData.events.get(eventId);
      if (event) {
        event.sponsored = sponsored;
        this.fallbackData.events.set(eventId, event);
        return event;
      }
      return undefined;
    }
    
    try {
      const result = await db.update(localEvents)
        .set({ sponsored })
        .where(eq(localEvents.id, eventId))
        .returning();
      return result[0] || undefined;
    } catch (error) {
      console.error('Error updating event sponsored status:', error);
      const event = this.fallbackData.events.get(eventId);
      if (event) {
        event.sponsored = sponsored;
        this.fallbackData.events.set(eventId, event);
        return event;
      }
      return undefined;
    }
  }

  async getSponsoredAds(): Promise<Ad[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.ads.values()).filter(ad => ad.sponsored && ad.active);
    }
    
    try {
      return await db.select().from(ads).where(and(eq(ads.sponsored, true), eq(ads.active, true)));
    } catch (error) {
      console.error('Error getting sponsored ads:', error);
      return Array.from(this.fallbackData.ads.values()).filter(ad => ad.sponsored && ad.active);
    }
  }

  async getSponsoredEvents(): Promise<LocalEvent[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return Array.from(this.fallbackData.events.values()).filter(event => event.sponsored && event.active);
    }
    
    try {
      return await db.select().from(localEvents).where(and(eq(localEvents.sponsored, true), eq(localEvents.active, true)));
    } catch (error) {
      console.error('Error getting sponsored events:', error);
      return Array.from(this.fallbackData.events.values()).filter(event => event.sponsored && event.active);
    }
  }

  // Click tracking operations
  async trackAdClick(click: InsertAdClick): Promise<AdClick> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const clickData: AdClick = {
        id: randomUUID(),
        ...click,
        clickedAt: new Date()
      };
      // In fallback mode, we'd store in memory if needed
      return clickData;
    }
    
    try {
      const result = await db.insert(adClicks).values(click).returning();
      return result[0];
    } catch (error) {
      console.error('Error tracking ad click:', error);
      const clickData: AdClick = {
        id: randomUUID(),
        ...click,
        clickedAt: new Date()
      };
      return clickData;
    }
  }

  async trackEventClick(click: InsertEventClick): Promise<EventClick> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      const clickData: EventClick = {
        id: randomUUID(),
        ...click,
        clickedAt: new Date()
      };
      // In fallback mode, we'd store in memory if needed
      return clickData;
    }
    
    try {
      const result = await db.insert(eventClicks).values(click).returning();
      return result[0];
    } catch (error) {
      console.error('Error tracking event click:', error);
      const clickData: EventClick = {
        id: randomUUID(),
        ...click,
        clickedAt: new Date()
      };
      return clickData;
    }
  }

  async getAdClickCount(adId: string): Promise<number> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return 0; // No click tracking in fallback mode
    }
    
    try {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(adClicks)
        .where(eq(adClicks.adId, adId));
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error('Error getting ad click count:', error);
      return 0;
    }
  }

  async getEventClickCount(eventId: string): Promise<number> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return 0; // No click tracking in fallback mode
    }
    
    try {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(eventClicks)
        .where(eq(eventClicks.eventId, eventId));
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error('Error getting event click count:', error);
      return 0;
    }
  }

  async getAdClicksByDateRange(adId: string, startDate: Date, endDate: Date): Promise<AdClick[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return []; // No click tracking in fallback mode
    }
    
    try {
      return await db.select().from(adClicks)
        .where(and(
          eq(adClicks.adId, adId),
          sql`${adClicks.clickedAt} >= ${startDate}`,
          sql`${adClicks.clickedAt} <= ${endDate}`
        ));
    } catch (error) {
      console.error('Error getting ad clicks by date range:', error);
      return [];
    }
  }

  async getEventClicksByDateRange(eventId: string, startDate: Date, endDate: Date): Promise<EventClick[]> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return []; // No click tracking in fallback mode
    }
    
    try {
      return await db.select().from(eventClicks)
        .where(and(
          eq(eventClicks.eventId, eventId),
          sql`${eventClicks.clickedAt} >= ${startDate}`,
          sql`${eventClicks.clickedAt} <= ${endDate}`
        ));
    } catch (error) {
      console.error('Error getting event clicks by date range:', error);
      return [];
    }
  }

  // Analytics operations
  async getSponsoredContentAnalytics(): Promise<{
    adClicks: { adId: string; bizName: string; clickCount: number; sponsored: boolean }[];
    eventClicks: { eventId: string; eventName: string; clickCount: number; sponsored: boolean }[];
    totalSponsoredAdClicks: number;
    totalSponsoredEventClicks: number;
  }> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return {
        adClicks: [],
        eventClicks: [],
        totalSponsoredAdClicks: 0,
        totalSponsoredEventClicks: 0
      };
    }
    
    try {
      // Get ad analytics
      const adAnalytics = await db.select({
        adId: ads.id,
        bizName: ads.bizName,
        sponsored: ads.sponsored,
        clickCount: sql<number>`count(${adClicks.id})`
      })
      .from(ads)
      .leftJoin(adClicks, eq(ads.id, adClicks.adId))
      .groupBy(ads.id, ads.bizName, ads.sponsored);

      // Get event analytics
      const eventAnalytics = await db.select({
        eventId: localEvents.id,
        eventName: localEvents.eventName,
        sponsored: localEvents.sponsored,
        clickCount: sql<number>`count(${eventClicks.id})`
      })
      .from(localEvents)
      .leftJoin(eventClicks, eq(localEvents.id, eventClicks.eventId))
      .groupBy(localEvents.id, localEvents.eventName, localEvents.sponsored);

      const sponsoredAdClicks = adAnalytics.filter(ad => ad.sponsored).reduce((sum, ad) => sum + Number(ad.clickCount), 0);
      const sponsoredEventClicks = eventAnalytics.filter(event => event.sponsored).reduce((sum, event) => sum + Number(event.clickCount), 0);

      return {
        adClicks: adAnalytics.map(ad => ({
          adId: ad.adId,
          bizName: ad.bizName,
          clickCount: Number(ad.clickCount),
          sponsored: ad.sponsored
        })),
        eventClicks: eventAnalytics.map(event => ({
          eventId: event.eventId,
          eventName: event.eventName,
          clickCount: Number(event.clickCount),
          sponsored: event.sponsored
        })),
        totalSponsoredAdClicks: sponsoredAdClicks,
        totalSponsoredEventClicks: sponsoredEventClicks
      };
    } catch (error) {
      console.error('Error getting sponsored content analytics:', error);
      return {
        adClicks: [],
        eventClicks: [],
        totalSponsoredAdClicks: 0,
        totalSponsoredEventClicks: 0
      };
    }
  }

  async getRevenueAnalytics(startDate?: Date, endDate?: Date): Promise<{
    sponsoredAdClicks: number;
    sponsoredEventClicks: number;
    clicksByDate: { date: string; adClicks: number; eventClicks: number }[];
  }> {
    await this.ensureInitialized();
    
    if (this.fallbackMode) {
      return {
        sponsoredAdClicks: 0,
        sponsoredEventClicks: 0,
        clicksByDate: []
      };
    }
    
    try {
      const dateFilter = startDate && endDate ? 
        sql`${adClicks.clickedAt} >= ${startDate} AND ${adClicks.clickedAt} <= ${endDate}` : 
        sql`1=1`;
      const eventDateFilter = startDate && endDate ? 
        sql`${eventClicks.clickedAt} >= ${startDate} AND ${eventClicks.clickedAt} <= ${endDate}` : 
        sql`1=1`;

      // Get sponsored ad clicks count
      const sponsoredAdClicksResult = await db.select({
        count: sql<number>`count(*)`
      })
      .from(adClicks)
      .innerJoin(ads, eq(adClicks.adId, ads.id))
      .where(and(eq(ads.sponsored, true), dateFilter));

      // Get sponsored event clicks count  
      const sponsoredEventClicksResult = await db.select({
        count: sql<number>`count(*)`
      })
      .from(eventClicks)
      .innerJoin(localEvents, eq(eventClicks.eventId, localEvents.id))
      .where(and(eq(localEvents.sponsored, true), eventDateFilter));

      // Get daily breakdown
      const dailyAdClicks = await db.select({
        date: sql<string>`date(${adClicks.clickedAt})`,
        count: sql<number>`count(*)`
      })
      .from(adClicks)
      .innerJoin(ads, eq(adClicks.adId, ads.id))
      .where(and(eq(ads.sponsored, true), dateFilter))
      .groupBy(sql`date(${adClicks.clickedAt})`);

      const dailyEventClicks = await db.select({
        date: sql<string>`date(${eventClicks.clickedAt})`,
        count: sql<number>`count(*)`
      })
      .from(eventClicks)
      .innerJoin(localEvents, eq(eventClicks.eventId, localEvents.id))
      .where(and(eq(localEvents.sponsored, true), eventDateFilter))
      .groupBy(sql`date(${eventClicks.clickedAt})`);

      // Merge daily data
      const dateMap = new Map<string, { adClicks: number; eventClicks: number }>();
      dailyAdClicks.forEach(row => {
        dateMap.set(row.date, { adClicks: Number(row.count), eventClicks: 0 });
      });
      dailyEventClicks.forEach(row => {
        const existing = dateMap.get(row.date) || { adClicks: 0, eventClicks: 0 };
        existing.eventClicks = Number(row.count);
        dateMap.set(row.date, existing);
      });

      const clicksByDate = Array.from(dateMap.entries()).map(([date, data]) => ({
        date,
        adClicks: data.adClicks,
        eventClicks: data.eventClicks
      }));

      return {
        sponsoredAdClicks: Number(sponsoredAdClicksResult[0]?.count) || 0,
        sponsoredEventClicks: Number(sponsoredEventClicksResult[0]?.count) || 0,
        clicksByDate
      };
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      return {
        sponsoredAdClicks: 0,
        sponsoredEventClicks: 0,
        clicksByDate: []
      };
    }
  }
}

export const storage = new DatabaseStorage();
