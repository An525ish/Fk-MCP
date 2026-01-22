import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiPlus, FiMinus, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { PageLoader } from '../components/common/Loader';
import { fetchCart, updateCartItem, removeFromCart } from '../store/slices/cartSlice';

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items, bill, loading } = useSelector((state) => state.cart);
  const { activeAddress } = useSelector((state) => state.addresses);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const handleUpdateQuantity = async (productId, quantity) => {
    try {
      await dispatch(updateCartItem({ productId, quantity })).unwrap();
    } catch (error) {
      toast.error(error || 'Failed to update cart');
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      await dispatch(removeFromCart({ productId })).unwrap();
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error(error || 'Failed to remove item');
    }
  };

  const handleCheckout = () => {
    if (!activeAddress) {
      toast.error('Please add a delivery address first');
      navigate('/addresses');
      return;
    }
    navigate('/checkout');
  };

  if (loading && items.length === 0) {
    return <PageLoader />;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-white rounded-sm shadow-sm p-8 text-center">
          <FiShoppingBag className="mx-auto text-gray-300 mb-4" size={80} />
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mb-6">
            Add items to your cart to continue shopping
          </p>
          <Link to="/" className="btn-secondary inline-block">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Cart Items */}
        <div className="flex-1">
          <div className="bg-white rounded-sm shadow-sm">
            {/* Header */}
            <div className="p-4 border-b">
              <h1 className="text-lg font-medium">
                My Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h1>
            </div>

            {/* Delivery Address */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">Deliver to: </span>
                  {activeAddress ? (
                    <span className="font-medium">
                      {activeAddress.name}, {activeAddress.pincode}
                    </span>
                  ) : (
                    <span className="text-gray-500">No address selected</span>
                  )}
                </div>
                <Link
                  to="/addresses"
                  className="text-[#2874f0] text-sm font-medium"
                >
                  {activeAddress ? 'Change' : 'Add Address'}
                </Link>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.productId} className="p-4 flex gap-4">
                  {/* Image */}
                  <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-24 h-24 object-contain bg-gray-50 rounded"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.productId}`}
                      className="text-gray-800 font-medium hover:text-[#2874f0] line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">{item.unit}</p>
                    <p className="text-lg font-medium mt-2">₹{item.price}</p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center border rounded">
                        <button
                          onClick={() =>
                            handleUpdateQuantity(item.productId, item.quantity - 1)
                          }
                          className="p-2 hover:bg-gray-100"
                          disabled={item.quantity <= 1}
                        >
                          <FiMinus size={14} />
                        </button>
                        <span className="px-4 py-1 border-x min-w-[40px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleUpdateQuantity(item.productId, item.quantity + 1)
                          }
                          className="p-2 hover:bg-gray-100"
                          disabled={item.quantity >= 10}
                        >
                          <FiPlus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-gray-500 hover:text-red-500 p-2"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p className="font-medium">₹{item.price * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Place Order Button (Mobile) */}
            <div className="p-4 border-t lg:hidden">
              <button
                onClick={handleCheckout}
                className="w-full btn-primary py-3 text-lg"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>

        {/* Price Details */}
        <div className="lg:w-96">
          <div className="bg-white rounded-sm shadow-sm sticky top-20">
            <div className="p-4 border-b">
              <h2 className="text-gray-500 font-medium">PRICE DETAILS</h2>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span>Price ({items.length} items)</span>
                <span>₹{bill.subtotal}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery Charges</span>
                {bill.deliveryFee === 0 ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  <span>₹{bill.deliveryFee}</span>
                )}
              </div>

              <div className="flex justify-between">
                <span>Taxes (5% GST)</span>
                <span>₹{bill.taxes.toFixed(2)}</span>
              </div>

              {bill.amountToFreeDelivery > 0 && (
                <div className="bg-green-50 text-green-700 text-sm p-2 rounded">
                  Add ₹{bill.amountToFreeDelivery} more for FREE delivery
                </div>
              )}

              <hr />

              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount</span>
                <span>₹{bill.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Place Order Button (Desktop) */}
            <div className="p-4 border-t hidden lg:block">
              <button
                onClick={handleCheckout}
                className="w-full btn-primary py-3 text-lg"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
