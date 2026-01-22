import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiCheck, FiClock, FiPackage, FiTruck, FiHome, FiX, FiPhone, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { PageLoader } from '../components/common/Loader';
import { fetchOrderStatus, cancelOrder, clearCurrentOrder } from '../store/slices/orderSlice';

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: FiClock },
  { key: 'confirmed', label: 'Confirmed', icon: FiCheck },
  { key: 'preparing', label: 'Preparing', icon: FiPackage },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: FiTruck },
  { key: 'delivered', label: 'Delivered', icon: FiHome }
];

const OrderTracking = () => {
  const { orderId } = useParams();
  const dispatch = useDispatch();
  const [isCancelling, setIsCancelling] = useState(false);

  const { orderStatus, loading } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrderStatus(orderId));

    // Poll for updates every 10 seconds if order is active
    const interval = setInterval(() => {
      dispatch(fetchOrderStatus(orderId));
    }, 10000);

    return () => {
      clearInterval(interval);
      dispatch(clearCurrentOrder());
    };
  }, [dispatch, orderId]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setIsCancelling(true);
    try {
      await dispatch(cancelOrder({ orderId, reason: 'Cancelled by customer' })).unwrap();
      toast.success('Order cancelled successfully');
      dispatch(fetchOrderStatus(orderId));
    } catch (error) {
      toast.error(error || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading && !orderStatus) {
    return <PageLoader />;
  }

  if (!orderStatus) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-medium text-gray-800 mb-2">Order not found</h2>
        <Link to="/orders" className="text-[#2874f0]">View all orders</Link>
      </div>
    );
  }

  const currentStepIndex = ORDER_STEPS.findIndex(
    (step) => step.key === orderStatus.currentStatus
  );
  const isCancelled = orderStatus.currentStatus === 'cancelled';
  const isDelivered = orderStatus.currentStatus === 'delivered';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Order Header */}
      <div className="bg-white rounded-sm shadow-sm p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-medium">Order #{orderStatus.orderNumber}</h1>
            <p className="text-sm text-gray-500">
              {orderStatus.statusHistory?.[0]?.timestamp && 
                new Date(orderStatus.statusHistory[0].timestamp).toLocaleString()}
            </p>
          </div>

          {!isCancelled && !isDelivered && (
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="text-red-600 border border-red-600 px-4 py-2 rounded hover:bg-red-50 text-sm font-medium disabled:opacity-50"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {/* Order Status */}
      <div className="bg-white rounded-sm shadow-sm p-6 mb-4">
        {isCancelled ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiX className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">Order Cancelled</h2>
            <p className="text-gray-500">
              {orderStatus.paymentStatus === 'refunded' 
                ? 'Refund has been initiated'
                : 'Your order has been cancelled'}
            </p>
          </div>
        ) : (
          <>
            {/* Progress Steps */}
            <div className="relative">
              <div className="flex justify-between mb-8">
                {ORDER_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}
                      >
                        <StepIcon size={20} />
                      </div>
                      <span
                        className={`text-xs mt-2 text-center ${
                          isCompleted ? 'text-green-600 font-medium' : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-0">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{
                    width: `${(currentStepIndex / (ORDER_STEPS.length - 1)) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Live Update */}
            {orderStatus.liveUpdate && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <FiTruck className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">
                      {orderStatus.liveUpdate.message || 'Order in progress'}
                    </p>
                    {orderStatus.liveUpdate.riderName && (
                      <p className="text-sm text-blue-600">
                        Rider: {orderStatus.liveUpdate.riderName}
                      </p>
                    )}
                    {orderStatus.liveUpdate.estimatedMinutes && (
                      <p className="text-sm text-blue-600">
                        Arriving in ~{orderStatus.liveUpdate.estimatedMinutes} mins
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Countdown */}
            {orderStatus.deliveryCountdown && !isDelivered && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">Estimated delivery in</p>
                <p className="text-2xl font-bold text-[#2874f0]">
                  {orderStatus.deliveryCountdown.minutes}:
                  {String(orderStatus.deliveryCountdown.seconds).padStart(2, '0')}
                </p>
              </div>
            )}

            {isDelivered && (
              <div className="mt-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheck className="text-green-600" size={32} />
                </div>
                <h2 className="text-xl font-medium text-gray-800 mb-2">
                  Order Delivered!
                </h2>
                <p className="text-gray-500">
                  Delivered at {new Date(orderStatus.deliveredAt).toLocaleString()}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status History */}
      <div className="bg-white rounded-sm shadow-sm p-4">
        <h3 className="font-medium mb-4">Order Timeline</h3>
        <div className="space-y-4">
          {orderStatus.statusHistory?.map((status, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                {index < orderStatus.statusHistory.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 my-1" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <p className="font-medium text-gray-800">{status.message}</p>
                <p className="text-sm text-gray-500">
                  {new Date(status.timestamp).toLocaleString()}
                </p>
                {status.riderName && (
                  <p className="text-sm text-gray-600 mt-1">
                    <FiPhone className="inline mr-1" size={12} />
                    {status.riderName}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Back to Orders */}
      <div className="mt-4 text-center">
        <Link to="/orders" className="text-[#2874f0] font-medium">
          ← Back to Order History
        </Link>
      </div>
    </div>
  );
};

export default OrderTracking;
