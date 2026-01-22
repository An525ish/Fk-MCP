import { Router } from 'express';
import {
  getCategories,
  getProductsByCategory,
  searchProducts,
  filterProducts,
  getProduct,
  getAlternatives,
  getFeaturedProducts,
  getAllProducts
} from '../controllers/product.controller.js';
import { validate, searchValidation, filterValidation, mongoIdValidation } from '../middleware/validate.middleware.js';

const router = Router();

// Category routes
router.get('/categories', getCategories);
router.get('/category/:categoryId', mongoIdValidation('categoryId'), validate, getProductsByCategory);

// Search and filter
router.get('/search', searchValidation, validate, searchProducts);
router.get('/filter', filterValidation, validate, filterProducts);

// Featured products
router.get('/featured', getFeaturedProducts);

// Single product routes
router.get('/:id', mongoIdValidation('id'), validate, getProduct);
router.get('/:id/alternatives', mongoIdValidation('id'), validate, getAlternatives);

// All products
router.get('/', getAllProducts);

export default router;
