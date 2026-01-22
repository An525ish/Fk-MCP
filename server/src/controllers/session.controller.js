import User from '../models/User.model.js';
import Address from '../models/Address.model.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';

// @desc    Set delivery location for session
// @route   POST /api/session/location
// @access  Private
export const setDeliveryLocation = asyncHandler(async (req, res) => {
  const { addressId } = req.body;

  // Validate address belongs to user
  const address = await Address.findOne({ 
    _id: addressId, 
    userId: req.user._id 
  });

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  if (!address.isServiceable) {
    throw new AppError('Delivery not available at this location', 400);
  }

  // Update user's active address
  await User.findByIdAndUpdate(req.user._id, { activeAddressId: addressId });

  res.json({
    success: true,
    message: 'Delivery location updated',
    data: {
      activeAddress: {
        id: address._id,
        type: address.type,
        name: address.name,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        pincode: address.pincode
      }
    }
  });
});

// @desc    Get current delivery location
// @route   GET /api/session/location
// @access  Private
export const getDeliveryLocation = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('activeAddressId');

  if (!user.activeAddressId) {
    return res.json({
      success: true,
      data: {
        activeAddress: null,
        message: 'No delivery location set'
      }
    });
  }

  res.json({
    success: true,
    data: {
      activeAddress: {
        id: user.activeAddressId._id,
        type: user.activeAddressId.type,
        name: user.activeAddressId.name,
        phone: user.activeAddressId.phone,
        addressLine1: user.activeAddressId.addressLine1,
        addressLine2: user.activeAddressId.addressLine2,
        landmark: user.activeAddressId.landmark,
        city: user.activeAddressId.city,
        state: user.activeAddressId.state,
        pincode: user.activeAddressId.pincode
      }
    }
  });
});

// @desc    Check if pincode is serviceable
// @route   GET /api/session/check-pincode/:pincode
// @access  Public
export const checkPincode = asyncHandler(async (req, res) => {
  const { pincode } = req.params;

  // Validate pincode format
  if (!/^\d{6}$/.test(pincode)) {
    throw new AppError('Invalid pincode format', 400);
  }

  // For demo purposes, we'll make most pincodes serviceable
  // In production, this would check against a database of serviceable areas
  const serviceablePrefixes = ['11', '12', '13', '20', '21', '22', '40', '41', '50', '56', '60', '70', '80'];
  const isServiceable = serviceablePrefixes.some(prefix => pincode.startsWith(prefix));

  res.json({
    success: true,
    data: {
      pincode,
      isServiceable,
      message: isServiceable 
        ? 'Delivery available in your area' 
        : 'Sorry, delivery not available in this area yet',
      estimatedDeliveryMins: isServiceable ? 15 : null
    }
  });
});
