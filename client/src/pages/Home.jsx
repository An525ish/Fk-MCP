import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CategoryCarousel from '../components/home/CategoryCarousel';
import ProductCard from '../components/product/ProductCard';
import ProductCardSkeleton from '../components/product/ProductCardSkeleton';
import { fetchFeaturedProducts } from '../store/slices/productSlice';

const Home = () => {
  const dispatch = useDispatch();
  const { featuredProducts, loading } = useSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchFeaturedProducts({ limit: 12 }));
  }, [dispatch]);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#2874f0] to-[#1a5dc7] text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Flipkart Minutes
              </h1>
              <p className="text-lg text-blue-100 mb-4">
                Groceries delivered in minutes, not hours
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  15 min delivery
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  Free delivery above ₹199
                </span>
              </div>
            </div>
            <div className="text-6xl">🛒</div>
          </div>
        </div>
      </div>

      {/* Category Carousel */}
      <CategoryCarousel />

      {/* Featured Products */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-sm shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Top Picks For You</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {loading
              ? [...Array(12)].map((_, i) => <ProductCardSkeleton key={i} />)
              : featuredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
          </div>
        </div>
      </div>

      {/* Promotional Banners */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-sm p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Fresh Fruits & Vegetables</h3>
            <p className="text-green-100 mb-4">Farm fresh produce delivered daily</p>
            <span className="bg-white text-green-600 px-4 py-2 rounded-sm font-medium text-sm">
              Up to 40% OFF
            </span>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-sm p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Dairy & Breakfast</h3>
            <p className="text-orange-100 mb-4">Start your day right</p>
            <span className="bg-white text-orange-600 px-4 py-2 rounded-sm font-medium text-sm">
              Starting ₹25
            </span>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-sm shadow-sm p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl mb-2">⚡</div>
              <h4 className="font-medium mb-1">Super Fast Delivery</h4>
              <p className="text-sm text-gray-500">Get your order in 15 minutes</p>
            </div>
            <div>
              <div className="text-4xl mb-2">✅</div>
              <h4 className="font-medium mb-1">Best Quality</h4>
              <p className="text-sm text-gray-500">Fresh & quality products</p>
            </div>
            <div>
              <div className="text-4xl mb-2">💰</div>
              <h4 className="font-medium mb-1">Best Prices</h4>
              <p className="text-sm text-gray-500">Affordable prices always</p>
            </div>
            <div>
              <div className="text-4xl mb-2">🔄</div>
              <h4 className="font-medium mb-1">Easy Returns</h4>
              <p className="text-sm text-gray-500">Hassle-free returns</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
