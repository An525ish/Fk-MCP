# Flipkart Minutes MCP Server

A Model Context Protocol (MCP) server that bridges Cursor AI with the Flipkart Minutes API, enabling natural language shopping experiences.

## Features

- **Smart Product Search**: Weighted scoring (60% rating + 40% price efficiency)
- **Quantity Parsing**: "1kg tomato" automatically prioritizes products closest to 1000g
- **Variant Detection**: Handles ambiguity (e.g., Coke 250ml vs 2L) by asking for user selection
- **Stock Anomaly Handling**: Auto-suggests alternatives when items go out of stock
- **Price Protection**: Alerts when prices change >10% between search and checkout
- **COD Guardrails**: Validates COD eligibility and suggests UPI when limits are exceeded

## Tools

| Tool | Description |
|------|-------------|
| `login_user` | Authenticate with Flipkart Minutes |
| `search_catalog` | Smart search with weighted scoring and variant detection |
| `add_to_cart_smart` | Add items with stock validation and price protection |
| `get_cart_bill` | Get cart contents and bill breakdown |
| `get_addresses` | List saved delivery addresses |
| `validate_location` | Check if Flipkart Minutes delivers to an address |
| `execute_order` | Place order with COD or UPI payment |

## Setup

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Configure Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json` or Cursor settings):

```json
{
  "mcpServers": {
    "flipkart-minutes": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/Fk-MCP/mcp-server",
      "env": {
        "FLIPKART_API_URL": "http://localhost:5000",
        "MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

### 4. Start the Backend

Make sure the Flipkart Minutes backend is running:

```bash
cd ../server
npm run dev
```

## Usage Examples

### Recipe-to-Cart Flow (Biryani)

```
User: "I want to make Biryani"

AI will:
1. Generate list of ingredients (rice, chicken, masala, etc.)
2. Search for each ingredient
3. Present options for items with multiple variants
4. Show recipe summary with total cost
5. Ask for confirmation before checkout
```

### Quantity-Based Search (Tomato)

```
User: "Add 1kg tomato to cart"

AI will:
1. Search for tomatoes with quantity hint
2. Prioritize products closest to 1000g
3. Use weighted score (rating + price) for tie-breaking
4. Add best match to cart
```

### Ambiguity Handling (Coke)

```
User: "Add Coke to cart"

AI will:
1. Detect multiple variants (250ml, 500ml, 1L, 2L)
2. Stop and ask: "I found multiple Coke sizes. Which one would you like?"
3. List options with prices
4. Wait for user selection
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLIPKART_API_URL` | `http://localhost:5000` | Backend API URL |
| `MCP_LOG_LEVEL` | `debug` | Logging level (debug, info, warn, error) |

## Development

```bash
# Run in development mode (with hot reload)
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build
```

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Cursor AI  │────▶│   MCP Server    │────▶│ Flipkart Minutes │
│   (LLM)     │◀────│  (This Server)  │◀────│     Backend      │
└─────────────┘     └─────────────────┘     └──────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
               ┌────▼────┐  ┌─────▼─────┐
               │  Tools  │  │  Logger   │
               └─────────┘  └───────────┘
```

## License

MIT
