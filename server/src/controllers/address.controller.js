import Address from '../models/Address.model.js';
import User from '../models/User.model.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';

// @desc    Get all addresses for user
// @route   GET /api/addresses
// @access  Private
export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ userId: req.user._id })
    .sort({ isDefault: -1, createdAt: -1 });

  res.json({
    success: true,
    data: { addresses }
  });
});

// @desc    Get single address
// @route   GET /api/addresses/:id
// @access  Private
export const getAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ 
    _id: req.params.id, 
    userId: req.user._id 
  });

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  res.json({
    success: true,
    data: { address }
  });
});

// @desc    Create new address
// @route   POST /api/addresses
// @access  Private
export const createAddress = asyncHandler(async (req, res) => {
  const {
    type,
    name,
    phone,
    addressLine1,
    addressLine2,
    landmark,
    city,
    state,
    pincode,
    isDefault
  } = req.body;

  // Check if this is the first address (make it default)
  const existingAddresses = await Address.countDocuments({ userId: req.user._id });
  const shouldBeDefault = existingAddresses === 0 || isDefault;

  const address = await Address.create({
    userId: req.user._id,
    type,
    name,
    phone,
    addressLine1,
    addressLine2,
    landmark,
    city,
    state,
    pincode,
    isDefault: shouldBeDefault
  });

  // If this is the first address or set as default, update user's active address
  if (shouldBeDefault) {
    await User.findByIdAndUpdate(req.user._id, { activeAddressId: address._id });
  }

  res.status(201).json({
    success: true,
    message: 'Address added successfully',
    data: { address }
  });
});

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Private
export const updateAddress = asyncHandler(async (req, res) => {
  const {
    type,
    name,
    phone,
    addressLine1,
    addressLine2,
    landmark,
    city,
    state,
    pincode,
    isDefault
  } = req.body;

  let address = await Address.findOne({ 
    _id: req.params.id, 
    userId: req.user._id 
  });

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  // Update fields
  if (type) address.type = type;
  if (name) address.name = name;
  if (phone) address.phone = phone;
  if (addressLine1) address.addressLine1 = addressLine1;
  if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
  if (landmark !== undefined) address.landmark = landmark;
  if (city) address.city = city;
  if (state) address.state = state;
  if (pincode) address.pincode = pincode;
  if (isDefault !== undefined) address.isDefault = isDefault;

  await address.save();

  // If set as default, update user's active address
  if (isDefault) {
    await User.findByIdAndUpdate(req.user._id, { activeAddressId: address._id });
  }

  res.json({
    success: true,
    message: 'Address updated successfully',
    data: { address }
  });
});

// @desc    Delete address
// @route   DELETE /api/addresses/:id
// @access  Private
export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ 
    _id: req.params.id, 
    userId: req.user._id 
  });

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  const wasDefault = address.isDefault;
  await address.deleteOne();

  // If deleted address was default, set another as default
  if (wasDefault) {
    const newDefault = await Address.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    if (newDefault) {
      newDefault.isDefault = true;
      await newDefault.save();
      await User.findByIdAndUpdate(req.user._id, { activeAddressId: newDefault._id });
    } else {
      await User.findByIdAndUpdate(req.user._id, { activeAddressId: null });
    }
  }

  res.json({
    success: true,
    message: 'Address deleted successfully'
  });
});

// @desc    Set address as default
// @route   PUT /api/addresses/:id/default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ 
    _id: req.params.id, 
    userId: req.user._id 
  });

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  // Remove default from all other addresses
  await Address.updateMany(
    { userId: req.user._id, _id: { $ne: address._id } },
    { isDefault: false }
  );

  // Set this address as default
  address.isDefault = true;
  await address.save();

  // Update user's active address
  await User.findByIdAndUpdate(req.user._id, { activeAddressId: address._id });

  res.json({
    success: true,
    message: 'Default address updated',
    data: { address }
  });
});
