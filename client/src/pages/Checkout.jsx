import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiMapPin, FiCheck, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { PageLoader, ButtonLoader } from '../components/common/Loader';
import { fetchAddresses, setDeliveryLocation } from '../store/slices/addressSlice';
import { createOrder } from '../store/slices/orderSlice';
import { resetCart } from '../store/slices/cartSlice';

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const { addresses, activeAddress, loading: addressLoading } = useSelector(
    (state) => state.addresses
  );
  const { items, bill } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  useEffect(() => {
    if (activeAddress) {
      setSelectedAddressId(activeAddress.id || activeAddress._id);
    } else if (addresses.length > 0) {
      const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddr._id);
    }
  }, [activeAddress, addresses]);

  const handleAddressSelect = async (addressId) => {
    setSelectedAddressId(addressId);
    try {
      await dispatch(setDeliveryLocation(addressId)).unwrap();
    } catch (error) {
      console.error('Failed to set delivery location:', error);
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      navigate('/cart');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const order = await dispatch(createOrder(selectedAddressId)).unwrap();
      navigate(`/payment/${order.id}`);
    } catch (error) {
      toast.error(error || 'Failed to create order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (addressLoading && addresses.length === 0) {
    return <PageLoader />;
  }

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Section */}
        <div className="flex-1 space-y-4">
          {/* Delivery Address */}
          <div className="bg-white rounded-sm shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-[#2874f0] text-white w-6 h-6 rounded-sm flex items-center justify-center text-sm">
                  1
                </span>
                <h2 className="font-medium">DELIVERY ADDRESS</h2>
              </div>
            </div>

            <div className="p-4">
              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <FiMapPin className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500 mb-4">No addresses found</p>
                  <button
                    onClick={() => navigate('/addresses')}
                    className="btn-outline inline-flex items-center gap-2"
                  >
                    <FiPlus />
                    Add New Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address._id}
                      className={`block p-4 border rounded cursor-pointer transition-colors ${
                        selectedAddressId === address._id
                          ? 'border-[#2874f0] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === address._id}
                          onChange={() => handleAddressSelect(address._id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{address.name}</span>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded uppercase">
                              {address.type}
                            </span>
                            {address.isDefault && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {address.addressLine1}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.city}, {address.state} - {address.pincode}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Phone: {address.phone}
                          </p>
                        </div>
                        {selectedAddressId === address._id && (
                          <FiCheck className="text-[#2874f0]" size={20} />
                        )}
                      </div>
                    </label>
                  ))}

                  <button
                    onClick={() => navigate('/addresses')}
                    className="w-full p-4 border border-dashed border-gray-300 rounded text-[#2874f0] font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
                  >
                    <FiPlus />
                    Add New Address
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-sm shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <span className="bg-[#2874f0] text-white w-6 h-6 rounded-sm flex items-center justify-center text-sm">
                2
              </span>
              <h2 className="font-medium">ORDER SUMMARY</h2>
            </div>

            <div className="p-4">
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-contain bg-gray-50 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.unit}</p>
                      <p className="text-sm mt-1">
                        ₹{item.price} × {item.quantity} ={' '}
                        <span className="font-medium">
                          ₹{item.price * item.quantity}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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

              <hr />

              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount</span>
                <span>₹{bill.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 border-t">
              <button
                onClick={handleProceedToPayment}
                disabled={isCreatingOrder || !selectedAddressId}
                className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isCreatingOrder ? <ButtonLoader /> : 'Continue to Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
