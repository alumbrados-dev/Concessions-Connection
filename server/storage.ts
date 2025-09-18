import { type User, type InsertUser, type Item, type InsertItem, type LocalEvent, type InsertLocalEvent, type Ad, type InsertAd, type Order, type InsertOrder, type TruckLocation, type InsertTruckLocation, type Settings, type InsertSettings } from "@shared/schema";
import { db, users, items, localEvents, ads, orders, truckLocation, settings } from "./lib/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Item operations
  getAllItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, updates: Partial<Item>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;
  updateItemStock(id: string, stock: number): Promise<Item | undefined>;

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
  getUserOrders(userId: string): Promise<Order[]>;

  // Truck location operations
  getTruckLocation(): Promise<TruckLocation | undefined>;
  updateTruckLocation(location: InsertTruckLocation): Promise<TruckLocation>;

  // Settings operations
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(key: string, value: string): Promise<Settings>;
  getAllSettings(): Promise<Settings[]>;
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
      },
      {
        name: "Mozzarella Sticks (6)",
        description: "Served with marinara for dipping",
        price: "7.00",
        stock: 15,
        category: "starters",
        available: true,
      },
      {
        name: "Nachos",
        description: "Corn chips topped with nacho cheese (salsa & jalapeños optional)",
        price: "7.00",
        stock: 12,
        category: "starters",
        available: true,
      },
      {
        name: "French Fries",
        description: "Plain or Old Bay seasoned",
        price: "4.00",
        stock: 25,
        category: "starters",
        available: true,
      },
      {
        name: "Chippin' Apple Dippers",
        description: "Cinnamon pita chips, fresh apples, caramel drizzle",
        price: "9.00",
        stock: 8,
        category: "starters",
        available: true,
      },
      // Off the Grill
      {
        name: "Sliders (3)",
        description: "Horsemon Farm 100% Angus beef sliders; cheese optional; lettuce, tomato, onion; mini buns",
        price: "12.00",
        stock: 10,
        category: "grill",
        available: true,
      },
      {
        name: "Sliders (6)",
        description: "Horsemon Farm 100% Angus beef sliders; cheese optional; lettuce, tomato, onion; mini buns",
        price: "22.00",
        stock: 8,
        category: "grill",
        available: true,
      },
      {
        name: "Sliders (12)",
        description: "Horsemon Farm 100% Angus beef sliders; cheese optional; lettuce, tomato, onion; mini buns",
        price: "32.00",
        stock: 5,
        category: "grill",
        available: true,
      },
      {
        name: "Hot Dog",
        description: "Sabrett 100% beef with that \"snap\"",
        price: "4.00",
        stock: 18,
        category: "grill",
        available: true,
      },
      {
        name: "Cheese Steak Sandwich",
        description: "Rib-eye chip steak, provolone, sautéed onions & peppers, hoagie roll",
        price: "9.00",
        stock: 12,
        category: "grill",
        available: true,
      },
      {
        name: "Chicken Cheese Sandwich",
        description: "Chicken tenders, provolone, sautéed onions & peppers, hoagie roll",
        price: "9.00",
        stock: 12,
        category: "grill",
        available: true,
      },
      {
        name: "Chicken Tenders (3) & Fries",
        description: "Tenderloins with plain or seasoned fries",
        price: "9.00",
        stock: 10,
        category: "grill",
        available: true,
      },
      {
        name: "Gyro",
        description: "Lamb in pita, feta, tomatoes, onions, tzatziki",
        price: "9.00",
        stock: 8,
        category: "grill",
        available: true,
      },
      // Refreshments
      {
        name: "Lemonade (32 oz.)",
        description: "Fresh-squeezed; optional strawberry/raspberry/blueberry purees",
        price: "8.00",
        stock: 20,
        category: "drinks",
        available: true,
      },
      {
        name: "Apple Cider",
        description: "Martinelli's, cold or warm",
        price: "4.00",
        stock: 15,
        category: "drinks",
        available: true,
      },
      {
        name: "Bottled Water",
        description: "Deer Park spring water",
        price: "2.00",
        stock: 30,
        category: "drinks",
        available: true,
      },
      {
        name: "Can, Bottle, & Boxed Drinks",
        description: "Coke, Diet/Zero, Sprite, Fanta Orange, Juicy Juice",
        price: "2.00",
        stock: 25,
        category: "drinks",
        available: true,
      },
      {
        name: "Gatorade",
        description: "Assorted flavors",
        price: "3.00",
        stock: 15,
        category: "drinks",
        available: true,
      },
      // Extras
      {
        name: "Garden Salad",
        description: "Mixed greens, cucumbers, carrots, grape tomatoes",
        price: "7.00",
        stock: 10,
        category: "extras",
        available: true,
      },
      {
        name: "Cool Wrap",
        description: "Chicken, romaine, parmesan, croutons",
        price: "7.00",
        stock: 8,
        category: "extras",
        available: true,
      },
      {
        name: "Potato Chips",
        description: "Assorted UTZ chips",
        price: "1.50",
        stock: 40,
        category: "extras",
        available: true,
      },
      {
        name: "Caesar Salad",
        description: "Crisp romaine, parmesan, croutons, Caesar dressing",
        price: "7.00",
        stock: 10,
        category: "extras",
        available: true,
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
        orderHistory: insertUser.orderHistory || [],
        preferences: insertUser.preferences || {},
        createdAt: new Date(),
      };
      this.fallbackData.users.set(id, user);
      return user;
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
    const result = await db.select().from(items).where(eq(items.id, id)).limit(1);
    return result[0] || undefined;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const result = await db.insert(items).values(insertItem).returning();
    return result[0];
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<Item | undefined> {
    const result = await db.update(items)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return result[0] || undefined;
  }

  async updateItemStock(id: string, stock: number): Promise<Item | undefined> {
    return this.updateItem(id, { stock });
  }

  // Event operations
  async getActiveEvents(): Promise<LocalEvent[]> {
    return await db.select().from(localEvents).where(eq(localEvents.active, true));
  }

  async createEvent(insertEvent: InsertLocalEvent): Promise<LocalEvent> {
    const result = await db.insert(localEvents).values(insertEvent).returning();
    return result[0];
  }

  // Ad operations
  async getActiveAds(): Promise<Ad[]> {
    return await db.select().from(ads).where(eq(ads.active, true));
  }

  async createAd(insertAd: InsertAd): Promise<Ad> {
    const result = await db.insert(ads).values(insertAd).returning();
    return result[0];
  }

  // Order operations
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(insertOrder).returning();
    return result[0];
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }
}

export const storage = new DatabaseStorage();
