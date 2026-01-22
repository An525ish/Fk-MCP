import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderAPI, checkoutAPI } from '../../services/api';

const initialState = {
  orders: [],
  currentOrder: null,
  orderStatus: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },
  loading: false,
  error: null
};

// Async thunks
export const fetchOrderHistory = createAsyncThunk(
  'orders/fetchOrderHistory',
  async (params, { rejectWithValue }) => {
    try {
      const response = await orderAPI.getOrderHistory(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch orders'
      );
    }
  }
);

export const fetchOrder = createAsyncThunk(
  'orders/fetchOrder',
  async (id, { rejectWithValue }) => {
    try {
      const response = await orderAPI.getOrder(id);
      return response.data.data.order;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch order'
      );
    }
  }
);

export const fetchOrderStatus = createAsyncThunk(
  'orders/fetchOrderStatus',
  async (id, { rejectWithValue }) => {
    try {
      const response = await orderAPI.getOrderStatus(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch order status'
      );
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (addressId, { rejectWithValue }) => {
    try {
      const response = await checkoutAPI.proceedToCheckout(addressId);
      return response.data.data.order;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create order'
      );
    }
  }
);

export const setPaymentMode = createAsyncThunk(
  'orders/setPaymentMode',
  async ({ orderId, paymentMode }, { rejectWithValue }) => {
    try {
      const response = await orderAPI.setPaymentMode(orderId, paymentMode);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to set payment mode'
      );
    }
  }
);

export const processPayment = createAsyncThunk(
  'orders/processPayment',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await orderAPI.processPayment(orderId);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Payment failed'
      );
    }
  }
);

export const cancelOrder = createAsyncThunk(
  'orders/cancelOrder',
  async ({ orderId, reason }, { rejectWithValue }) => {
    try {
      const response = await orderAPI.cancelOrder(orderId, reason);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to cancel order'
      );
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
      state.orderStatus = null;
    },
    clearOrderError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Order History
      .addCase(fetchOrderHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchOrderHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Single Order
      .addCase(fetchOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Order Status
      .addCase(fetchOrderStatus.fulfilled, (state, action) => {
        state.orderStatus = action.payload;
      })
      // Create Order
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Set Payment Mode
      .addCase(setPaymentMode.fulfilled, (state, action) => {
        if (state.currentOrder) {
          state.currentOrder.paymentMode = action.payload.paymentMode;
        }
      })
      // Process Payment
      .addCase(processPayment.pending, (state) => {
        state.loading = true;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentOrder) {
          state.currentOrder.paymentStatus = action.payload.paymentStatus;
          state.currentOrder.orderStatus = action.payload.orderStatus;
        }
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Cancel Order
      .addCase(cancelOrder.fulfilled, (state, action) => {
        if (state.currentOrder && state.currentOrder._id === action.payload.orderId) {
          state.currentOrder.orderStatus = action.payload.orderStatus;
        }
        // Update in orders list
        const index = state.orders.findIndex(o => o._id === action.payload.orderId);
        if (index !== -1) {
          state.orders[index].orderStatus = action.payload.orderStatus;
        }
      });
  }
});

export const { clearCurrentOrder, clearOrderError } = orderSlice.actions;
export default orderSlice.reducer;
