import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from '../models/User.model.js';
import Address from '../models/Address.model.js';
import Category from '../models/Category.model.js';
import Product from '../models/Product.model.js';
import Cart from '../models/Cart.model.js';
import Order from '../models/Order.model.js';
import OrderStatus from '../models/OrderStatus.model.js';

import { categories } from './categories.js';
import { products } from './products.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/flipkart-minutes';

// Check if --fresh flag is passed to force clean seed
const isFreshSeed = process.argv.includes('--fresh');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if data already exists
    const existingCategories = await Category.countDocuments();
    const existingProducts = await Product.countDocuments();
    const existingUsers = await User.countDocuments();

    if (existingCategories > 0 || existingProducts > 0 || existingUsers > 0) {
      if (!isFreshSeed) {
        console.log('\n========================================');
        console.log('Database already has data!');
        console.log('========================================');
        console.log(`- Categories: ${existingCategories}`);
        console.log(`- Products: ${existingProducts}`);
        console.log(`- Users: ${existingUsers}`);
        console.log('\nTo force a fresh seed, run: npm run seed -- --fresh');
        console.log('========================================\n');
        process.exit(0);
      }

      // Fresh seed requested - clear existing data
      console.log('Fresh seed requested. Clearing existing data...');
      await Promise.all([
        User.deleteMany({}),
        Address.deleteMany({}),
        Category.deleteMany({}),
        Product.deleteMany({}),
        Cart.deleteMany({}),
        Order.deleteMany({}),
        OrderStatus.deleteMany({})
      ]);
      console.log('Existing data cleared');
    }

    // Seed categories using upsert (idempotent)
    console.log('Seeding categories...');
    const categoryOps = categories.map(cat => ({
      updateOne: {
        filter: { slug: cat.slug },
        update: { $set: cat },
        upsert: true
      }
    }));
    await Category.bulkWrite(categoryOps);
    
    // Fetch all categories to get their IDs
    const allCategories = await Category.find({});
    console.log(`Upserted ${allCategories.length} categories`);

    // Create category slug to ID map
    const categoryMap = new Map();
    allCategories.forEach(cat => {
      categoryMap.set(cat.slug, cat._id);
    });

    // Seed products using upsert (idempotent) - use name + categoryId as unique key
    console.log('Seeding products...');
    const productOps = products.map(product => {
      const categoryId = categoryMap.get(product.categorySlug);
      const { categorySlug, ...productData } = product;
      return {
        updateOne: {
          filter: { name: product.name, categoryId },
          update: { $set: { ...productData, categoryId } },
          upsert: true
        }
      };
    });
    await Product.bulkWrite(productOps);
    
    const productCount = await Product.countDocuments();
    console.log(`Upserted ${productCount} products`);

    // Create text index for search (idempotent - MongoDB handles duplicate index creation)
    console.log('Ensuring text index for product search...');
    try {
      await Product.collection.createIndex(
        { name: 'text', description: 'text', brand: 'text', tags: 'text' },
        { name: 'product_text_search' }
      );
      console.log('Text index ensured');
    } catch (indexError) {
      // Index already exists - that's fine
      if (indexError.code !== 85 && indexError.code !== 86) {
        throw indexError;
      }
      console.log('Text index already exists');
    }

    // Create or update test user (idempotent)
    console.log('Ensuring test user...');
    let testUser = await User.findOne({ email: 'test@example.com' });
    
    if (!testUser) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      testUser = await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        phone: '9876543210'
      });
      console.log('Test user created:', testUser.email);
    } else {
      console.log('Test user already exists:', testUser.email);
    }

    // Create addresses for test user (idempotent - check by userId + type)
    console.log('Ensuring addresses for test user...');
    const addressData = [
      {
        userId: testUser._id,
        type: 'home',
        name: 'Test User',
        phone: '9876543210',
        addressLine1: '123, Green Park',
        addressLine2: 'Near Metro Station',
        landmark: 'Opposite City Mall',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110016',
        isDefault: true,
        isServiceable: true
      },
      {
        userId: testUser._id,
        type: 'work',
        name: 'Test User',
        phone: '9876543210',
        addressLine1: 'Tower B, Tech Park',
        addressLine2: 'Sector 62',
        landmark: 'Near Golf Course',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        isDefault: false,
        isServiceable: true
      }
    ];

    const addressOps = addressData.map(addr => ({
      updateOne: {
        filter: { userId: addr.userId, type: addr.type },
        update: { $set: addr },
        upsert: true
      }
    }));
    await Address.bulkWrite(addressOps);
    
    const addressCount = await Address.countDocuments({ userId: testUser._id });
    console.log(`Ensured ${addressCount} addresses for test user`);

    // Get the default address
    const defaultAddress = await Address.findOne({ userId: testUser._id, isDefault: true });
    
    // Update user's active address if not set
    if (!testUser.activeAddressId && defaultAddress) {
      await User.findByIdAndUpdate(testUser._id, { activeAddressId: defaultAddress._id });
    }

    // Create cart for test user if doesn't exist (idempotent)
    const existingCart = await Cart.findOne({ userId: testUser._id });
    if (!existingCart) {
      await Cart.create({
        userId: testUser._id,
        items: []
      });
      console.log('Created cart for test user');
    } else {
      console.log('Cart already exists for test user');
    }

    // Final counts
    const finalCounts = {
      categories: await Category.countDocuments(),
      products: await Product.countDocuments(),
      users: await User.countDocuments(),
      addresses: await Address.countDocuments()
    };

    console.log('\n========================================');
    console.log('Database seeded successfully!');
    console.log('========================================');
    console.log('\nTest User Credentials:');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    console.log('\nDatabase Summary:');
    console.log(`- Categories: ${finalCounts.categories}`);
    console.log(`- Products: ${finalCounts.products}`);
    console.log(`- Users: ${finalCounts.users}`);
    console.log(`- Addresses: ${finalCounts.addresses}`);
    console.log('\nNote: Run with --fresh flag to clear and reseed');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
