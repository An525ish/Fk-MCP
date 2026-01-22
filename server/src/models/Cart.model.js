import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    max: [10, 'Maximum 10 items per product']
  },
  price: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    required: true
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  subtotal: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  next();
});

// Method to add item to cart
cartSchema.methods.addItem = async function(product, quantity = 1) {
  const existingItemIndex = this.items.findIndex(
    item => item.productId.toString() === product._id.toString()
  );

  if (existingItemIndex > -1) {
    const newQuantity = this.items[existingItemIndex].quantity + quantity;
    if (newQuantity > 10) {
      throw new Error('Maximum 10 items per product allowed');
    }
    this.items[existingItemIndex].quantity = newQuantity;
  } else {
    this.items.push({
      productId: product._id,
      quantity,
      price: product.price,
      name: product.name,
      image: product.image,
      unit: product.unit
    });
  }

  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = async function(productId, quantity = null) {
  const existingItemIndex = this.items.findIndex(
    item => item.productId.toString() === productId.toString()
  );

  if (existingItemIndex === -1) {
    throw new Error('Item not found in cart');
  }

  if (quantity === null || this.items[existingItemIndex].quantity <= quantity) {
    // Remove entire item
    this.items.splice(existingItemIndex, 1);
  } else {
    // Reduce quantity
    this.items[existingItemIndex].quantity -= quantity;
  }

  return this.save();
};

// Method to clear cart
cartSchema.methods.clearCart = async function() {
  this.items = [];
  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = async function(productId, quantity) {
  const existingItemIndex = this.items.findIndex(
    item => item.productId.toString() === productId.toString()
  );

  if (existingItemIndex === -1) {
    throw new Error('Item not found in cart');
  }

  if (quantity <= 0) {
    this.items.splice(existingItemIndex, 1);
  } else if (quantity > 10) {
    throw new Error('Maximum 10 items per product allowed');
  } else {
    this.items[existingItemIndex].quantity = quantity;
  }

  return this.save();
};

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
