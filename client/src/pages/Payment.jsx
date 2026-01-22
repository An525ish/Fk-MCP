import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiCreditCard, FiDollarSign, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { PageLoader, ButtonLoader } from '../components/common/Loader';
import { fetchOrder, setPaymentMode, processPayment } from '../store/slices/orderSlice';
import { resetCart } from '../store/slices/cartSlice';

const Payment = () => {
  const { orderId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [selectedPaymentMode, setSelectedPaymentMode] = useState('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const { currentOrder: order, loading } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrder(orderId));
  }, [dispatch, orderId]);

  const handlePaymentModeChange = async (mode) => {
    setSelectedPaymentMode(mode);
    try {
      await dispatch(setPaymentMode({ orderId, paymentMode: mode })).unwrap();
    } catch (error) {
      console.error('Failed to set payment mode:', error);
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      await dispatch(processPayment(orderId)).unwrap();
      dispatch(resetCart());
      setPaymentSuccess(true);
      toast.success('Payment successful!');
      
      // Redirect to order tracking after 2 seconds
      setTimeout(() => {
        navigate(`/order/${orderId}`);
      }, 2000);
    } catch (error) {
      toast.error(error || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || !order) {
    return <PageLoader />;
  }

  if (paymentSuccess) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-sm shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="text-green-600" size={40} />
          </div>
          <h2 className="text-2xl font-medium text-gray-800 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-500 mb-4">
            Your order has been placed successfully
          </p>
          <p className="text-sm text-gray-500">
            Order ID: <span className="font-medium">{order.orderNumber}</span>
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Redirecting to order tracking...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Payment Options */}
        <div className="flex-1">
          <div className="bg-white rounded-sm shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-medium">PAYMENT OPTIONS</h2>
            </div>

            <div className="p-4 space-y-4">
              {/* UPI */}
              <label
                className={`block p-4 border rounded cursor-pointer transition-colors ${
                  selectedPaymentMode === 'upi'
                    ? 'border-[#2874f0] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMode"
                    checked={selectedPaymentMode === 'upi'}
                    onChange={() => handlePaymentModeChange('upi')}
                  />
                  <FiCreditCard size={24} className="text-gray-600" />
                  <div>
                    <p className="font-medium">UPI</p>
                    <p className="text-sm text-gray-500">
                      Pay using UPI apps like Google Pay, PhonePe, Paytm
                    </p>
                  </div>
                </div>

                {selectedPaymentMode === 'upi' && (
                  <div className="mt-4 pl-10">
                    <div className="bg-gray-50 p-4 rounded text-center">
                      <p className="text-sm text-gray-600 mb-2">
                        Mock UPI Payment
                      </p>
                      <div className="w-32 h-32 bg-white border mx-auto flex items-center justify-center">
                        <span className="text-4xl">📱</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Scan QR code or click Pay Now
                      </p>
                    </div>
                  </div>
                )}
              </label>

              {/* Cash on Delivery */}
              <label
                className={`block p-4 border rounded cursor-pointer transition-colors ${
                  selectedPaymentMode === 'cod'
                    ? 'border-[#2874f0] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMode"
                    checked={selectedPaymentMode === 'cod'}
                    onChange={() => handlePaymentModeChange('cod')}
                  />
                  <FiDollarSign size={24} className="text-gray-600" />
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-gray-500">
                      Pay when your order is delivered
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:w-80">
          <div className="bg-white rounded-sm shadow-sm sticky top-20">
            <div className="p-4 border-b">
              <h2 className="text-gray-500 font-medium">ORDER SUMMARY</h2>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-500 mb-2">
                Order: <span className="font-medium">{order.orderNumber}</span>
              </p>

              <div className="space-y-2 text-sm mb-4">
                {order.items?.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600 truncate flex-1 mr-2">
                      {item.name} × {item.quantity}
                    </span>
                    <span>₹{item.total}</span>
                  </div>
                ))}
                {order.items?.length > 3 && (
                  <p className="text-gray-500">
                    +{order.items.length - 3} more items
                  </p>
                )}
              </div>

              <hr className="my-3" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>
                    {order.deliveryFee === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₹${order.deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span>₹{order.taxes?.toFixed(2)}</span>
                </div>
              </div>

              <hr className="my-3" />

              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>₹{order.totalAmount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 border-t">
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full btn-primary py-3 text-lg disabled:opacity-50 flex items-center justify-center"
              >
                {isProcessing ? (
                  <ButtonLoader />
                ) : selectedPaymentMode === 'cod' ? (
                  'Place Order'
                ) : (
                  `Pay ₹${order.totalAmount?.toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
