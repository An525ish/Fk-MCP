import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiPackage, FiChevronRight } from 'react-icons/fi';
import { PageLoader } from '../components/common/Loader';
import { fetchOrderHistory } from '../store/slices/orderSlice';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const OrderHistory = () => {
  const dispatch = useDispatch();
  const { orders, pagination, loading } = useSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchOrderHistory());
  }, [dispatch]);

  if (loading && orders.length === 0) {
    return <PageLoader />;
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-sm shadow-sm p-8 text-center">
          <FiPackage className="mx-auto text-gray-300 mb-4" size={80} />
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            No orders yet
          </h2>
          <p className="text-gray-500 mb-6">
            Start shopping to see your orders here
          </p>
          <Link to="/" className="btn-secondary inline-block">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-sm shadow-sm">
        <div className="p-4 border-b">
          <h1 className="text-lg font-medium">My Orders</h1>
          <p className="text-sm text-gray-500">
            {pagination.total} order{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="divide-y">
          {orders.map((order) => (
            <Link
              key={order._id}
              to={`/order/${order._id}`}
              className="block p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Order Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium">#{order.orderNumber}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        statusColors[order.orderStatus]
                      }`}
                    >
                      {statusLabels[order.orderStatus]}
                    </span>
                  </div>

                  {/* Order Date */}
                  <p className="text-sm text-gray-500 mb-2">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>

                  {/* Items Preview */}
                  <div className="flex items-center gap-2 mb-2">
                    {order.items.slice(0, 3).map((item, index) => (
                      <img
                        key={index}
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-contain bg-gray-100 rounded"
                      />
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-sm text-gray-500">
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Items Summary */}
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {order.items.map((item) => item.name).join(', ')}
                  </p>
                </div>

                {/* Price and Arrow */}
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-medium">₹{order.totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <FiChevronRight className="text-gray-400" size={20} />
                </div>
              </div>

              {/* Delivery Address */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Delivered to:</span>{' '}
                  {order.address?.name}, {order.address?.city} - {order.address?.pincode}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Load More */}
        {pagination.page < pagination.pages && (
          <div className="p-4 border-t text-center">
            <button
              onClick={() =>
                dispatch(fetchOrderHistory({ page: pagination.page + 1 }))
              }
              className="text-[#2874f0] font-medium"
            >
              Load More Orders
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
