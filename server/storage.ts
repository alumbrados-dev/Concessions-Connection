import { type User, type InsertUser, type Item, type InsertItem, type LocalEvent, type InsertLocalEvent, type Ad, type InsertAd, type Order, type InsertOrder } from "@shared/schema";
import { db, users, items, localEvents, ads, orders } from "./lib/db";
import { eq } from "drizzle-orm";

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
  updateItemStock(id: string, stock: number): Promise<Item | undefined>;

  // Event operations
  getActiveEvents(): Promise<LocalEvent[]>;
  createEvent(event: InsertLocalEvent): Promise<LocalEvent>;

  // Ad operations
  getActiveAds(): Promise<Ad[]>;
  createAd(ad: InsertAd): Promise<Ad>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getUserOrders(userId: string): Promise<Order[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with sample data on first run
    this.initializeData();
  }

  private async initializeData() {
    // Check if data already exists
    const existingItems = await db.select().from(items).limit(1);
    if (existingItems.length > 0) {
      return; // Data already initialized
    }

    // Concessions Connection Menu Items
    const menuItems: InsertItem[] = [
      // Starters/Snacks
      {
        name: "Jumbo Pretzel",
        description: "Warm, salted/unsalted pretzels served w/your choice of dippings: Nacho cheese or mustard",
        price: "4.00",
        stock: 20,
        category: "starters",
        available: true,
      },
      {
        name: "Mozzarella Sticks (6)",
        description: "Delicious mozzarella cheese sticks, served w/marinara sauce for dipping",
        price: "7.00",
        stock: 15,
        category: "starters",
        available: true,
      },
      {
        name: "Nachos",
        description: "Crispy corn chips topped w/Nacho cheese (ask for salsa & jalapenos on the side)",
        price: "7.00",
        stock: 12,
        category: "starters",
        available: true,
      },
      {
        name: "French Fries",
        description: "Choice of plain or \"Old Bay\" seasoned",
        price: "4.00",
        stock: 25,
        category: "sides",
        available: true,
      },
      {
        name: "Chippin' Apple Dippers",
        description: "\"Stacey's\" cinnamon flavored pita chips, chopped farm-fresh apples & caramel sauce drizzled on top",
        price: "9.00",
        stock: 8,
        category: "starters",
        available: true,
      },
      // Off the Grill
      {
        name: "Sliders (3)",
        description: "\"Horsmon Farm's\" own—100% Angus beef; grass and grain fed; slider burgers, American cheese (optional), w/lettuce, tomato & onion, served on a mini bun",
        price: "12.00",
        stock: 10,
        category: "grill",
        available: true,
      },
      {
        name: "Sliders (6)",
        description: "\"Horsmon Farm's\" own—100% Angus beef; grass and grain fed; slider burgers, American cheese (optional), w/lettuce, tomato & onion, served on a mini bun",
        price: "22.00",
        stock: 8,
        category: "grill",
        available: true,
      },
      {
        name: "Hot Dog",
        description: "\"Sabrett\" 100% beef frankfurters that provide that perfect snap when you bite into them",
        price: "4.00",
        stock: 18,
        category: "grill",
        available: true,
      },
      {
        name: "Cheese Steak Sandwich",
        description: "Griddled rib-eye chip steak, provolone cheese, sautéed onions & peppers, served on a hoagie roll",
        price: "9.00",
        stock: 12,
        category: "grill",
        available: true,
      },
      {
        name: "Chicken Cheese Sandwich",
        description: "Grilled juicy chicken tenders, provolone cheese, sautéed onions & peppers, served on a hoagie roll",
        price: "9.00",
        stock: 12,
        category: "grill",
        available: true,
      },
      {
        name: "Chicken Tenders (3) & Fries",
        description: "Extra juicy, chicken tenderloin, w/plain or seasoned fries on the side",
        price: "9.00",
        stock: 10,
        category: "grill",
        available: true,
      },
      {
        name: "Gyro",
        description: "Lamb sliced & wrapped in pita bread, topped w/crumbled Feta cheese, tomatoes, onions, & tzatziki sauce",
        price: "9.00",
        stock: 8,
        category: "grill",
        available: true,
      },
      // Refreshments
      {
        name: "Lemonade (32 oz.)",
        description: "Fresh-squeezed lemonade, w/choice of added purees: Strawberry, Raspberry & Blueberry",
        price: "8.00",
        stock: 20,
        category: "drinks",
        available: true,
      },
      {
        name: "Apple Cider",
        description: "\"Martinelli's\" served cold or warm",
        price: "4.00",
        stock: 15,
        category: "drinks",
        available: true,
      },
      {
        name: "Bottled Water",
        description: "\"Deer Park\" spring water",
        price: "2.00",
        stock: 30,
        category: "drinks",
        available: true,
      },
      {
        name: "Canned Drinks",
        description: "Coke, Diet/Zero Cokes, Sprite, Fanta Orange & Juicy Juice",
        price: "2.00",
        stock: 25,
        category: "drinks",
        available: true,
      },
      {
        name: "Gatorade",
        description: "Sports drinks in various flavors",
        price: "3.00",
        stock: 15,
        category: "drinks",
        available: true,
      },
      // Extras
      {
        name: "Caesar Salad",
        description: "Crisp romaine lettuce, shaved parmesan cheese and seasoned croutons",
        price: "7.00",
        stock: 10,
        category: "extras",
        available: true,
      },
      {
        name: "Garden Salad",
        description: "Mixed greens, sliced cucumbers, matchstick carrots, sliced grape tomatoes",
        price: "7.00",
        stock: 10,
        category: "extras",
        available: true,
      },
      {
        name: "Cool Wrap",
        description: "Grilled chicken tenderloin, crisp romaine lettuce, shaved parmesan cheese, crumbled croutons",
        price: "7.00",
        stock: 8,
        category: "extras",
        available: true,
      },
      {
        name: "Potato Chips",
        description: "A variety of assorted chips from \"Frito Lay\"",
        price: "1.50",
        stock: 40,
        category: "extras",
        available: true,
      },
    ];

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
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Item operations
  async getAllItems(): Promise<Item[]> {
    return await db.select().from(items);
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
