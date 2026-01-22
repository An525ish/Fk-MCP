import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiFilter } from 'react-icons/fi';
import ProductCard from '../components/product/ProductCard';
import ProductCardSkeleton from '../components/product/ProductCardSkeleton';
import { fetchProductsByCategory, filterProducts, setFilters } from '../store/slices/productSlice';

const Category = () => {
  const { categoryId } = useParams();
  const dispatch = useDispatch();
  const [showFilters, setShowFilters] = useState(false);

  const { products, categories, pagination, filters, loading } = useSelector(
    (state) => state.products
  );

  const category = categories.find((c) => c._id === categoryId);

  useEffect(() => {
    dispatch(fetchProductsByCategory({ categoryId }));
  }, [dispatch, categoryId]);

  const handleFilterChange = (key, value) => {
    dispatch(setFilters({ [key]: value }));
    dispatch(filterProducts({ 
      category: categoryId,
      ...filters,
      [key]: value 
    }));
  };

  const handleSortChange = (sortBy) => {
    dispatch(setFilters({ sortBy }));
    dispatch(filterProducts({ 
      category: categoryId,
      ...filters,
      sortBy 
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <div className={`
          ${showFilters ? 'fixed inset-0 z-50 bg-white p-4' : 'hidden'} 
          md:block md:static md:w-64 md:flex-shrink-0
        `}>
          <div className="bg-white rounded-sm shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Filters</h3>
              <button 
                className="md:hidden text-gray-500"
                onClick={() => setShowFilters(false)}
              >
                ✕
              </button>
            </div>

            {/* Price Filter */}
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3">Price Range</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="price"
                    onChange={() => handleFilterChange('maxPrice', 50)}
                    className="text-[#2874f0]"
                  />
                  Under ₹50
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="price"
                    onChange={() => {
                      handleFilterChange('minPrice', 50);
                      handleFilterChange('maxPrice', 100);
                    }}
                    className="text-[#2874f0]"
                  />
                  ₹50 - ₹100
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="price"
                    onChange={() => {
                      handleFilterChange('minPrice', 100);
                      handleFilterChange('maxPrice', 200);
                    }}
                    className="text-[#2874f0]"
                  />
                  ₹100 - ₹200
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="price"
                    onChange={() => handleFilterChange('minPrice', 200)}
                    className="text-[#2874f0]"
                  />
                  Above ₹200
                </label>
              </div>
            </div>

            {/* Dietary Filter */}
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3">Dietary Preference</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="dietary"
                    onChange={() => handleFilterChange('dietary', 'veg')}
                    className="text-[#2874f0]"
                  />
                  <span className="w-3 h-3 border-2 border-green-600 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  </span>
                  Vegetarian
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="dietary"
                    onChange={() => handleFilterChange('dietary', 'non_veg')}
                    className="text-[#2874f0]"
                  />
                  <span className="w-3 h-3 border-2 border-red-600 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                  </span>
                  Non-Vegetarian
                </label>
              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                dispatch(setFilters({
                  minPrice: null,
                  maxPrice: null,
                  dietary: null,
                  sortBy: 'rating'
                }));
                dispatch(fetchProductsByCategory({ categoryId }));
              }}
              className="text-[#2874f0] text-sm font-medium"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Products */}
        <div className="flex-1">
          {/* Header */}
          <div className="bg-white rounded-sm shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-medium">
                  {category?.name || 'Products'}
                </h1>
                {!loading && (
                  <p className="text-sm text-gray-500">
                    {pagination.total} products
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Mobile Filter Button */}
                <button
                  className="md:hidden flex items-center gap-1 text-sm"
                  onClick={() => setShowFilters(true)}
                >
                  <FiFilter />
                  Filters
                </button>

                {/* Sort */}
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#2874f0]"
                >
                  <option value="rating">Popularity</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-sm shadow-sm">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-xl font-medium text-gray-800 mb-2">
                No products found
              </h2>
              <p className="text-gray-500">
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Category;
