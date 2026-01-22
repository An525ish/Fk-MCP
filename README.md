# Flipkart Minutes Clone

A full-stack e-commerce application built with MERN stack (MongoDB, Express, React, Node.js) that replicates the Flipkart Minutes grocery delivery experience.

## Features

### Backend APIs (15 Endpoints)
- **Authentication**: `login_user`, `register`
- **Products**: `search_items`, `filter_products`, `get_alternatives`
- **Cart**: `add_to_cart`, `remove_from_cart`, `get_cart_contents`
- **Checkout**: `proceed_to_checkout`, `set_payment_mode`, `process_payment`
- **Orders**: `get_order_status`, `get_order_history`, `cancel_order`
- **Address**: `get_available_addresses`, `set_delivery_location`

### Frontend Features
- Flipkart-style UI with blue theme
- Category carousel and product grid
- Product search with text indexing
- Filters (price, dietary preference)
- Shopping cart with quantity controls
- Checkout flow with address selection
- Mock UPI/COD payment
- Real-time order tracking with simulated rider updates
- Order history
- Address management

## Tech Stack

### Frontend
- React 19
- Vite 7
- Tailwind CSS 4
- Redux Toolkit 2.5
- React Router 7
- Axios 1.7
- React Hot Toast
- React Icons

### Backend
- Node.js 18+
- Express 5
- MongoDB with Mongoose 8
- JWT Authentication
- bcryptjs for password hashing
- express-validator

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Quick Start

1. **Install all dependencies**
```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

2. **Configure environment variables**

Backend `.env` (server/.env):
```env
MONGODB_URI=mongodb://localhost:27017/flipkart-minutes
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_URL=http://localhost:5173
```

Frontend `.env` (client/.env):
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Flipkart Minutes
```

3. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas connection string in MONGODB_URI
```

4. **Seed the database**
```bash
cd server
npm run seed
```

The seed script is **idempotent** - you can run it multiple times safely:
- First run: Creates all data
- Subsequent runs: Skips if data exists
- Force fresh seed: `npm run seed -- --fresh`

5. **Start the servers**

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

### Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

### Demo Credentials
- **Email**: `test@example.com`
- **Password**: `password123`

## Integration Details

### Frontend-Backend Communication
- Frontend uses Vite proxy in development (`/api` -> `localhost:5000`)
- Axios instance with JWT token interceptor
- Automatic token refresh handling
- CORS configured for cross-origin requests

### API Route Mapping

| Frontend API Call | Backend Route |
|-------------------|---------------|
| `authAPI.login()` | POST `/api/auth/login` |
| `productAPI.getCategories()` | GET `/api/products/categories` |
| `productAPI.searchProducts()` | GET `/api/products/search` |
| `cartAPI.getCart()` | GET `/api/cart` |
| `orderAPI.getOrderStatus()` | GET `/api/orders/:id/status` |
| `addressAPI.getAddresses()` | GET `/api/addresses` |

## Project Structure

```
Fk-MCP/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── common/        # Header, Footer, Loader
│   │   │   ├── home/          # CategoryCarousel
│   │   │   └── product/       # ProductCard
│   │   ├── pages/             # Page components
│   │   ├── store/             # Redux store & slices
│   │   ├── services/          # API service layer
│   │   └── index.css          # Tailwind styles
│   └── package.json
│
└── server/                    # Express Backend
    ├── src/
    │   ├── config/            # DB, constants
    │   ├── controllers/       # Route handlers
    │   ├── middleware/        # Auth, validation, error
    │   ├── models/            # Mongoose schemas
    │   ├── routes/            # API routes
    │   └── seed/              # Database seeding
    ├── server.js
    └── package.json
```

## API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/categories` | Get all categories |
| GET | `/api/products/category/:id` | Get products by category |
| GET | `/api/products/search?q=` | Search products |
| GET | `/api/products/filter` | Filter products |
| GET | `/api/products/:id` | Get single product |
| GET | `/api/products/:id/alternatives` | Get similar products |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get cart contents |
| POST | `/api/cart/items` | Add item to cart |
| PUT | `/api/cart/items/:productId` | Update item quantity |
| DELETE | `/api/cart/items/:productId` | Remove item |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/checkout` | Create order |
| PUT | `/api/orders/:id/payment-mode` | Set payment mode |
| POST | `/api/orders/:id/pay` | Process payment |
| GET | `/api/orders/:id/status` | Get order status |
| GET | `/api/orders` | Get order history |
| POST | `/api/orders/:id/cancel` | Cancel order |

### Addresses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/addresses` | Get all addresses |
| POST | `/api/addresses` | Create address |
| PUT | `/api/addresses/:id` | Update address |
| DELETE | `/api/addresses/:id` | Delete address |
| POST | `/api/session/location` | Set delivery location |

## Seed Data
The seed script creates:
- 10 grocery categories
- 50+ products with realistic prices and images
- 1 test user with 2 addresses

## License
MIT
