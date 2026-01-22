import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiStar, FiPlus, FiMinus, FiShoppingCart, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { PageLoader } from '../components/common/Loader';
import ProductCard from '../components/product/ProductCard';
import { fetchProduct, fetchAlternatives, clearCurrentProduct } from '../store/slices/productSlice';
import { addToCart, updateCartItem } from '../store/slices/cartSlice';

const ProductDetail = () => {
  const { productId } = useParams();
  const dispatch = useDispatch();

  const { currentProduct: product, alternatives, loading } = useSelector(
    (state) => state.products
  );
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);

  const cartItem = items.find((item) => item.productId === productId);
  const quantity = cartItem?.quantity || 0;

  useEffect(() => {
    dispatch(fetchProduct(productId));
    dispatch(fetchAlternatives(productId));

    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [dispatch, productId]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }

    try {
      await dispatch(addToCart({ productId, quantity: 1 })).unwrap();
      toast.success('Added to cart');
    } catch (error) {
      toast.error(error || 'Failed to add to cart');
    }
  };

  const handleUpdateQuantity = async (newQuantity) => {
    try {
      await dispatch(updateCartItem({ productId, quantity: newQuantity })).unwrap();
    } catch (error) {
      toast.error(error || 'Failed to update cart');
    }
  };

  if (loading || !product) {
    return <PageLoader />;
  }

  const discountPercent =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white rounded-sm shadow-sm">
        <div className="grid md:grid-cols-2 gap-8 p-6">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-50 rounded-lg p-8 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {quantity > 0 ? (
                <div className="flex-1 flex items-center justify-center gap-4 bg-[#2874f0] rounded-sm py-3">
                  <button
                    onClick={() => handleUpdateQuantity(quantity - 1)}
                    className="text-white p-1 hover:bg-[#1a5dc7] rounded"
                  >
                    <FiMinus size={20} />
                  </button>
                  <span className="text-white font-medium text-lg min-w-[30px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(quantity + 1)}
                    className="text-white p-1 hover:bg-[#1a5dc7] rounded"
                    disabled={quantity >= 10}
                  >
                    <FiPlus size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <FiShoppingCart size={20} />
                  ADD TO CART
                </button>
              )}
              <Link
                to="/cart"
                className="flex-1 btn-secondary flex items-center justify-center gap-2 py-3"
              >
                <FiZap size={20} />
                BUY NOW
              </Link>
            </div>
          </div>

          {/* Details Section */}
          <div>
            {/* Breadcrumb */}
            <div className="text-sm text-gray-500 mb-2">
              <Link to="/" className="hover:text-[#2874f0]">Home</Link>
              {' > '}
              {product.categoryId && (
                <>
                  <Link 
                    to={`/category/${product.categoryId._id}`}
                    className="hover:text-[#2874f0]"
                  >
                    {product.categoryId.name}
                  </Link>
                  {' > '}
                </>
              )}
              <span className="text-gray-700">{product.name}</span>
            </div>

            {/* Brand */}
            {product.brand && (
              <p className="text-sm text-gray-500 mb-1">{product.brand}</p>
            )}

            {/* Name */}
            <h1 className="text-xl font-medium text-gray-800 mb-2">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1 bg-green-600 text-white text-sm px-2 py-0.5 rounded">
                {product.rating.toFixed(1)}
                <FiStar size={12} fill="white" />
              </span>
              <span className="text-sm text-gray-500">
                {product.reviewCount.toLocaleString()} Ratings & Reviews
              </span>
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-medium">₹{product.price}</span>
                {discountPercent > 0 && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      ₹{product.mrp}
                    </span>
                    <span className="text-lg text-green-600 font-medium">
                      {discountPercent}% off
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                inclusive of all taxes
              </p>
            </div>

            {/* Unit */}
            <div className="mb-4">
              <span className="text-sm text-gray-600">
                Pack Size: <strong>{product.unit}</strong>
              </span>
            </div>

            {/* Delivery */}
            <div className="bg-gray-50 rounded p-4 mb-4">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <FiZap />
                Delivery in {product.estimatedDeliveryMins} minutes
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Free delivery on orders above ₹199
              </p>
            </div>

            {/* Dietary */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`w-4 h-4 border-2 flex items-center justify-center ${
                  product.dietaryPreference === 'veg'
                    ? 'border-green-600'
                    : 'border-red-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    product.dietaryPreference === 'veg'
                      ? 'bg-green-600'
                      : 'bg-red-600'
                  }`}
                />
              </span>
              <span className="text-sm">
                {product.dietaryPreference === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-sm text-gray-600">{product.description}</p>
              </div>
            )}

            {/* Stock */}
            {product.stock < 10 && product.stock > 0 && (
              <p className="text-orange-600 text-sm">
                Only {product.stock} left in stock!
              </p>
            )}
            {product.stock === 0 && (
              <p className="text-red-600 text-sm font-medium">Out of Stock</p>
            )}
          </div>
        </div>
      </div>

      {/* Similar Products */}
      {alternatives.length > 0 && (
        <div className="mt-6 bg-white rounded-sm shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-4">Similar Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {alternatives.slice(0, 6).map((alt) => (
              <ProductCard key={alt._id} product={alt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
