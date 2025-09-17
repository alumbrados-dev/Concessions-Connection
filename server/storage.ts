import { type User, type InsertUser, type Item, type InsertItem, type LocalEvent, type InsertLocalEvent, type Ad, type InsertAd, type Order, type InsertOrder } from "@shared/schema";
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

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private items: Map<string, Item> = new Map();
  private events: Map<string, LocalEvent> = new Map();
  private ads: Map<string, Ad> = new Map();
  private orders: Map<string, Order> = new Map();

  constructor() {
    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Sample menu items
    const sampleItems: Item[] = [
      {
        id: "item-1",
        name: "Classic Burger",
        description: "Juicy beef patty with lettuce, tomato, and our special sauce",
        price: "12.99",
        stock: 8,
        category: "burgers",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-2",
        name: "Crispy Fries",
        description: "Hand-cut golden fries with sea salt",
        price: "4.99",
        stock: 2,
        category: "sides",
        imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        available: true,
        updatedAt: new Date(),
      },
      {
        id: "item-3",
        name: "Fresh Lemonade",
        description: "Freshly squeezed lemons with a hint of mint",
        price: "3.99",
        stock: 15,
        category: "drinks",
        imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        available: true,
        updatedAt: new Date(),
      },
    ];

    sampleItems.forEach(item => this.items.set(item.id, item));

    // Sample events
    const sampleEvents: LocalEvent[] = [
      {
        id: "event-1",
        eventName: "Downtown Food Festival",
        dateTime: new Date(),
        location: "Central Park - 2 blocks away",
        description: "Join us at the biggest food festival in town!",
        imageUrl: null,
        active: true,
      },
    ];

    sampleEvents.forEach(event => this.events.set(event.id, event));

    // Sample ads
    const sampleAds: Ad[] = [
      {
        id: "ad-1",
        bizName: "Joe's BBQ Pit",
        description: "Best ribs in town - 0.3 miles away",
        location: "Downtown",
        link: "https://example.com",
        imageUrl: "https://pixabay.com/get/g3d9b3e1ef31be262e22fa404be995b49fc2d2e5976e40c7e27e7338bf1fb0762794bf797c191e7cf2dd48854a7df4a5fecef88c8ad3baa41afedff4b19056da6_1280.jpg",
        active: true,
      },
    ];

    sampleAds.forEach(ad => this.ads.set(ad.id, ad));
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Item operations
  async getAllItems(): Promise<Item[]> {
    return Array.from(this.items.values());
  }

  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const id = randomUUID();
    const item: Item = {
      ...insertItem,
      id,
      updatedAt: new Date(),
    };
    this.items.set(id, item);
    return item;
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<Item | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...updates, updatedAt: new Date() };
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async updateItemStock(id: string, stock: number): Promise<Item | undefined> {
    return this.updateItem(id, { stock });
  }

  // Event operations
  async getActiveEvents(): Promise<LocalEvent[]> {
    return Array.from(this.events.values()).filter(event => event.active);
  }

  async createEvent(insertEvent: InsertLocalEvent): Promise<LocalEvent> {
    const id = randomUUID();
    const event: LocalEvent = { ...insertEvent, id };
    this.events.set(id, event);
    return event;
  }

  // Ad operations
  async getActiveAds(): Promise<Ad[]> {
    return Array.from(this.ads.values()).filter(ad => ad.active);
  }

  async createAd(insertAd: InsertAd): Promise<Ad> {
    const id = randomUUID();
    const ad: Ad = { ...insertAd, id };
    this.ads.set(id, ad);
    return ad;
  }

  // Order operations
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      createdAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.userId === userId);
  }
}

export const storage = new MemStorage();
