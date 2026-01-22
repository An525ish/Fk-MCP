import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addressAPI, sessionAPI } from '../../services/api';

const initialState = {
  addresses: [],
  activeAddress: null,
  loading: false,
  error: null
};

// Async thunks
export const fetchAddresses = createAsyncThunk(
  'addresses/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await addressAPI.getAddresses();
      return response.data.data.addresses;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch addresses'
      );
    }
  }
);

export const createAddress = createAsyncThunk(
  'addresses/createAddress',
  async (data, { rejectWithValue }) => {
    try {
      const response = await addressAPI.createAddress(data);
      return response.data.data.address;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create address'
      );
    }
  }
);

export const updateAddress = createAsyncThunk(
  'addresses/updateAddress',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await addressAPI.updateAddress(id, data);
      return response.data.data.address;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update address'
      );
    }
  }
);

export const deleteAddress = createAsyncThunk(
  'addresses/deleteAddress',
  async (id, { rejectWithValue }) => {
    try {
      await addressAPI.deleteAddress(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete address'
      );
    }
  }
);

export const setDefaultAddress = createAsyncThunk(
  'addresses/setDefaultAddress',
  async (id, { rejectWithValue }) => {
    try {
      const response = await addressAPI.setDefaultAddress(id);
      return response.data.data.address;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to set default address'
      );
    }
  }
);

export const fetchActiveAddress = createAsyncThunk(
  'addresses/fetchActiveAddress',
  async (_, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.getDeliveryLocation();
      return response.data.data.activeAddress;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch active address'
      );
    }
  }
);

export const setDeliveryLocation = createAsyncThunk(
  'addresses/setDeliveryLocation',
  async (addressId, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.setDeliveryLocation(addressId);
      return response.data.data.activeAddress;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to set delivery location'
      );
    }
  }
);

const addressSlice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {
    clearAddressError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Addresses
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses = action.payload;
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Address
      .addCase(createAddress.pending, (state) => {
        state.loading = true;
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses.unshift(action.payload);
        if (action.payload.isDefault) {
          state.activeAddress = action.payload;
        }
      })
      .addCase(createAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Address
      .addCase(updateAddress.fulfilled, (state, action) => {
        const index = state.addresses.findIndex(a => a._id === action.payload._id);
        if (index !== -1) {
          state.addresses[index] = action.payload;
        }
        if (action.payload.isDefault) {
          state.activeAddress = action.payload;
        }
      })
      // Delete Address
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.addresses = state.addresses.filter(a => a._id !== action.payload);
        if (state.activeAddress?._id === action.payload) {
          state.activeAddress = state.addresses.find(a => a.isDefault) || state.addresses[0] || null;
        }
      })
      // Set Default Address
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.addresses = state.addresses.map(a => ({
          ...a,
          isDefault: a._id === action.payload._id
        }));
        state.activeAddress = action.payload;
      })
      // Fetch Active Address
      .addCase(fetchActiveAddress.fulfilled, (state, action) => {
        state.activeAddress = action.payload;
      })
      // Set Delivery Location
      .addCase(setDeliveryLocation.fulfilled, (state, action) => {
        state.activeAddress = action.payload;
      });
  }
});

export const { clearAddressError } = addressSlice.actions;
export default addressSlice.reducer;
