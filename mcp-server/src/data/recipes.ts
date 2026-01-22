/**
 * Recipe Database
 * Built-in recipes for intelligent recipe-to-cart functionality
 */

import type { Recipe } from '../types/index.js';

export const recipes: Recipe[] = [
  // ============================================
  // Sandwiches
  // ============================================
  {
    id: 'veg-sandwich',
    name: 'Vegetable Sandwich',
    description: 'Classic vegetable sandwich with fresh veggies and cheese',
    servings: 2,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'bread', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'cheese slices', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'tomatoes', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'capsicum', baseQuantity: 1, unit: 'piece', optional: false },
      { searchQuery: 'butter', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'onions', baseQuantity: 250, unit: 'g', optional: true },
      { searchQuery: 'green chillies', baseQuantity: 50, unit: 'g', optional: true, category: 'spice' },
    ],
    prepTime: 10,
    cookTime: 5,
    difficulty: 'easy',
    tags: ['sandwich', 'breakfast', 'quick', 'snack'],
    cuisine: 'Continental',
  },
  {
    id: 'egg-sandwich',
    name: 'Egg Sandwich',
    description: 'Protein-rich egg sandwich with fresh vegetables',
    servings: 2,
    dietaryType: 'non_veg',
    ingredients: [
      { searchQuery: 'bread', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'eggs', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'tomatoes', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'onions', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'butter', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'green chillies', baseQuantity: 50, unit: 'g', optional: true },
      { searchQuery: 'cheese slices', baseQuantity: 1, unit: 'pack', optional: true },
    ],
    prepTime: 10,
    cookTime: 10,
    difficulty: 'easy',
    tags: ['sandwich', 'breakfast', 'protein', 'eggs'],
    cuisine: 'Continental',
  },
  {
    id: 'chicken-sandwich',
    name: 'Chicken Sandwich',
    description: 'Grilled chicken sandwich with fresh veggies',
    servings: 2,
    dietaryType: 'non_veg',
    ingredients: [
      { searchQuery: 'bread', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'chicken breast boneless', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'cheese slices', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'tomatoes', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'onions', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'butter', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'capsicum', baseQuantity: 1, unit: 'piece', optional: true },
    ],
    prepTime: 15,
    cookTime: 15,
    difficulty: 'medium',
    tags: ['sandwich', 'chicken', 'protein', 'lunch'],
    cuisine: 'Continental',
  },

  // ============================================
  // Biryani
  // ============================================
  {
    id: 'chicken-biryani',
    name: 'Chicken Biryani',
    description: 'Authentic Hyderabadi-style chicken biryani with aromatic spices',
    servings: 4,
    dietaryType: 'non_veg',
    ingredients: [
      { searchQuery: 'basmati rice', baseQuantity: 500, unit: 'g', optional: false },
      { searchQuery: 'chicken curry cut', baseQuantity: 500, unit: 'g', optional: false },
      { searchQuery: 'onions', baseQuantity: 500, unit: 'g', optional: false },
      { searchQuery: 'curd', baseQuantity: 200, unit: 'g', optional: false },
      { searchQuery: 'biryani masala', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'ghee', baseQuantity: 100, unit: 'ml', optional: false },
      { searchQuery: 'saffron', baseQuantity: 1, unit: 'g', optional: false },
      { searchQuery: 'ginger garlic paste', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'green chillies', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'mint leaves', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'coriander', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'tomatoes', baseQuantity: 250, unit: 'g', optional: true },
    ],
    prepTime: 30,
    cookTime: 60,
    difficulty: 'hard',
    tags: ['biryani', 'rice', 'chicken', 'main course', 'party', 'special'],
    cuisine: 'Indian',
  },
  {
    id: 'mutton-biryani',
    name: 'Mutton Biryani',
    description: 'Rich and flavorful mutton biryani with tender meat',
    servings: 4,
    dietaryType: 'non_veg',
    ingredients: [
      { searchQuery: 'basmati rice', baseQuantity: 500, unit: 'g', optional: false },
      { searchQuery: 'mutton curry cut', baseQuantity: 500, unit: 'g', optional: false },
      { searchQuery: 'onions', baseQuantity: 500, unit: 'g', optional: false },
      { searchQuery: 'curd', baseQuantity: 200, unit: 'g', optional: false },
      { searchQuery: 'biryani masala', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'ghee', baseQuantity: 150, unit: 'ml', optional: false },
      { searchQuery: 'saffron', baseQuantity: 1, unit: 'g', optional: false },
      { searchQuery: 'ginger garlic paste', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'green chillies', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'mint leaves', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'coriander', baseQuantity: 50, unit: 'g', optional: false },
    ],
    prepTime: 45,
    cookTime: 90,
    difficulty: 'hard',
    tags: ['biryani', 'rice', 'mutton', 'main course', 'party', 'special'],
    cuisine: 'Indian',
  },
  {
    id: 'veg-biryani',
    name: 'Vegetable Biryani',
    description: 'Aromatic vegetable biryani with mixed vegetables and paneer',
    servings: 4,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'basmati rice', baseQuantity: 500, unit: 'g', optional: false },
      { searchQuery: 'paneer', baseQuantity: 200, unit: 'g', optional: false, substitutes: ['tofu'] },
      { searchQuery: 'onions', baseQuantity: 500, unit: 'g', optional: false },
      { searchQuery: 'curd', baseQuantity: 200, unit: 'g', optional: false },
      { searchQuery: 'biryani masala', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'ghee', baseQuantity: 100, unit: 'ml', optional: false },
      { searchQuery: 'saffron', baseQuantity: 1, unit: 'g', optional: true },
      { searchQuery: 'ginger garlic paste', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'green chillies', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'mint leaves', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'coriander', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'capsicum', baseQuantity: 1, unit: 'piece', optional: true },
      { searchQuery: 'potatoes', baseQuantity: 250, unit: 'g', optional: true },
    ],
    prepTime: 30,
    cookTime: 45,
    difficulty: 'medium',
    tags: ['biryani', 'rice', 'vegetarian', 'main course', 'party'],
    cuisine: 'Indian',
  },

  // ============================================
  // Breakfast Items
  // ============================================
  {
    id: 'masala-omelette',
    name: 'Masala Omelette',
    description: 'Spicy Indian-style omelette with onions and tomatoes',
    servings: 2,
    dietaryType: 'non_veg',
    ingredients: [
      { searchQuery: 'eggs', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'onions', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'tomatoes', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'green chillies', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'coriander', baseQuantity: 50, unit: 'g', optional: true },
      { searchQuery: 'butter', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'bread', baseQuantity: 1, unit: 'pack', optional: true },
    ],
    prepTime: 5,
    cookTime: 10,
    difficulty: 'easy',
    tags: ['breakfast', 'eggs', 'quick', 'protein'],
    cuisine: 'Indian',
  },
  {
    id: 'poha',
    name: 'Poha',
    description: 'Light and fluffy flattened rice with peanuts and spices',
    servings: 2,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'poha', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'onions', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'potatoes', baseQuantity: 250, unit: 'g', optional: true },
      { searchQuery: 'green chillies', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'turmeric powder', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'coriander', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'sunflower oil', baseQuantity: 1, unit: 'bottle', optional: false },
    ],
    prepTime: 10,
    cookTime: 15,
    difficulty: 'easy',
    tags: ['breakfast', 'light', 'healthy', 'quick'],
    cuisine: 'Indian',
  },
  {
    id: 'paratha-breakfast',
    name: 'Paratha Breakfast',
    description: 'Frozen parathas with curd and pickle - quick breakfast',
    servings: 2,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'frozen parathas', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'curd', baseQuantity: 200, unit: 'g', optional: false },
      { searchQuery: 'butter', baseQuantity: 1, unit: 'pack', optional: false },
    ],
    prepTime: 2,
    cookTime: 10,
    difficulty: 'easy',
    tags: ['breakfast', 'quick', 'frozen', 'paratha'],
    cuisine: 'Indian',
  },

  // ============================================
  // Quick Meals
  // ============================================
  {
    id: 'maggi',
    name: 'Masala Maggi',
    description: 'Quick and easy Maggi noodles with vegetables',
    servings: 2,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'maggi noodles', baseQuantity: 4, unit: 'packs', optional: false },
      { searchQuery: 'onions', baseQuantity: 100, unit: 'g', optional: true },
      { searchQuery: 'tomatoes', baseQuantity: 100, unit: 'g', optional: true },
      { searchQuery: 'green chillies', baseQuantity: 25, unit: 'g', optional: true },
      { searchQuery: 'butter', baseQuantity: 1, unit: 'pack', optional: true },
    ],
    prepTime: 2,
    cookTime: 5,
    difficulty: 'easy',
    tags: ['quick', 'snack', 'instant', 'noodles'],
    cuisine: 'Indian',
  },
  {
    id: 'dal-rice',
    name: 'Dal Rice',
    description: 'Comfort food - simple dal with steamed rice',
    servings: 2,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'toor dal', baseQuantity: 250, unit: 'g', optional: false, substitutes: ['moong dal'] },
      { searchQuery: 'basmati rice', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'onions', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'tomatoes', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'garlic', baseQuantity: 50, unit: 'g', optional: false },
      { searchQuery: 'turmeric powder', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'red chilli powder', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'ghee', baseQuantity: 100, unit: 'ml', optional: false },
      { searchQuery: 'coriander', baseQuantity: 50, unit: 'g', optional: true },
    ],
    prepTime: 15,
    cookTime: 30,
    difficulty: 'easy',
    tags: ['comfort food', 'healthy', 'protein', 'everyday'],
    cuisine: 'Indian',
  },

  // ============================================
  // Party & Snacks
  // ============================================
  {
    id: 'party-snacks',
    name: 'Party Snacks Pack',
    description: 'Assorted snacks and drinks for a small party',
    servings: 10,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'lays chips', baseQuantity: 3, unit: 'packs', optional: false },
      { searchQuery: 'kurkure', baseQuantity: 3, unit: 'packs', optional: false },
      { searchQuery: 'coca cola 2l', baseQuantity: 2, unit: 'bottles', optional: false },
      { searchQuery: 'sprite', baseQuantity: 1, unit: 'bottle', optional: false },
      { searchQuery: 'bhujia', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'oreo cookies', baseQuantity: 2, unit: 'packs', optional: true },
    ],
    prepTime: 0,
    cookTime: 0,
    difficulty: 'easy',
    tags: ['party', 'snacks', 'drinks', 'gathering'],
    cuisine: 'Mixed',
  },
  {
    id: 'movie-night',
    name: 'Movie Night Pack',
    description: 'Snacks and drinks for a cozy movie night',
    servings: 4,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'pringles', baseQuantity: 1, unit: 'can', optional: false },
      { searchQuery: 'coca cola', baseQuantity: 1, unit: 'bottle', optional: false },
      { searchQuery: 'oreo cookies', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'dairy milk silk', baseQuantity: 2, unit: 'bars', optional: false },
      { searchQuery: 'kurkure', baseQuantity: 2, unit: 'packs', optional: true },
    ],
    prepTime: 0,
    cookTime: 0,
    difficulty: 'easy',
    tags: ['movie', 'snacks', 'evening', 'entertainment'],
    cuisine: 'Mixed',
  },

  // ============================================
  // Healthy Options
  // ============================================
  {
    id: 'healthy-breakfast',
    name: 'Healthy Breakfast Bowl',
    description: 'Nutritious breakfast with yogurt, fruits, and oats',
    servings: 2,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'greek yogurt', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'bananas', baseQuantity: 2, unit: 'pieces', optional: false },
      { searchQuery: 'apples', baseQuantity: 2, unit: 'pieces', optional: false },
      { searchQuery: 'milk', baseQuantity: 500, unit: 'ml', optional: false },
      { searchQuery: 'honey', baseQuantity: 1, unit: 'bottle', optional: true },
    ],
    prepTime: 10,
    cookTime: 0,
    difficulty: 'easy',
    tags: ['healthy', 'breakfast', 'protein', 'fruits'],
    cuisine: 'Continental',
  },
  {
    id: 'protein-meal',
    name: 'High Protein Meal',
    description: 'Protein-rich meal with eggs, paneer, and dal',
    servings: 2,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'paneer', baseQuantity: 200, unit: 'g', optional: false },
      { searchQuery: 'eggs', baseQuantity: 1, unit: 'pack', optional: true },
      { searchQuery: 'moong dal', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'greek yogurt', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'onions', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'tomatoes', baseQuantity: 250, unit: 'g', optional: false },
      { searchQuery: 'ginger garlic paste', baseQuantity: 1, unit: 'pack', optional: false },
    ],
    prepTime: 20,
    cookTime: 30,
    difficulty: 'medium',
    tags: ['protein', 'healthy', 'fitness', 'gym'],
    cuisine: 'Indian',
  },

  // ============================================
  // Tea Time
  // ============================================
  {
    id: 'chai-time',
    name: 'Chai Time Snacks',
    description: 'Perfect accompaniments for evening tea',
    servings: 4,
    dietaryType: 'veg',
    ingredients: [
      { searchQuery: 'tata tea', baseQuantity: 1, unit: 'pack', optional: false },
      { searchQuery: 'milk', baseQuantity: 500, unit: 'ml', optional: false },
      { searchQuery: 'biscuits', baseQuantity: 2, unit: 'packs', optional: false },
      { searchQuery: 'bhujia', baseQuantity: 1, unit: 'pack', optional: true },
      { searchQuery: 'ginger', baseQuantity: 50, unit: 'g', optional: true },
    ],
    prepTime: 5,
    cookTime: 10,
    difficulty: 'easy',
    tags: ['tea', 'evening', 'snacks', 'chai'],
    cuisine: 'Indian',
  },
];

/**
 * Find recipes by name or tags
 */
export function findRecipes(query: string): Recipe[] {
  const searchTerm = query.toLowerCase();
  
  return recipes.filter(recipe => {
    const nameMatch = recipe.name.toLowerCase().includes(searchTerm);
    const tagMatch = recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm));
    const descMatch = recipe.description.toLowerCase().includes(searchTerm);
    const cuisineMatch = recipe.cuisine.toLowerCase().includes(searchTerm);
    
    return nameMatch || tagMatch || descMatch || cuisineMatch;
  });
}

/**
 * Get recipe by ID
 */
export function getRecipeById(id: string): Recipe | undefined {
  return recipes.find(recipe => recipe.id === id);
}

/**
 * Get recipes by dietary type
 */
export function getRecipesByDietaryType(dietaryType: 'veg' | 'non_veg' | 'vegan'): Recipe[] {
  if (dietaryType === 'veg') {
    // Veg includes vegan
    return recipes.filter(recipe => recipe.dietaryType === 'veg' || recipe.dietaryType === 'vegan');
  }
  if (dietaryType === 'vegan') {
    return recipes.filter(recipe => recipe.dietaryType === 'vegan');
  }
  // Non-veg includes all
  return recipes;
}

/**
 * Get all recipe names for suggestions
 */
export function getAllRecipeNames(): string[] {
  return recipes.map(recipe => recipe.name);
}

/**
 * Scale recipe ingredients for different servings
 */
export function scaleRecipeIngredients(recipe: Recipe, targetServings: number): Recipe {
  const scaleFactor = targetServings / recipe.servings;
  
  return {
    ...recipe,
    servings: targetServings,
    ingredients: recipe.ingredients.map(ingredient => ({
      ...ingredient,
      baseQuantity: Math.ceil(ingredient.baseQuantity * scaleFactor),
    })),
  };
}
