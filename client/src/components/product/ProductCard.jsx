import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiStar, FiPlus, FiMinus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { addToCart, updateCartItem } from '../../store/slices/cartSlice';

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);

  const cartItem = items.find(item => item.productId === product._id);
  const quantity = cartItem?.quantity || 0;

  const discountPercent = product.mrp > product.price 
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }

    try {
      await dispatch(addToCart({ productId: product._id, quantity: 1 })).unwrap();
      toast.success('Added to cart');
    } catch (error) {
      toast.error(error || 'Failed to add to cart');
    }
  };

  const handleUpdateQuantity = async (e, newQuantity) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await dispatch(updateCartItem({ productId: product._id, quantity: newQuantity })).unwrap();
    } catch (error) {
      toast.error(error || 'Failed to update cart');
    }
  };

  return (
    <Link 
      to={`/product/${product._id}`}
      className="product-card bg-white rounded-sm shadow-sm overflow-hidden block"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50 p-4">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        {discountPercent > 0 && (
          <span className="absolute top-2 left-2 badge-discount">
            {discountPercent}% OFF
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
        )}

        {/* Name */}
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1 min-h-[40px]">
          {product.name}
        </h3>

        {/* Unit */}
        <p className="text-xs text-gray-500 mb-2">{product.unit}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <span className="flex items-center gap-0.5 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded">
            {product.rating.toFixed(1)}
            <FiStar size={10} fill="white" />
          </span>
          <span className="text-xs text-gray-500">
            ({product.reviewCount.toLocaleString()})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-medium">₹{product.price}</span>
          {discountPercent > 0 && (
            <span className="text-sm text-gray-500 line-through">₹{product.mrp}</span>
          )}
        </div>

        {/* Delivery Time */}
        <p className="text-xs text-green-600 mb-3">
          {product.estimatedDeliveryMins} mins delivery
        </p>

        {/* Add to Cart / Quantity Controls */}
        {quantity > 0 ? (
          <div className="flex items-center justify-center gap-3 bg-[#2874f0] rounded-sm py-1.5">
            <button
              onClick={(e) => handleUpdateQuantity(e, quantity - 1)}
              className="text-white p-1 hover:bg-[#1a5dc7] rounded"
            >
              <FiMinus size={16} />
            </button>
            <span className="text-white font-medium min-w-[20px] text-center">
              {quantity}
            </span>
            <button
              onClick={(e) => handleUpdateQuantity(e, quantity + 1)}
              className="text-white p-1 hover:bg-[#1a5dc7] rounded"
              disabled={quantity >= 10}
            >
              <FiPlus size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            className="w-full btn-secondary py-2 text-sm"
          >
            ADD
          </button>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
