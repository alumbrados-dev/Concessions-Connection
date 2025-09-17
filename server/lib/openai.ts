import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key"
});

export interface AIHostessContext {
  currentItem?: string;
  cartItems?: Array<{ name: string; price: string; quantity: number }>;
  menuItems?: Array<{ name: string; price: string; category: string }>;
}

export async function generateHostessResponse(
  userMessage: string,
  context: AIHostessContext = {}
): Promise<{ message: string; suggestedActions: string[] }> {
  try {
    const systemPrompt = `You are a friendly AI hostess for Mr Food Truck (also known as Concessions Connection), a family-run mobile food truck. Your role is to:
1. Welcome customers warmly
2. Help them navigate the menu
3. Suggest complementary items and upsells (combos, drinks, sides)
4. Answer questions about food items
5. Keep conversations focused on the menu and ordering
6. Be concise and enthusiastic

Current context:
- Current item being viewed: ${context.currentItem || 'none'}
- Items in cart: ${JSON.stringify(context.cartItems || [])}
- Available menu items: ${JSON.stringify(context.menuItems || [])}

Guidelines:
- Always stay on topic (food ordering)
- Suggest combos when appropriate
- Mention popular items
- Be helpful but not pushy
- Use friendly, casual language
- Keep responses under 50 words

Respond with JSON in this format: { "message": "your response", "suggestedActions": ["action1", "action2"] }

Available actions: "add_combo", "view_specials", "checkout", "add_item", "view_category"`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"message": "Hello! How can I help you today?", "suggestedActions": ["view_specials"]}');

    return {
      message: result.message,
      suggestedActions: result.suggestedActions || []
    };
  } catch (error) {
    console.error('AI Hostess error:', error);
    return {
      message: "Hi! Welcome to TruckEats! How can I help you today?",
      suggestedActions: ["view_specials"]
    };
  }
}
