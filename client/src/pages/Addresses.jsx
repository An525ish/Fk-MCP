import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { PageLoader, ButtonLoader } from '../components/common/Loader';
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../store/slices/addressSlice';

const initialFormData = {
  type: 'home',
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false
};

const Addresses = () => {
  const dispatch = useDispatch();
  const { addresses, activeAddress, loading } = useSelector((state) => state.addresses);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleEdit = (address) => {
    setFormData({
      type: address.type,
      name: address.name,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      landmark: address.landmark || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault
    });
    setEditingId(address._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await dispatch(deleteAddress(id)).unwrap();
      toast.success('Address deleted');
    } catch (error) {
      toast.error(error || 'Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await dispatch(setDefaultAddress(id)).unwrap();
      toast.success('Default address updated');
    } catch (error) {
      toast.error(error || 'Failed to update default address');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.phone || !formData.addressLine1 || 
        !formData.city || !formData.state || !formData.pincode) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!/^\d{6}$/.test(formData.pincode)) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await dispatch(updateAddress({ id: editingId, data: formData })).unwrap();
        toast.success('Address updated');
      } else {
        await dispatch(createAddress(formData)).unwrap();
        toast.success('Address added');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormData);
    } catch (error) {
      toast.error(error || 'Failed to save address');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  if (loading && addresses.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-sm shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="text-lg font-medium">Manage Addresses</h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-outline text-sm flex items-center gap-1"
            >
              <FiPlus />
              Add New Address
            </button>
          )}
        </div>

        {/* Address Form */}
        {showForm && (
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-medium mb-4">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Address Type */}
              <div className="flex gap-4">
                {['home', 'work', 'other'].map((type) => (
                  <label key={type} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      value={type}
                      checked={formData.type === type}
                      onChange={handleChange}
                    />
                    <span className="capitalize">{type}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name *"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number *"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                  maxLength={10}
                />
              </div>

              <input
                type="text"
                name="addressLine1"
                placeholder="Address Line 1 (House No, Building, Street) *"
                value={formData.addressLine1}
                onChange={handleChange}
                className="input-field"
              />

              <input
                type="text"
                name="addressLine2"
                placeholder="Address Line 2 (Area, Colony)"
                value={formData.addressLine2}
                onChange={handleChange}
                className="input-field"
              />

              <input
                type="text"
                name="landmark"
                placeholder="Landmark"
                value={formData.landmark}
                onChange={handleChange}
                className="input-field"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  name="city"
                  placeholder="City *"
                  value={formData.city}
                  onChange={handleChange}
                  className="input-field"
                />
                <input
                  type="text"
                  name="state"
                  placeholder="State *"
                  value={formData.state}
                  onChange={handleChange}
                  className="input-field"
                />
                <input
                  type="text"
                  name="pincode"
                  placeholder="Pincode *"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="input-field"
                  maxLength={6}
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleChange}
                />
                <span className="text-sm">Make this my default address</span>
              </label>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-secondary flex items-center justify-center min-w-[120px]"
                >
                  {isSubmitting ? <ButtonLoader /> : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Address List */}
        <div className="divide-y">
          {addresses.length === 0 ? (
            <div className="p-8 text-center">
              <FiMapPin className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">No addresses saved yet</p>
            </div>
          ) : (
            addresses.map((address) => (
              <div
                key={address._id}
                className={`p-4 ${
                  activeAddress?._id === address._id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{address.name}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded uppercase">
                        {address.type}
                      </span>
                      {address.isDefault && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <FiCheck size={10} />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {address.addressLine1}
                      {address.addressLine2 && `, ${address.addressLine2}`}
                    </p>
                    {address.landmark && (
                      <p className="text-sm text-gray-500">
                        Landmark: {address.landmark}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      {address.city}, {address.state} - {address.pincode}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Phone: {address.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(address)}
                      className="p-2 text-gray-500 hover:text-[#2874f0] hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(address._id)}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded"
                      title="Delete"
                    >
                      <FiTrash2 size={16} />
                    </button>
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefault(address._id)}
                        className="text-[#2874f0] text-sm font-medium hover:underline ml-2"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Addresses;
