# Flipkart Minutes MCP Server

## Complete Technical Documentation

A comprehensive Model Context Protocol (MCP) server that transforms natural language into intelligent grocery shopping actions. This MCP enables AI assistants (like Claude, ChatGPT, or Cursor) to help users shop on Flipkart Minutes through conversation.

---

## Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [Architecture Overview](#architecture-overview)
3. [How It All Connects](#how-it-all-connects)
4. [Authentication Flow](#authentication-flow)
5. [Tool System Deep Dive](#tool-system-deep-dive)
6. [Intelligence Layers](#intelligence-layers)
7. [Conversation Flow Examples](#conversation-flow-examples)
8. [What It Can Handle](#what-it-can-handle)
9. [What It Cannot Handle](#what-it-cannot-handle)
10. [Setup & Installation](#setup--installation)
11. [Configuration](#configuration)
12. [Troubleshooting](#troubleshooting)

---

## What is MCP?

### The Model Context Protocol

MCP (Model Context Protocol) is a standardized way for AI models to interact with external tools and services. Think of it as a "USB port" for AI - a universal interface that lets AI assistants plug into any service.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Assistant  │────▶│   MCP Server    │────▶│  Backend API    │
│  (Claude/GPT)   │◀────│  (This Project) │◀────│  (Express.js)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
   Natural Language      Tool Definitions         REST APIs
   Understanding         & Handlers               & Database
```

### Why MCP Instead of Direct API Calls?

1. **Abstraction**: AI doesn't need to know API details - just tool descriptions
2. **Intelligence**: MCP adds business logic, validation, and smart defaults
3. **Context**: MCP maintains conversation state across interactions
4. **Safety**: MCP validates inputs and handles errors gracefully

---

## Architecture Overview

### System Components

```
┌────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                │
│                    (Cursor IDE / Claude Desktop)                        │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ stdio (JSON-RPC)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         MCP SERVER (TypeScript)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Tools      │  │   State      │  │   Data       │  │   Client   │ │
│  │   Registry   │  │   Manager    │  │   (Recipes)  │  │   (API)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP (REST API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER (Express.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Routes     │  │  Controllers │  │   Models     │  │   Jobs     │ │
│  │   /api/*     │  │   Logic      │  │   Mongoose   │  │  Scheduler │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ MongoDB Protocol
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           MONGODB DATABASE                              │
│   Users │ Products │ Cart │ Orders │ Addresses │ Scheduled Orders       │
└────────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
mcp-server/
├── src/
│   ├── index.ts                 # MCP server entry point
│   ├── client/
│   │   ├── FlipkartAPIClient.ts # HTTP client for backend
│   │   └── tokenStorage.ts      # Persistent auth token storage
│   ├── tools/
│   │   ├── index.ts             # Tool registry (23 tools)
│   │   ├── login_user.ts        # Authentication
│   │   ├── search_catalog.ts    # Smart product search
│   │   ├── add_to_cart_smart.ts # Cart with stock/price checks
│   │   ├── execute_order.ts     # Order placement
│   │   ├── user_preferences.ts  # Preference management
│   │   ├── recipe_to_cart.ts    # Recipe-based shopping
│   │   ├── understand_intent.ts # Intent parsing
│   │   ├── scheduled_orders.ts  # Time-based ordering
│   │   ├── order_history.ts     # History & reorder
│   │   ├── smart_suggestions.ts # Context-aware recommendations
│   │   └── conversation.ts      # Multi-turn state
│   ├── data/
│   │   └── recipes.ts           # 15 built-in recipes
│   ├── state/
│   │   └── conversation.ts      # Session state management
│   ├── types/
│   │   └── index.ts             # TypeScript definitions
│   └── utils/
│       └── logger.ts            # Logging utilities
├── package.json
└── tsconfig.json
```

---

## How It All Connects

### Step-by-Step Connection Flow

#### 1. MCP Server Startup

```typescript
// src/index.ts
const server = new Server({
  name: 'flipkart-minutes',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},  // We provide tools
  },
});

// Register tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,  // 23 tools with descriptions
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return toolHandlers[name](args);  // Route to handler
});

// Connect via stdio (standard input/output)
const transport = new StdioServerTransport();
await server.connect(transport);
```

#### 2. AI Discovers Available Tools

When an AI assistant connects, it asks "What tools do you have?"

```json
// MCP Response: List of tools
{
  "tools": [
    {
      "name": "search_catalog",
      "description": "Search the Flipkart Minutes catalog for products...",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Search query" },
          "qty_hint": { "type": "string", "description": "Optional quantity" }
        },
        "required": ["query"]
      }
    },
    // ... 23 more tools
  ]
}
```

#### 3. AI Decides Which Tool to Call

The AI reads tool descriptions and decides based on user's message:

```
User: "I want to buy milk"
AI thinks: "User wants to find a product. I should use search_catalog."
AI calls: search_catalog({ query: "milk" })
```

#### 4. MCP Processes the Call

```typescript
// src/tools/search_catalog.ts
export async function searchCatalog(params: { query: string }) {
  // 1. Call backend API
  const result = await apiClient.smartSearch(params.query);
  
  // 2. Apply intelligence (scoring, variant detection)
  const scored = applyWeightedScoring(result.products);
  
  // 3. Return structured response
  return {
    success: true,
    message: `Found ${scored.length} products for "${params.query}"`,
    data: { products: scored }
  };
}
```

#### 5. Backend API Processes Request

```javascript
// server/src/controllers/product.controller.js
export const smartSearch = async (req, res) => {
  const { query } = req.query;
  
  // MongoDB text search
  const products = await Product.find({
    $text: { $search: query },
    isAvailable: true
  }).limit(20);
  
  res.json({ success: true, data: { products } });
};
```

#### 6. Response Flows Back to User

```
MCP → AI → User
"Found 5 milk products. Top result: Amul Toned Milk 500ml at ₹28"
```

---

## Authentication Flow

### Browser-Based OAuth-like Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │     │   AI    │     │   MCP   │     │ Backend │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ "Login"       │               │               │
     │──────────────▶│               │               │
     │               │ login_user()  │               │
     │               │──────────────▶│               │
     │               │               │ POST /mcp-auth/init
     │               │               │──────────────▶│
     │               │               │◀──────────────│
     │               │               │ {code, url}   │
     │               │◀──────────────│               │
     │ "Open this URL"               │               │
     │◀──────────────│               │               │
     │               │               │               │
     │ Opens browser, logs in        │               │
     │───────────────────────────────────────────────▶
     │               │               │               │
     │               │               │ Poll /mcp-auth/status
     │               │               │──────────────▶│
     │               │               │◀──────────────│
     │               │               │ {token, user} │
     │               │◀──────────────│               │
     │ "Logged in!"  │               │               │
     │◀──────────────│               │               │
```

### Token Persistence

```typescript
// src/client/tokenStorage.ts
const TOKEN_FILE = '~/.flipkart-mcp-token';

export function saveToken(token: string, user: User) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token, user }));
}

export function loadToken(): { token: string; user: User } | null {
  if (fs.existsSync(TOKEN_FILE)) {
    return JSON.parse(fs.readFileSync(TOKEN_FILE));
  }
  return null;
}
```

**Result**: User logs in once, stays logged in across sessions.

---

## Tool System Deep Dive

### Complete Tool Inventory (23 Tools)

#### Core Shopping Tools (8)

| Tool | Purpose | When AI Uses It |
|------|---------|-----------------|
| `login_user` | Authenticate user | "Login", "Sign in" |
| `logout_user` | Clear session | "Logout", "Sign out" |
| `search_catalog` | Find products | "Find milk", "Search for rice" |
| `add_to_cart_smart` | Add with validation | "Add to cart", "Buy this" |
| `get_cart_bill` | View cart & total | "Show cart", "What's in my cart" |
| `get_addresses` | List addresses | "My addresses", "Delivery locations" |
| `validate_location` | Check serviceability | Before checkout |
| `execute_order` | Place order | "Checkout", "Place order" |

#### Intelligence Tools (5)

| Tool | Purpose | When AI Uses It |
|------|---------|-----------------|
| `understand_intent` | Parse ambiguous requests | "I want to make something" |
| `get_user_preferences` | Analyze order history | Before suggesting products |
| `get_frequent_items` | Most ordered products | Quick reorder suggestions |
| `get_shopping_patterns` | Shopping behavior | Understanding user habits |
| `get_smart_suggestions` | Context-aware recs | "What should I buy?" |

> **Note**: All preferences are derived from order history - no separate preferences storage. The system infers dietary preference (if >80% veg or non-veg), typical order size, preferred brands, and payment methods from actual orders.

#### Recipe Tools (2)

| Tool | Purpose | When AI Uses It |
|------|---------|-----------------|
| `list_recipes` | Browse recipes | "What can I make?" |
| `recipe_to_cart` | Recipe → Cart | "Make chicken biryani for 6" |

#### Scheduling Tools (4)

| Tool | Purpose | When AI Uses It |
|------|---------|-----------------|
| `schedule_order` | Create scheduled order | "Deliver at 6 PM" |
| `get_scheduled_orders` | List scheduled | "My scheduled orders" |
| `cancel_scheduled_order` | Cancel pending | "Cancel scheduled order" |
| `execute_scheduled_order` | Manual trigger | "Execute now" |

#### History Tools (3)

| Tool | Purpose | When AI Uses It |
|------|---------|-----------------|
| `get_order_history` | Past orders + analysis | "My orders", "Order history" |
| `get_last_order` | Most recent order | "Last order status" |
| `reorder` | Repeat previous order | "Order same as last time" |

#### Conversation Tools (4)

| Tool | Purpose | When AI Uses It |
|------|---------|-----------------|
| `get_conversation_context` | Get current state | Internal use |
| `update_conversation_context` | Save context | When user provides info |
| `resolve_clarification` | Mark answered | After user answers question |
| `clear_conversation_context` | Reset | "Start over" |

### How AI Knows What to Call

The AI reads tool descriptions and matches user intent:

```typescript
// Tool definition example
{
  name: 'recipe_to_cart',
  description: `Convert a recipe to a shopping cart with all required ingredients.

Features:
- Search for recipes by name or browse available recipes
- Scale ingredients based on number of servings
- Filter by dietary preference (veg/non-veg/vegan)
- Finds best matching products for each ingredient
- Suggests substitutes for unavailable items
- Shows estimated total cost before adding to cart

Available recipes include: Vegetable Sandwich, Chicken Biryani, Poha...

Use this when user wants to cook something specific.`,
  inputSchema: {
    type: 'object',
    properties: {
      recipe_name: { type: 'string', description: 'Recipe to search for' },
      servings: { type: 'number', description: 'Number of servings' },
      dietary_preference: { enum: ['veg', 'non_veg', 'vegan'] }
    }
  }
}
```

**AI Decision Process**:
```
User: "I want to make biryani for 6 people"

AI analyzes:
- "make" → cooking intent
- "biryani" → recipe name
- "6 people" → servings

AI decides: recipe_to_cart({ recipe_name: "biryani", servings: 6 })
```

---

## Intelligence Layers

### 1. Smart Search Scoring

```typescript
// Products are scored by: 60% rating + 40% price efficiency
const weightedScore = (rating * 0.6) + (priceEfficiency * 0.4);

// Price efficiency = how much value per rupee
const priceEfficiency = (1 - (price / maxPrice)) * 5;
```

**Example**:
```
Search: "milk"
Results:
1. Amul Gold 500ml - ₹32, Rating: 4.5 → Score: 4.1
2. Mother Dairy 500ml - ₹30, Rating: 4.2 → Score: 3.9
3. Nestle 1L - ₹68, Rating: 4.0 → Score: 3.2
```

### 2. Quantity Parsing

```typescript
// Parses "1kg tomatoes" into structured data
parseQuantity("1kg tomatoes") → {
  value: 1000,
  unit: 'g',
  original: '1kg'
}

// Then finds products closest to requested quantity
products.sort((a, b) => {
  const aDiff = Math.abs(a.weightGrams - 1000);
  const bDiff = Math.abs(b.weightGrams - 1000);
  return aDiff - bDiff;
});
```

### 3. Variant Detection

```typescript
// Detects when search has multiple size variants
Search: "coca cola"
→ Detects variants: 250ml, 500ml, 1L, 2L
→ Returns: "Multiple sizes available. Which do you prefer?"
```

### 4. Stock & Price Anomaly Detection

```typescript
// Before adding to cart:
if (product.stock < requestedQty) {
  return {
    success: false,
    message: "Only 3 in stock",
    alternatives: findSimilarProducts(product)
  };
}

if (priceChanged > 10%) {
  return {
    requiresUserAction: true,
    actionType: 'confirm_price_change',
    message: "Price increased by 15%. Continue?"
  };
}
```

### 5. Intent Understanding

```typescript
// Keyword-based intent detection
const RECIPE_KEYWORDS = ['make', 'cook', 'prepare', 'recipe'];
const REORDER_KEYWORDS = ['reorder', 'again', 'same', 'usual'];
const SCHEDULE_KEYWORDS = ['schedule', 'later', 'tomorrow', 'evening'];

// Entity extraction
"Make veg biryani for 4 people tomorrow evening"
→ {
  intent: 'recipe',
  recipe: 'biryani',
  dietaryPreference: 'veg',
  servings: 4,
  scheduledTime: 'tomorrow evening'
}
```

### 6. Recipe Scaling

```typescript
// Base recipe for 2 servings
const chickenBiryani = {
  servings: 2,
  ingredients: [
    { name: 'rice', quantity: 250, unit: 'g' },
    { name: 'chicken', quantity: 250, unit: 'g' },
  ]
};

// Scale for 6 servings (3x)
scaleRecipe(chickenBiryani, 6) → {
  ingredients: [
    { name: 'rice', quantity: 750, unit: 'g' },
    { name: 'chicken', quantity: 750, unit: 'g' },
  ]
}
```

### 7. Context-Aware Suggestions

```typescript
// Time-based
if (hour >= 6 && hour < 11) {
  suggest(['milk', 'bread', 'eggs', 'butter']);  // Breakfast
}

// Cart-based (complementary products)
if (cartContains('bread')) {
  suggest(['butter', 'cheese', 'jam']);
}

// Budget-based
if (cartTotal === 175 && freeDeliveryAt === 199) {
  suggest("Add ₹24 more for free delivery!");
}
```

### 8. Conversation Memory

```typescript
// State persists across turns
Turn 1: "I want to make a sandwich"
→ Context: { intent: 'recipe', pendingClarifications: ['veg/non-veg?'] }

Turn 2: "Vegetarian"
→ Context: { intent: 'recipe', dietaryPreference: 'veg' }

Turn 3: "For 4 people"
→ Context: { intent: 'recipe', dietaryPreference: 'veg', servings: 4 }
→ Now ready to call recipe_to_cart!
```

---

## Conversation Flow Examples

### Example 1: Simple Product Search

```
User: "I need milk"

AI: [Calls search_catalog({ query: "milk" })]

MCP Response:
{
  "success": true,
  "message": "Found 5 products for 'milk'",
  "data": {
    "products": [
      { "name": "Amul Toned Milk 500ml", "price": 28, "rating": 4.5 },
      { "name": "Mother Dairy Full Cream 500ml", "price": 32, "rating": 4.3 }
    ]
  }
}

AI: "I found 5 milk options. The top-rated is Amul Toned Milk 500ml at ₹28. 
     Would you like to add it to your cart?"

User: "Yes, add 2"

AI: [Calls add_to_cart_smart({ product_id: "...", qty: 2 })]

AI: "Added 2x Amul Toned Milk to your cart. Cart total: ₹56"
```

### Example 2: Recipe-Based Shopping

```
User: "I want to make chicken biryani for 6 people"

AI: [Calls recipe_to_cart({ recipe_name: "chicken biryani", servings: 6 })]

MCP Response:
{
  "success": true,
  "message": "Recipe: Chicken Biryani (6 servings)",
  "data": {
    "recipe": { "name": "Chicken Biryani", "servings": 6 },
    "items": [
      { "name": "India Gate Basmati Rice 1kg", "price": 120 },
      { "name": "Fresh Chicken Curry Cut 1kg", "price": 440 },
      { "name": "Onions 1kg", "price": 40 },
      { "name": "Fresh Curd 400g", "price": 35 },
      { "name": "Biryani Masala", "price": 75 },
      { "name": "Amul Ghee 200ml", "price": 145 },
      { "name": "Saffron 1g", "price": 180 }
    ],
    "summary": {
      "total_items": 12,
      "estimated_total": 1235
    }
  }
}

AI: "For Chicken Biryani (6 servings), you'll need:
     - Basmati Rice 1kg - ₹120
     - Chicken Curry Cut 1kg - ₹440
     - Onions 1kg - ₹40
     ... (more items)
     
     Estimated Total: ₹1,235
     
     Should I add these to your cart?"
```

### Example 3: Scheduled Order

```
User: "Order groceries for tomorrow evening party"

AI: [Calls understand_intent({ message: "..." })]

MCP Response:
{
  "intent": {
    "type": "schedule",
    "entities": { "scheduledTime": "tomorrow evening" },
    "clarificationsNeeded": [
      { "field": "items", "question": "What would you like to order?" }
    ]
  }
}

AI: "I can schedule a delivery for tomorrow evening. What would you like to order?"

User: "Snacks and drinks for 10 people"

AI: [Calls recipe_to_cart({ recipe_name: "party snacks", servings: 10 })]
AI: [Calls get_addresses()]

AI: "I've prepared a party pack with chips, drinks, and snacks. Total: ₹850.
     Which address should I deliver to?"

User: "Home address, around 5 PM"

AI: [Calls schedule_order({ 
      scheduled_time: "2024-01-16T17:00:00",
      address_id: "...",
      payment_type: "DIGITAL"
    })]

AI: "Order scheduled for tomorrow at 5 PM. You'll receive a reminder 
     30 minutes before. The order will be placed automatically."
```

### Example 4: Smart Reorder

```
User: "Order my usual weekly groceries"

AI: [Calls get_user_preferences()]
AI: [Calls get_frequent_items()]

MCP Response (preferences):
{
  "dietaryPreference": "veg",
  "householdSize": 4
}

MCP Response (frequent items):
{
  "frequentItems": [
    { "name": "Amul Milk 500ml", "orderCount": 12 },
    { "name": "Britannia Bread", "orderCount": 8 },
    { "name": "Eggs 6pcs", "orderCount": 6 },
    { "name": "Tomatoes 1kg", "orderCount": 5 }
  ]
}

AI: "Based on your history, your weekly essentials are:
     - Amul Milk 500ml x 7 (you order daily)
     - Britannia Bread x 2
     - Eggs 6pcs x 2
     - Tomatoes 1kg
     - Onions 1kg
     
     Total: ₹485
     
     Last week you also added bananas. Include them?"
```

### Example 5: Clarification Flow

```
User: "I want to make a sandwich"

AI: [Calls understand_intent({ message: "I want to make a sandwich" })]

MCP Response:
{
  "intent": {
    "type": "recipe",
    "entities": { "recipe": "sandwich" },
    "clarificationsNeeded": [
      { 
        "field": "dietaryPreference",
        "question": "Would you prefer vegetarian or non-vegetarian?",
        "options": ["Vegetarian", "Non-Vegetarian"]
      },
      {
        "field": "servings",
        "question": "How many people are you making it for?",
        "options": ["1-2 people", "3-4 people", "5-6 people"]
      }
    ]
  }
}

AI: "I'd love to help you make a sandwich! A few questions:
     1. Would you prefer vegetarian or non-vegetarian?
     2. How many people are you making it for?"

User: "Veg, for 4 people"

AI: [Calls update_conversation_context({ 
      dietary_preference: "veg", 
      servings: 4 
    })]
AI: [Calls recipe_to_cart({ 
      recipe_name: "veg sandwich", 
      servings: 4,
      dietary_preference: "veg"
    })]

AI: "For a Veg Sandwich (4 servings), you'll need:
     - Britannia Bread - ₹45
     - Amul Cheese Slices - ₹120
     - Fresh Tomatoes - ₹35
     - Green Capsicum - ₹60
     - Amul Butter - ₹56
     
     Total: ₹316
     
     Want to add any spreads or sauces?"
```

---

## What It Can Handle

### Shopping Scenarios ✅

| Scenario | How It Handles |
|----------|----------------|
| Product search | Smart search with scoring, quantity parsing |
| Add to cart | Stock validation, price change detection |
| Checkout | Address validation, COD eligibility check |
| Order tracking | Real-time status updates |
| Reorder | From order history with availability check |

### Intelligence Scenarios ✅

| Scenario | How It Handles |
|----------|----------------|
| "Make biryani for 6" | Recipe lookup, ingredient scaling, cart building |
| "I'm vegetarian" | Saves preference, filters future suggestions |
| "Deliver at 6 PM" | Creates scheduled order, auto-executes |
| "What should I buy?" | Time/cart/budget-aware suggestions |
| "Order my usual" | Analyzes history, suggests frequent items |

### Edge Cases Handled ✅

| Edge Case | Handling |
|-----------|----------|
| Out of stock | Suggests alternatives |
| Price increased >10% | Asks for confirmation |
| Ambiguous request | Asks clarifying questions |
| Multiple variants | Shows options to choose |
| COD limit exceeded | Suggests UPI payment |
| Address not serviceable | Informs user, suggests other addresses |

---

## What It Cannot Handle

### Technical Limitations ❌

| Limitation | Reason |
|------------|--------|
| Real payments | Uses mock payment system |
| Actual delivery | No real logistics integration |
| Live inventory | Database is seeded, not real-time |
| Push notifications | No mobile app integration |
| Voice input | Text-only interface |

### Intelligence Limitations ❌

| Limitation | Reason |
|------------|--------|
| Complex dietary needs | Only veg/non-veg/vegan, no allergen filtering |
| Nutritional advice | No calorie/macro tracking |
| Price comparison | Single store only |
| Custom recipes | Only 15 built-in recipes |
| Natural language edge cases | Keyword-based, not true NLU |

### Scenarios Not Supported ❌

```
❌ "Find the cheapest milk across all stores"
   → Only searches Flipkart Minutes catalog

❌ "I'm allergic to gluten, suggest breakfast"
   → Allergy stored but not used for filtering

❌ "What's the nutritional value of this?"
   → No nutritional data in product catalog

❌ "Cancel my order from yesterday"
   → Can only cancel within 5-minute window

❌ "Track my delivery in real-time"
   → Simulated tracking, not real GPS

❌ "Pay with credit card"
   → Only COD and UPI supported
```

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Step 1: Clone & Install

```bash
# Clone repository
git clone <repo-url>
cd Fk-MCP

# Install backend dependencies
cd server && npm install

# Install MCP server dependencies
cd ../mcp-server && npm install
```

### Step 2: Configure Environment

**Backend (.env)**:
```env
MONGODB_URI=mongodb://localhost:27017/flipkart-minutes
JWT_SECRET=your-secret-key
PORT=5000
CLIENT_URL=http://localhost:5173
```

**MCP Server** (uses backend URL from code):
```typescript
// src/client/FlipkartAPIClient.ts
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
```

### Step 3: Seed Database

```bash
cd server
npm run seed
```

### Step 4: Start Services

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: MCP Server (for development)
cd mcp-server && npm run dev
```

### Step 5: Configure AI Client

**For Cursor IDE** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "flipkart-minutes": {
      "command": "node",
      "args": ["/path/to/Fk-MCP/mcp-server/dist/index.js"]
    }
  }
}
```

**For Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "flipkart-minutes": {
      "command": "node",
      "args": ["/path/to/Fk-MCP/mcp-server/dist/index.js"]
    }
  }
}
```

### Step 6: Build for Production

```bash
cd mcp-server
npm run build  # Compiles TypeScript to dist/
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:5000` | Backend API URL |
| `LOG_LEVEL` | `info` | Logging verbosity |

### Customization Points

**Add New Recipe**:
```typescript
// src/data/recipes.ts
export const recipes: Recipe[] = [
  {
    id: 'my-recipe',
    name: 'My Custom Recipe',
    servings: 2,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'ingredient1', baseQuantity: 100, unit: 'g', optional: false }
    ],
    // ...
  }
];
```

**Add New Tool**:
```typescript
// 1. Create src/tools/my_tool.ts
export const myToolDefinition = {
  name: 'my_tool',
  description: 'What this tool does...',
  inputSchema: { /* ... */ }
};

export async function myTool(params: MyParams): Promise<ToolResponse> {
  // Implementation
}

// 2. Register in src/tools/index.ts
export const toolDefinitions = [
  // ...existing tools
  myToolDefinition,
];

export const toolHandlers = {
  // ...existing handlers
  my_tool: (params) => myTool(params),
};
```

---

## Troubleshooting

### Common Issues

**"Please login first"**
- User hasn't authenticated
- Token expired (re-login needed)
- Token file corrupted (delete `~/.flipkart-mcp-token`)

**"Product not found"**
- Database not seeded (`npm run seed`)
- Search query too specific
- Product out of stock

**"Address not serviceable"**
- Address pincode not in serviceable list
- Address not linked to user

**"Cannot schedule order"**
- Cart is empty
- Scheduled time less than 30 mins in future
- Address not validated

### Debug Mode

```bash
# Run with verbose logging
DEBUG=* npm run dev
```

### Check Backend Health

```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok","message":"Flipkart Minutes API is running"}
```

---

## Summary

The Flipkart Minutes MCP transforms natural language into intelligent shopping actions through:

1. **24 specialized tools** covering all shopping scenarios
2. **Smart search** with scoring, quantity parsing, and variant detection
3. **Recipe intelligence** with 15 built-in recipes and scaling
4. **Scheduled ordering** with background job processing
5. **Context awareness** through conversation state management
6. **Proactive suggestions** based on time, cart, and history

The system handles the complexity of e-commerce (stock, pricing, addresses, payments) while presenting a simple conversational interface to users.

---

## License

MIT
