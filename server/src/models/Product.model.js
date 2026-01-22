import mongoose from 'mongoose';
import { DIETARY_PREFERENCE } from '../config/constants.js';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  mrp: {
    type: Number,
    required: [true, 'MRP is required'],
    min: [0, 'MRP cannot be negative']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true // e.g., "1 kg", "500 g", "1 L", "6 pcs"
  },
  image: {
    type: String,
    required: [true, 'Product image is required']
  },
  images: [{
    type: String
  }],
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    index: true
  },
  brand: {
    type: String,
    trim: true,
    default: ''
  },
  stock: {
    type: Number,
    default: 100,
    min: [0, 'Stock cannot be negative']
  },
  rating: {
    type: Number,
    default: 4.0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot exceed 5']
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  dietaryPreference: {
    type: String,
    enum: Object.values(DIETARY_PREFERENCE),
    default: DIETARY_PREFERENCE.VEG
  },
  tags: [{
    type: String,
    trim: true
  }],
  estimatedDeliveryMins: {
    type: Number,
    default: 15,
    min: [5, 'Minimum delivery time is 5 minutes']
  },
  // MCP-specific fields for smart search and variant handling
  weightGrams: {
    type: Number,
    default: null,
    min: [0, 'Weight cannot be negative']
  },
  volumeMl: {
    type: Number,
    default: null,
    min: [0, 'Volume cannot be negative']
  },
  variantGroup: {
    type: String,
    trim: true,
    default: null,
    index: true // Index for fast variant lookups
  }
}, {
  timestamps: true
});

// Calculate discount percentage virtual
productSchema.virtual('discountPercent').get(function() {
  if (this.mrp > this.price) {
    return Math.round(((this.mrp - this.price) / this.mrp) * 100);
  }
  return 0;
});

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Text index for search
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  brand: 'text',
  tags: 'text'
});

// Compound indexes for filtering
productSchema.index({ categoryId: 1, isAvailable: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ dietaryPreference: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
