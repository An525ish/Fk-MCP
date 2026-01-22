import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import { DIETARY_PREFERENCE } from '../config/constants.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * Analyze order history to derive all user preferences
 * No separate preferences table - everything comes from orders
 */
async function analyzeOrderHistory(userId, orderLimit = 25) {
  // Get last N orders
  const orders = await Order.find({ userId })
    .sort({ createdAt: -1 })
    .limit(orderLimit)
    .populate('items.productId', 'name price unit image brand dietaryType');
  
  if (orders.length === 0) {
    return {
      hasOrderHistory: false,
      frequentItems: [],
      shoppingPatterns: null,
      preferredPaymentMethod: null,
      preferredBrands: [],
      inferredDietaryPreference: null,
      typicalOrderSize: null,
      totalOrders: 0
    };
  }
  
  // Analyze items
  const itemCounts = {};
  const brandCounts = {};
  const paymentCounts = {};
  const dayCount = {};
  const timeCount = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const dietaryCounts = { veg: 0, non_veg: 0, egg: 0 };
  const orderSizes = [];
  let totalValue = 0;
  
  orders.forEach(order => {
    let orderItemCount = 0;
    
    // Count items and analyze
    order.items.forEach(item => {
      const key = item.productId?._id?.toString() || item.productId?.toString();
      if (!key) return;
      
      if (!itemCounts[key]) {
        itemCounts[key] = {
          productId: key,
          name: item.name,
          orderCount: 0,
          totalQuantity: 0,
          lastOrdered: order.createdAt
        };
      }
      itemCounts[key].orderCount += 1;
      itemCounts[key].totalQuantity += item.quantity || 1;
      orderItemCount += item.quantity || 1;
      
      // Count dietary type
      const product = item.productId;
      if (product?.dietaryType) {
        dietaryCounts[product.dietaryType] = (dietaryCounts[product.dietaryType] || 0) + 1;
      }
      
      // Count brand
      if (product?.brand) {
        brandCounts[product.brand] = (brandCounts[product.brand] || 0) + 1;
      }
    });
    
    orderSizes.push(orderItemCount);
    
    // Count payment methods
    if (order.paymentMode) {
      paymentCounts[order.paymentMode] = (paymentCounts[order.paymentMode] || 0) + 1;
    }
    
    // Analyze timing
    const date = new Date(order.createdAt);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hour = date.getHours();
    
    dayCount[dayName] = (dayCount[dayName] || 0) + 1;
    totalValue += order.totalAmount || 0;
    
    if (hour >= 6 && hour < 12) timeCount.morning++;
    else if (hour >= 12 && hour < 17) timeCount.afternoon++;
    else if (hour >= 17 && hour < 21) timeCount.evening++;
    else timeCount.night++;
  });
  
  // Get frequent items with current product details
  const frequentItemIds = Object.values(itemCounts)
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 20);
  
  const productIds = frequentItemIds.map(i => i.productId);
  const products = await Product.find({ _id: { $in: productIds } })
    .select('name price unit image brand isAvailable stock dietaryType');
  
  const productMap = new Map(products.map(p => [p._id.toString(), p]));
  
  const frequentItems = frequentItemIds
    .filter(item => productMap.has(item.productId))
    .map(item => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        name: product.name,
        price: product.price,
        unit: product.unit,
        image: product.image,
        brand: product.brand,
        dietaryType: product.dietaryType,
        isAvailable: product.isAvailable && product.stock > 0,
        orderCount: item.orderCount,
        avgQuantity: Math.round(item.totalQuantity / item.orderCount),
        lastOrdered: item.lastOrdered
      };
    });
  
  // Infer dietary preference (only if strong signal)
  let inferredDietaryPreference = null;
  const totalDietaryItems = dietaryCounts.veg + dietaryCounts.non_veg + dietaryCounts.egg;
  if (totalDietaryItems > 0) {
    const vegPercentage = (dietaryCounts.veg / totalDietaryItems) * 100;
    const nonVegPercentage = ((dietaryCounts.non_veg + dietaryCounts.egg) / totalDietaryItems) * 100;
    
    // Only infer if there's a strong pattern (>80%)
    if (vegPercentage >= 80) {
      inferredDietaryPreference = { type: 'veg', confidence: vegPercentage };
    } else if (nonVegPercentage >= 80) {
      inferredDietaryPreference = { type: 'non_veg', confidence: nonVegPercentage };
    } else {
      inferredDietaryPreference = { type: 'mixed', confidence: null };
    }
  }
  
  // Preferred payment method
  const preferredPaymentMethod = Object.entries(paymentCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  
  // Preferred brands (top 5)
  const preferredBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([brand, count]) => ({ brand, orderCount: count }));
  
  // Shopping patterns
  const preferredDays = Object.entries(dayCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([day]) => day);
  
  const preferredTime = Object.entries(timeCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'evening';
  
  const averageOrderValue = orders.length > 0 ? Math.round(totalValue / orders.length) : 0;
  
  // Calculate order frequency
  let averageOrderFrequencyDays = null;
  if (orders.length >= 2) {
    const firstOrder = new Date(orders[orders.length - 1].createdAt);
    const lastOrder = new Date(orders[0].createdAt);
    const daysDiff = Math.ceil((lastOrder - firstOrder) / (1000 * 60 * 60 * 24));
    averageOrderFrequencyDays = Math.round(daysDiff / (orders.length - 1)) || null;
  }
  
  // Typical order size (median)
  const sortedSizes = orderSizes.sort((a, b) => a - b);
  const typicalOrderSize = sortedSizes.length > 0 
    ? sortedSizes[Math.floor(sortedSizes.length / 2)] 
    : null;
  
  return {
    hasOrderHistory: true,
    frequentItems,
    shoppingPatterns: {
      preferredOrderDays: preferredDays,
      preferredOrderTime: preferredTime,
      averageOrderValue,
      averageOrderFrequencyDays,
      totalOrders: orders.length
    },
    preferredPaymentMethod,
    preferredBrands,
    inferredDietaryPreference,
    typicalOrderSize,
    totalOrders: orders.length
  };
}

/**
 * @desc    Get user preferences (all derived from order history)
 * @route   GET /api/preferences
 * @access  Private
 */
export const getPreferences = asyncHandler(async (req, res) => {
  const orderLimit = parseInt(req.query.orders) || 25;
  const analysis = await analyzeOrderHistory(req.user._id, orderLimit);
  
  res.json({
    success: true,
    data: {
      preferences: {
        // All derived from order history
        ...analysis,
        // Guidance for MCP on what to ask
        shouldAsk: {
          dietaryPreference: !analysis.inferredDietaryPreference || 
                            analysis.inferredDietaryPreference.type === 'mixed',
          servings: true, // Always ask - varies per order
        }
      }
    }
  });
});

/**
 * @desc    Get frequent items (derived from order history)
 * @route   GET /api/preferences/frequent-items
 * @access  Private
 */
export const getFrequentItems = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const orderLimit = parseInt(req.query.orders) || 25;
  
  const analysis = await analyzeOrderHistory(req.user._id, orderLimit);
  
  res.json({
    success: true,
    data: {
      frequentItems: analysis.frequentItems.slice(0, limit),
      totalOrders: analysis.totalOrders
    }
  });
});

/**
 * @desc    Get shopping patterns (derived from order history)
 * @route   GET /api/preferences/patterns
 * @access  Private
 */
export const getShoppingPatterns = asyncHandler(async (req, res) => {
  const orderLimit = parseInt(req.query.orders) || 25;
  const analysis = await analyzeOrderHistory(req.user._id, orderLimit);
  
  res.json({
    success: true,
    data: {
      patterns: analysis.shoppingPatterns,
      preferredPaymentMethod: analysis.preferredPaymentMethod,
      preferredBrands: analysis.preferredBrands,
      inferredDietaryPreference: analysis.inferredDietaryPreference,
      typicalOrderSize: analysis.typicalOrderSize
    }
  });
});
