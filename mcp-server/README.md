# Flipkart Minutes MCP Server

A Model Context Protocol (MCP) server for the Flipkart Minutes quick commerce application. This server enables AI assistants to interact with the Flipkart Minutes API for shopping, cart management, and order tracking.

## Features

- **Product Discovery**: Search, filter, and browse products by category
- **Cart Management**: Add, update, remove items with confirmation workflow
- **Address Management**: Create and manage delivery addresses
- **Checkout & Payment**: Process orders with UPI or Cash on Delivery
- **Order Tracking**: Real-time order status with rider information

## Prerequisites

- Python 3.10+ (install via `brew install python@3.12` on macOS)
- Flipkart Minutes API server running on `http://localhost:5000`

## Installation

1. Create a virtual environment with Python 3.10+:
   ```bash
   # On macOS with Homebrew Python
   /opt/homebrew/bin/python3.12 -m venv venv
   
   # Or if python3 is 3.10+
   python3 -m venv venv
   ```

2. Activate the virtual environment:
   ```bash
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

```bash
source venv/bin/activate  # Make sure venv is activated
python mcp_server.py
```

The MCP server will start and be available for AI assistant connections.

## Available Tools

### Authentication
| Tool | Description |
|------|-------------|
| `login` | Login to Flipkart Minutes account |
| `register` | Create a new account |
| `get_current_user` | Get logged-in user profile |

### Product Discovery
| Tool | Description |
|------|-------------|
| `search_products` | Search products by name/description |
| `get_categories` | List all product categories |
| `get_products_by_category` | Browse products in a category |
| `filter_products` | Advanced filtering (price, dietary, brand) |
| `get_product_details` | Get full product information |
| `get_alternative_products` | Find similar products |
| `get_featured_products` | Get popular/recommended items |

### Cart Management
| Tool | Description |
|------|-------------|
| `view_cart` | View cart contents and bill |
| `add_to_cart` | Add item (with confirmation workflow) |
| `update_cart_item` | Change item quantity |
| `remove_from_cart` | Remove item from cart |
| `clear_cart` | Empty the entire cart |

### Address Management
| Tool | Description |
|------|-------------|
| `get_addresses` | List saved addresses |
| `create_address` | Add new delivery address |
| `set_default_address` | Set default address |

### Checkout & Payment
| Tool | Description |
|------|-------------|
| `proceed_to_checkout` | Create order from cart |
| `set_payment_mode` | Choose UPI or COD |
| `process_payment` | Complete payment |

### Order Management
| Tool | Description |
|------|-------------|
| `get_order_history` | View past orders |
| `get_order_details` | Get specific order info |
| `track_order` | Real-time tracking with rider info |
| `cancel_order` | Cancel an order |
| `reorder` | Reorder from previous order |

### Utility
| Tool | Description |
|------|-------------|
| `check_api_health` | Verify API server is running |

## Core Directive

**IMPORTANT**: The `add_to_cart` tool implements a mandatory confirmation workflow:

1. First call with `confirmed=False` returns product details (price, ETA)
2. Present this information to the user
3. Only call with `confirmed=True` after explicit user confirmation ("Yes", "Confirm")

This ensures users always see pricing before items are added to their cart.

## Configuration

The server connects to `http://localhost:5000/api` by default. Modify `BASE_URL` in `mcp_server.py` to change this.

## Example Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "flipkart-minutes": {
      "command": "python",
      "args": ["/path/to/mcp-server/mcp_server.py"]
    }
  }
}
```

## License

MIT

