import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { PAGINATION } from '../config/constants.js';

// @desc    Get all categories
// @route   GET /api/products/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 });

  res.json({
    success: true,
    data: { categories }
  });
});

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const query = { categoryId, isAvailable: true };

  const [products, total] = await Promise.all([
    Product.find(query)
      .sort({ rating: -1, name: 1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      category,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
export const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  if (!q || q.trim().length === 0) {
    throw new AppError('Search query is required', 400);
  }

  const searchQuery = {
    $text: { $search: q },
    isAvailable: true
  };

  const [products, total] = await Promise.all([
    Product.find(searchQuery, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .populate('categoryId', 'name slug'),
    Product.countDocuments(searchQuery)
  ]);

  res.json({
    success: true,
    data: {
      query: q,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Filter products
// @route   GET /api/products/filter
// @access  Public
export const filterProducts = asyncHandler(async (req, res) => {
  const {
    category,
    minPrice,
    maxPrice,
    dietary,
    brand,
    inStock,
    sortBy = 'rating'
  } = req.query;

  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  // Build filter query
  const query = { isAvailable: true };

  if (category) {
    query.categoryId = category;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = parseFloat(minPrice);
    if (maxPrice !== undefined) query.price.$lte = parseFloat(maxPrice);
  }

  if (dietary) {
    query.dietaryPreference = dietary;
  }

  if (brand) {
    query.brand = { $regex: brand, $options: 'i' };
  }

  if (inStock === 'true') {
    query.stock = { $gt: 0 };
  }

  // Build sort options
  const sortOptions = {
    rating: { rating: -1, reviewCount: -1 },
    price_low: { price: 1 },
    price_high: { price: -1 },
    name: { name: 1 },
    newest: { createdAt: -1 },
    discount: { discountPercent: -1 }
  };

  const sort = sortOptions[sortBy] || sortOptions.rating;

  const [products, total] = await Promise.all([
    Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('categoryId', 'name slug'),
    Product.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      filters: { category, minPrice, maxPrice, dietary, brand, inStock, sortBy },
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('categoryId', 'name slug');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.json({
    success: true,
    data: { product }
  });
});

// @desc    Get alternative products
// @route   GET /api/products/:id/alternatives
// @access  Public
export const getAlternatives = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Find similar products in same category with similar price range
  const priceRange = {
    min: product.price * 0.5,
    max: product.price * 1.5
  };

  const alternatives = await Product.find({
    _id: { $ne: product._id },
    categoryId: product.categoryId,
    isAvailable: true,
    price: { $gte: priceRange.min, $lte: priceRange.max }
  })
    .sort({ rating: -1 })
    .limit(10);

  // If not enough alternatives in price range, get more from same category
  if (alternatives.length < 5) {
    const moreAlternatives = await Product.find({
      _id: { $ne: product._id, $nin: alternatives.map(a => a._id) },
      categoryId: product.categoryId,
      isAvailable: true
    })
      .sort({ rating: -1 })
      .limit(10 - alternatives.length);

    alternatives.push(...moreAlternatives);
  }

  res.json({
    success: true,
    data: {
      originalProduct: {
        id: product._id,
        name: product.name,
        price: product.price
      },
      alternatives
    }
  });
});

// @desc    Get featured/popular products
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 12, 50);

  const products = await Product.find({ isAvailable: true })
    .sort({ rating: -1, reviewCount: -1 })
    .limit(limit)
    .populate('categoryId', 'name slug');

  res.json({
    success: true,
    data: { products }
  });
});

// @desc    Get all products (paginated)
// @route   GET /api/products
// @access  Public
export const getAllProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find({ isAvailable: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('categoryId', 'name slug'),
    Product.countDocuments({ isAvailable: true })
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});
