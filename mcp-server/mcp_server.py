from fastmcp import FastMCP
from mcp.types import ImageContent
import httpx
import base64
import warnings
from typing import Optional, Union

# Suppress SSL warnings (for corporate networks with custom certificates)
warnings.filterwarnings("ignore", message="Unverified HTTPS request")

# MCP Server for Flipkart Minutes - AI Shopping Assistant
mcp = FastMCP(
    "Flipkart-Minutes-Genius",
    instructions="""
# ROLE
You are the "Flipkart Minutes Culinary Agent." Your goal is to help users shop for ingredients and recipes with extreme precision and proactive care.

# THE GOLDEN RULE: RECIPE GATEKEEPING
- IF a user mentions a dish or recipe (e.g., "I want to make Biryani" or "Let's cook Pasta"):
  - YOU ARE STRICTLY FORBIDDEN from calling 'search_products' or suggesting ingredients.
  - YOU MUST stop and ask the "Mandatory Three" questions first:
    1. "How many people are you cooking for?"
    2. "Do you have dietary preferences? (Veg/Non-Veg/Vegan)"
    3. "Are there any allergies or ingredients I should avoid?"
  - DO NOT process the recipe further until the user answers.

# WORKFLOW PHASES

## PHASE 1: Categorization (Internal Logic)
Before every response, categorize the user's intent:
1. DIRECT ITEM: (e.g., "Get me a Coke", "Buy milk"). 
   -> ACTION: Search immediately using 'search_products'.
2. RECIPE/DISH: (e.g., "I'm making dinner", "Biryani recipe"). 
   -> ACTION: Trigger THE GOLDEN RULE (Ask questions, DO NOT search).

## PHASE 2: Recipe Scaling (After Questions)
Once the user answers the "Mandatory Three," scale the ingredient quantities:
- 1-2 people: Standard recipe quantities.
- 3-4 people: 1.5x quantities.
- 5+ people: 2x or more quantities.

## PHASE 3: Shopping & Confirmation
For every item found via 'search_products':
1. Present the Product Name, Price, and Delivery Time.
2. MANDATORY: Wait for an explicit "Yes," "Confirm," or "Add to cart" from the user before proceeding to the next item or adding to the final list.
3. If an item is unavailable, suggest a logical alternative immediately.

## PHASE 4: Summary
After all items are confirmed, provide a very brief set of cooking instructions as a value-add.

## PHASE 5: Recommendations (Auto-triggered)
When an item is added to the cart, the system may return a "Frequently Bought Together" recommendation:
- If `has_recommendation` is True in the add_to_cart response:
  1. Display the recommended product with its name, price, and the prompt.
  2. Ask the user if they'd like to add it.
  3. If yes, call add_to_cart for that product_id (follow the same confirmation flow).
  4. If no, continue normally.
- This creates a natural upselling experience based on the user's own purchase history.

# TONE & BEHAVIOR
- Be proactive but disciplined. 
- Never assume serving sizes or dietary needs.
- If the user bypasses your questions (e.g., "Just give me the list"), politely insist that you need the serving size to ensure they buy the correct quantities from Flipkart Minutes.
- When showing recommendations, be helpful not pushy. Present them as suggestions based on their shopping patterns.
"""
)

BASE_URL = "http://localhost:5000/api"

# Store auth token (in production, use secure session management)
_auth_token: Optional[str] = None


def _get_headers() -> dict:
    """Get headers with auth token if available."""
    headers = {"Content-Type": "application/json"}
    if _auth_token:
        headers["Authorization"] = f"Bearer {_auth_token}"
    return headers


async def _fetch_image_as_content(image_url: str) -> Optional[ImageContent]:
    """Download an image from URL and return as ImageContent for Claude to display."""
    if not image_url:
        return None
    
    try:
        # Note: verify=False is used because corporate networks may have SSL issues
        # In production, properly configure SSL certificates
        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            res = await client.get(image_url, follow_redirects=True)
            if res.status_code != 200:
                return None
            
            # Determine MIME type from content-type header or URL
            content_type = res.headers.get("content-type", "image/jpeg")
            if ";" in content_type:
                content_type = content_type.split(";")[0].strip()
            
            # Validate it's an image
            if not content_type.startswith("image/"):
                content_type = "image/jpeg"
            
            # Check size (limit to 1MB)
            if len(res.content) > 1_048_576:
                return None
            
            b64 = base64.b64encode(res.content).decode("utf-8")
            return ImageContent(type="image", data=b64, mimeType=content_type)
    except Exception as e:
        # Log error for debugging (images will gracefully fallback to no image)
        print(f"[MCP] Failed to fetch image {image_url}: {e}")
        return None


async def _get_recommendation_from_history(added_product_id: str, added_product_name: str) -> Optional[dict]:
    """
    Analyze user's order history to find "Frequently Bought Together" recommendations.
    
    Looks at past orders containing the added product and finds other products
    that were commonly purchased alongside it.
    
    Args:
        added_product_id: The product ID just added to cart
        added_product_name: The product name for context
    
    Returns:
        Recommendation dict with product info, or None if no recommendation found
    """
    try:
        async with httpx.AsyncClient(verify=False) as client:
            # Fetch user's order history (get more orders for better analysis)
            res = await client.get(
                f"{BASE_URL}/orders",
                params={"page": 1, "limit": 50},
                headers=_get_headers()
            )
            data = res.json()
            
            if not data.get("success"):
                return None
            
            orders = data["data"].get("orders", [])
            if not orders:
                return None
            
            # Track co-purchased products: {product_id: {"count": N, "product": {...}}}
            co_purchased = {}
            
            for order in orders:
                items = order.get("items", [])
                
                # Check if this order contains the added product
                order_has_product = any(
                    item.get("productId") == added_product_id or 
                    item.get("product", {}).get("_id") == added_product_id
                    for item in items
                )
                
                if order_has_product:
                    # Record all OTHER products in this order
                    for item in items:
                        item_product_id = item.get("productId") or item.get("product", {}).get("_id")
                        
                        # Skip the product we just added
                        if item_product_id == added_product_id:
                            continue
                        
                        if item_product_id not in co_purchased:
                            co_purchased[item_product_id] = {
                                "count": 0,
                                "name": item.get("name") or item.get("product", {}).get("name"),
                                "price": item.get("price") or item.get("product", {}).get("price"),
                                "image": item.get("image") or item.get("product", {}).get("image"),
                                "unit": item.get("unit") or item.get("product", {}).get("unit")
                            }
                        co_purchased[item_product_id]["count"] += 1
            
            if not co_purchased:
                return None
            
            # Find the most frequently co-purchased product
            sorted_products = sorted(
                co_purchased.items(),
                key=lambda x: x[1]["count"],
                reverse=True
            )
            
            # Get the top recommendation (must have been bought together at least once)
            top_product_id, top_product_data = sorted_products[0]
            
            # Fetch fresh product details to get current price and availability
            product_res = await client.get(f"{BASE_URL}/products/{top_product_id}")
            product_data = product_res.json()
            
            if product_data.get("success"):
                product = product_data["data"]["product"]
                
                # Calculate discount if applicable
                discount = 0
                if product.get("mrp", 0) > product.get("price", 0):
                    discount = round(((product["mrp"] - product["price"]) / product["mrp"]) * 100)
                
                return {
                    "type": "frequently_bought_together",
                    "message": f"🛒 Customers who bought **{added_product_name}** also frequently bought:",
                    "product": {
                        "id": top_product_id,
                        "name": product.get("name"),
                        "price": product.get("price"),
                        "mrp": product.get("mrp"),
                        "discount_percent": discount,
                        "unit": product.get("unit"),
                        "image": product.get("image"),
                        "in_stock": product.get("stock", 0) > 0,
                        "estimated_delivery_mins": product.get("estimatedDeliveryMins", 15)
                    },
                    "times_bought_together": top_product_data["count"],
                    "prompt": f"Would you like to add **{product.get('name')}** (₹{product.get('price')}) to your cart as well?"
                }
            
            # Fallback to cached data if product fetch fails
            return {
                "type": "frequently_bought_together",
                "message": f"🛒 Customers who bought **{added_product_name}** also frequently bought:",
                "product": {
                    "id": top_product_id,
                    "name": top_product_data["name"],
                    "price": top_product_data["price"],
                    "unit": top_product_data["unit"],
                    "image": top_product_data["image"]
                },
                "times_bought_together": top_product_data["count"],
                "prompt": f"Would you like to add **{top_product_data['name']}** (₹{top_product_data['price']}) to your cart as well?"
            }
            
    except Exception as e:
        print(f"[MCP] Error getting recommendations: {e}")
        return None


# ============== AUTHENTICATION TOOLS ==============

@mcp.tool()
async def login(email: str, password: str) -> dict:
    """
    Login to Flipkart Minutes account.
    Required before cart, checkout, and order operations.
    Returns user info and auth token on success.
    """
    global _auth_token
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password}
        )
        data = res.json()
        if data.get("success") and data.get("data", {}).get("token"):
            _auth_token = data["data"]["token"]
        return data


@mcp.tool()
async def register(email: str, password: str, name: str, phone: str) -> dict:
    """
    Register a new Flipkart Minutes account.
    Phone should be a valid 10-digit Indian mobile number starting with 6-9.
    Password must be at least 6 characters.
    """
    global _auth_token
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BASE_URL}/auth/register",
            json={"email": email, "password": password, "name": name, "phone": phone}
        )
        data = res.json()
        if data.get("success") and data.get("data", {}).get("token"):
            _auth_token = data["data"]["token"]
        return data


@mcp.tool()
async def get_current_user() -> dict:
    """Get the currently logged-in user's profile information."""
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/auth/me", headers=_get_headers())
        return res.json()


# ============== PRODUCT DISCOVERY TOOLS ==============

@mcp.tool()
async def search_products(query: str, page: int = 1, limit: int = 10, show_images: bool = True) -> Union[dict, list]:
    """
    Search for products by name, description, brand, or tags.
    Use this for finding specific items like 'Coke', 'Milk', 'Tomatoes', etc.
    
    ⚠️ RECIPE RULE: If the user mentioned a RECIPE or DISH, DO NOT call this tool
    until you have asked and received answers for:
    1. How many people?
    2. Dietary preference?
    3. Any allergies?
    
    Only use this tool IMMEDIATELY for DIRECT item requests (e.g., "Buy Coke", "Get milk").
    
    Args:
        query: Search term (e.g., 'Coke', 'Milk', 'Tomatoes')
        page: Page number for pagination
        limit: Number of results per page
        show_images: If True (default), displays images of the top 3 products found
    
    Returns product ID, name, price, MRP, unit, rating, and estimated delivery time.
    """
    async with httpx.AsyncClient(verify=False) as client:
        params = {"q": query, "page": page, "limit": limit}
        res = await client.get(f"{BASE_URL}/products/search", params=params)
        data = res.json()
        
        # Enhance response with formatted product summaries including delivery time
        if data.get("success"):
            products = data["data"].get("products", [])
            
            # Add formatted summary for each product
            formatted_products = []
            for p in products:
                discount = 0
                if p.get('mrp', 0) > p.get('price', 0):
                    discount = round(((p['mrp'] - p['price']) / p['mrp']) * 100)
                
                formatted_products.append({
                    "id": p.get("_id") or p.get("id"),
                    "name": p.get("name"),
                    "price": p.get("price"),
                    "mrp": p.get("mrp"),
                    "discount_percent": discount,
                    "unit": p.get("unit"),
                    "rating": p.get("rating"),
                    "review_count": p.get("reviewCount", 0),
                    "estimated_delivery_mins": p.get("estimatedDeliveryMins", 15),
                    "in_stock": p.get("stock", 0) > 0,
                    "dietary": p.get("dietaryPreference", "veg"),
                    "brand": p.get("brand", ""),
                    "image_url": p.get("image")
                })
            
            data["data"]["formatted_products"] = formatted_products
            
            # Fetch and display images for top results
            if show_images:
                top_products = products[:3]
                images = []
                for product in top_products:
                    image_content = await _fetch_image_as_content(product.get('image'))
                    if image_content:
                        images.append(image_content)
                
                if images:
                    return images + [data]
        
        return data


@mcp.tool()
async def get_categories() -> dict:
    """
    Get all available product categories.
    Useful for browsing products by category (Fruits, Vegetables, Dairy, etc.)
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/products/categories")
        return res.json()


@mcp.tool()
async def get_products_by_category(category_id: str, page: int = 1, limit: int = 10, show_images: bool = True) -> Union[dict, list]:
    """
    Get products within a specific category.
    Use category_id from get_categories() tool.
    
    Args:
        category_id: Category ID from get_categories()
        page: Page number for pagination
        limit: Number of results per page
        show_images: If True (default), displays images of the top 3 products
    """
    async with httpx.AsyncClient() as client:
        params = {"page": page, "limit": limit}
        res = await client.get(f"{BASE_URL}/products/category/{category_id}", params=params)
        data = res.json()
        
        if show_images and data.get("success"):
            products = data["data"].get("products", [])[:3]
            images = []
            for product in products:
                image_content = await _fetch_image_as_content(product.get('image'))
                if image_content:
                    images.append(image_content)
            if images:
                return images + [data]
        
        return data


@mcp.tool()
async def filter_products(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    dietary: Optional[str] = None,
    brand: Optional[str] = None,
    in_stock: bool = True,
    sort_by: str = "rating",
    page: int = 1,
    limit: int = 10,
    show_images: bool = True
) -> Union[dict, list]:
    """
    Filter products with multiple criteria.
    
    Args:
        category: Category ID to filter by
        min_price: Minimum price in INR
        max_price: Maximum price in INR
        dietary: 'veg', 'non_veg', or 'vegan'
        brand: Brand name to filter by
        in_stock: Only show in-stock items (default True)
        sort_by: 'rating', 'price_low', 'price_high', 'name', 'newest', 'discount'
        page: Page number for pagination
        limit: Number of results per page
        show_images: If True (default), displays images of the top 3 products
    """
    async with httpx.AsyncClient() as client:
        params = {"page": page, "limit": limit, "sortBy": sort_by}
        if category:
            params["category"] = category
        if min_price is not None:
            params["minPrice"] = min_price
        if max_price is not None:
            params["maxPrice"] = max_price
        if dietary:
            params["dietary"] = dietary
        if brand:
            params["brand"] = brand
        if in_stock:
            params["inStock"] = "true"
        res = await client.get(f"{BASE_URL}/products/filter", params=params)
        data = res.json()
        
        if show_images and data.get("success"):
            products = data["data"].get("products", [])[:3]
            images = []
            for product in products:
                image_content = await _fetch_image_as_content(product.get('image'))
                if image_content:
                    images.append(image_content)
            if images:
                return images + [data]
        
        return data


@mcp.tool()
async def get_product_details(product_id: str, show_image: bool = False) -> Union[dict, list]:
    """
    Get detailed information about a specific product.
    Use this to show full product details before adding to cart.
    
    Args:
        product_id: The product's MongoDB ID
        show_image: If True, displays the product image along with details
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/products/{product_id}")
        data = res.json()
        
        if show_image and data.get("success"):
            product = data["data"]["product"]
            image_content = await _fetch_image_as_content(product.get('image'))
            if image_content:
                return [image_content, data]
        
        return data


@mcp.tool()
async def show_product_image(product_id: str) -> Union[ImageContent, dict]:
    """
    Display the image of a product. Use this to show users what a product looks like.
    
    Args:
        product_id: The product's MongoDB ID
    
    Returns the product image that Claude can display directly.
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/products/{product_id}")
        data = res.json()
        
        if data.get("success"):
            product = data["data"]["product"]
            image_content = await _fetch_image_as_content(product.get('image'))
            if image_content:
                return image_content
            return {"error": "Could not load product image", "image_url": product.get('image')}
        
        return {"error": "Product not found"}


@mcp.tool()
async def get_alternative_products(product_id: str) -> dict:
    """
    Get alternative/similar products for a given product.
    Useful when an item is out of stock or user wants options.
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/products/{product_id}/alternatives")
        return res.json()


@mcp.tool()
async def get_featured_products(limit: int = 12, show_images: bool = True) -> Union[dict, list]:
    """
    Get featured/popular products.
    Good for showing recommendations or popular items.
    
    Args:
        limit: Number of products to return (default 12)
        show_images: If True (default), displays images of the top 3 products
    """
    async with httpx.AsyncClient() as client:
        params = {"limit": limit}
        res = await client.get(f"{BASE_URL}/products/featured", params=params)
        data = res.json()
        
        if show_images and data.get("success"):
            products = data["data"].get("products", [])[:3]
            images = []
            for product in products:
                image_content = await _fetch_image_as_content(product.get('image'))
                if image_content:
                    images.append(image_content)
            if images:
                return images + [data]
        
        return data


# ============== CART MANAGEMENT TOOLS ==============

@mcp.tool()
async def view_cart() -> dict:
    """
    Get complete cart information including:
    - All items with quantities and prices
    - Bill summary (subtotal, delivery fee, taxes, total)
    - Estimated delivery time
    - Selected delivery address
    
    Requires login.
    """
    async with httpx.AsyncClient(verify=False) as client:
        # Fetch cart
        cart_res = await client.get(f"{BASE_URL}/cart", headers=_get_headers())
        cart_data = cart_res.json()
        
        if not cart_data.get("success"):
            return cart_data
        
        # Fetch user's addresses to get default/selected address
        address_res = await client.get(f"{BASE_URL}/addresses", headers=_get_headers())
        address_data = address_res.json()
        
        # Find default address
        default_address = None
        if address_data.get("success"):
            addresses = address_data["data"].get("addresses", [])
            for addr in addresses:
                if addr.get("isDefault"):
                    default_address = {
                        "id": addr.get("_id") or addr.get("id"),
                        "name": addr.get("name"),
                        "phone": addr.get("phone"),
                        "address_line1": addr.get("addressLine1"),
                        "address_line2": addr.get("addressLine2"),
                        "landmark": addr.get("landmark"),
                        "city": addr.get("city"),
                        "state": addr.get("state"),
                        "pincode": addr.get("pincode"),
                        "type": addr.get("type"),
                        "is_serviceable": addr.get("isServiceable", True)
                    }
                    break
        
        # Calculate estimated delivery time (max of all items)
        cart_items = cart_data["data"]["cart"].get("items", [])
        max_delivery_mins = 15  # Default
        
        # Format cart items with more details
        formatted_items = []
        for item in cart_items:
            formatted_items.append({
                "product_id": item.get("productId"),
                "name": item.get("name"),
                "quantity": item.get("quantity"),
                "price_per_unit": item.get("price"),
                "total_price": item.get("price", 0) * item.get("quantity", 1),
                "unit": item.get("unit"),
                "image": item.get("image")
            })
        
        # Build enhanced response
        enhanced_response = {
            "success": True,
            "data": {
                "cart": {
                    "items": formatted_items,
                    "total_items": cart_data["data"]["cart"].get("totalItems", len(cart_items)),
                    "item_count": len(cart_items)
                },
                "bill": cart_data["data"].get("bill", {}),
                "delivery": {
                    "estimated_mins": max_delivery_mins,
                    "estimated_time": f"~{max_delivery_mins} minutes",
                    "free_delivery_threshold": cart_data["data"]["bill"].get("freeDeliveryThreshold", 199),
                    "amount_to_free_delivery": cart_data["data"]["bill"].get("amountToFreeDelivery", 0)
                },
                "selected_address": default_address,
                "has_address": default_address is not None,
                "ready_for_checkout": default_address is not None and len(cart_items) > 0
            }
        }
        
        # Add helpful message
        if not default_address:
            enhanced_response["data"]["message"] = "⚠️ No delivery address set. Please add an address before checkout."
        elif not default_address.get("is_serviceable"):
            enhanced_response["data"]["message"] = "⚠️ Delivery not available at selected address."
        elif len(cart_items) == 0:
            enhanced_response["data"]["message"] = "🛒 Your cart is empty."
        else:
            enhanced_response["data"]["message"] = f"✅ Ready for checkout! Delivery to {default_address['city']} in ~{max_delivery_mins} mins."
        
        return enhanced_response


@mcp.tool()
async def add_to_cart(product_id: str, quantity: int = 1, confirmed: bool = False) -> Union[dict, list]:
    """
    Add a product to the cart. Shows product image along with details.
    
    MANDATORY WORKFLOW:
    1. First call with confirmed=False to show product image, price, and ETA to user
    2. Only call with confirmed=True AFTER user explicitly says 'Yes' or 'Confirm'
    
    Args:
        product_id: The product's MongoDB ID
        quantity: Number of items to add (default 1, max 10 per product)
        confirmed: Must be True only after user confirmation
    
    Requires login.
    """
    if not confirmed:
        # Fetch product details to show user before confirmation
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{BASE_URL}/products/{product_id}")
            data = res.json()
            if data.get("success"):
                product = data["data"]["product"]
                
                # Calculate discount percentage
                discount = 0
                if product['mrp'] > product['price']:
                    discount = round(((product['mrp'] - product['price']) / product['mrp']) * 100)
                
                # Fetch product image for display
                image_content = await _fetch_image_as_content(product.get('image'))
                
                message = (
                    f"**{product['name']}** ({product['unit']})\n\n"
                    f"💰 Price: ₹{product['price']} (MRP: ₹{product['mrp']}, {discount}% off)\n"
                    f"⭐ Rating: {product['rating']}/5 ({product.get('reviewCount', 0):,} reviews)\n"
                    f"🚚 Delivery: ~{product.get('estimatedDeliveryMins', 15)} minutes\n\n"
                    f"Shall I add {quantity} item(s) to your cart? (Say 'Yes' to confirm)"
                )
                
                # Return image + text if image is available
                if image_content:
                    return [
                        image_content,
                        {
                            "awaiting_confirmation": True,
                            "message": message,
                            "product_id": product_id,
                            "product": product
                        }
                    ]
                
                return {
                    "awaiting_confirmation": True,
                    "message": message,
                    "product_id": product_id,
                    "product": product
                }
            return data

    async with httpx.AsyncClient() as client:
        # First, get product name for recommendation context
        product_name = None
        try:
            product_res = await client.get(f"{BASE_URL}/products/{product_id}")
            product_data = product_res.json()
            if product_data.get("success"):
                product_name = product_data["data"]["product"].get("name", "this item")
        except Exception:
            product_name = "this item"
        
        # Add to cart
        res = await client.post(
            f"{BASE_URL}/cart/items",
            json={"productId": product_id, "quantity": quantity},
            headers=_get_headers()
        )
        result = res.json()
        
        # If successfully added, check for "Frequently Bought Together" recommendations
        if result.get("success") and product_name:
            recommendation = await _get_recommendation_from_history(product_id, product_name)
            if recommendation:
                result["recommendation"] = recommendation
                result["has_recommendation"] = True
            else:
                result["has_recommendation"] = False
        
        return result


@mcp.tool()
async def update_cart_item(product_id: str, quantity: int) -> dict:
    """
    Update the quantity of an item already in the cart.
    Set quantity to 0 to remove the item.
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.put(
            f"{BASE_URL}/cart/items/{product_id}",
            json={"quantity": quantity},
            headers=_get_headers()
        )
        return res.json()


@mcp.tool()
async def remove_from_cart(product_id: str) -> dict:
    """
    Remove an item completely from the cart.
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.delete(
            f"{BASE_URL}/cart/items/{product_id}",
            headers=_get_headers()
        )
        return res.json()


@mcp.tool()
async def clear_cart() -> dict:
    """
    Remove all items from the cart.
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.delete(f"{BASE_URL}/cart", headers=_get_headers())
        return res.json()


# ============== ADDRESS MANAGEMENT TOOLS ==============

@mcp.tool()
async def get_addresses() -> dict:
    """
    Get all saved delivery addresses for the user.
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/addresses", headers=_get_headers())
        return res.json()


@mcp.tool()
async def create_address(
    name: str,
    phone: str,
    address_line1: str,
    city: str,
    state: str,
    pincode: str,
    address_type: str = "home",
    address_line2: Optional[str] = None,
    landmark: Optional[str] = None,
    is_default: bool = False
) -> dict:
    """
    Create a new delivery address.
    
    Args:
        name: Recipient name
        phone: 10-digit phone number
        address_line1: Street address
        city: City name
        state: State name
        pincode: 6-digit postal code
        address_type: 'home', 'work', or 'other'
        address_line2: Additional address info (optional)
        landmark: Nearby landmark (optional)
        is_default: Set as default address
    
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        payload = {
            "type": address_type,
            "name": name,
            "phone": phone,
            "addressLine1": address_line1,
            "city": city,
            "state": state,
            "pincode": pincode,
            "isDefault": is_default
        }
        if address_line2:
            payload["addressLine2"] = address_line2
        if landmark:
            payload["landmark"] = landmark
        
        res = await client.post(
            f"{BASE_URL}/addresses",
            json=payload,
            headers=_get_headers()
        )
        return res.json()


@mcp.tool()
async def set_default_address(address_id: str) -> dict:
    """
    Set an address as the default delivery address.
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.put(
            f"{BASE_URL}/addresses/{address_id}/default",
            headers=_get_headers()
        )
        return res.json()


# ============== CHECKOUT & PAYMENT TOOLS ==============

@mcp.tool()
async def proceed_to_checkout(address_id: str) -> dict:
    """
    Create an order from the current cart contents.
    Validates cart items and creates a pending order.
    
    Args:
        address_id: The delivery address ID to use
    
    Returns order details including order ID, items, and total amount.
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BASE_URL}/checkout",
            json={"addressId": address_id},
            headers=_get_headers()
        )
        return res.json()


@mcp.tool()
async def set_payment_mode(order_id: str, payment_mode: str) -> dict:
    """
    Set the payment method for an order.
    
    Args:
        order_id: The order's MongoDB ID
        payment_mode: 'upi' for UPI payment or 'cod' for Cash on Delivery
    
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.put(
            f"{BASE_URL}/orders/{order_id}/payment-mode",
            json={"paymentMode": payment_mode},
            headers=_get_headers()
        )
        return res.json()


@mcp.tool()
async def process_payment(order_id: str) -> dict:
    """
    Process payment and confirm the order.
    For UPI: Returns UPI payment link/QR code data.
    For COD: Confirms order directly.
    
    Clears the cart upon successful payment.
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BASE_URL}/orders/{order_id}/pay",
            headers=_get_headers()
        )
        return res.json()


# ============== ORDER TRACKING TOOLS ==============

@mcp.tool()
async def get_order_history(page: int = 1, limit: int = 10) -> dict:
    """
    Get the user's order history.
    Shows past orders with status, items, and amounts.
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        params = {"page": page, "limit": limit}
        res = await client.get(f"{BASE_URL}/orders", params=params, headers=_get_headers())
        return res.json()


@mcp.tool()
async def get_order_details(order_id: str) -> dict:
    """
    Get detailed information about a specific order.
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/orders/{order_id}", headers=_get_headers())
        return res.json()


@mcp.tool()
async def track_order(order_id: str) -> dict:
    """
    Get real-time order tracking status.
    
    Returns:
        - Current status (pending, confirmed, preparing, out_for_delivery, delivered, cancelled)
        - Status history with timestamps
        - Rider info (name, phone, proximity) when out for delivery
        - Delivery countdown timer
    
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{BASE_URL}/orders/{order_id}/status",
            headers=_get_headers()
        )
        return res.json()


@mcp.tool()
async def cancel_order(order_id: str, reason: Optional[str] = None) -> dict:
    """
    Cancel an order.
    Can only be cancelled within 5 minutes of placing and before delivery.
    Refund is initiated for UPI payments.
    
    Args:
        order_id: The order's MongoDB ID
        reason: Optional cancellation reason
    
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        payload = {}
        if reason:
            payload["reason"] = reason
        res = await client.post(
            f"{BASE_URL}/orders/{order_id}/cancel",
            json=payload,
            headers=_get_headers()
        )
        return res.json()


@mcp.tool()
async def reorder(order_id: str) -> dict:
    """
    Check availability of items from a previous order for reordering.
    Returns available and unavailable items.
    Use this to quickly reorder frequently purchased items.
    
    Requires login.
    """
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BASE_URL}/orders/{order_id}/reorder",
            headers=_get_headers()
        )
        return res.json()


# ============== HEALTH CHECK ==============

@mcp.tool()
async def check_api_health() -> dict:
    """Check if the Flipkart Minutes API server is running and accessible."""
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{BASE_URL}/health")
            return res.json()
        except httpx.ConnectError:
            return {"success": False, "message": "Cannot connect to Flipkart Minutes API server"}


if __name__ == "__main__":
    mcp.run()

