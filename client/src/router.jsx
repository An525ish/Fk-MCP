import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

// Layout
import Header from './components/common/Header';
import Footer from './components/common/Footer';

// Pages
import Home from './pages/Home';
import Search from './pages/Search';
import Category from './pages/Category';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import OrderTracking from './pages/OrderTracking';
import OrderHistory from './pages/OrderHistory';
import Login from './pages/Login';
import Register from './pages/Register';
import Addresses from './pages/Addresses';
import NotFound from './pages/NotFound';

// Auth guard component
import { useSelector } from 'react-redux';

const ProtectedRoute = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

// Root layout with Header and Footer
const RootLayout = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Public Routes
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'search',
        element: <Search />,
      },
      {
        path: 'category/:categoryId',
        element: <Category />,
      },
      {
        path: 'product/:productId',
        element: <ProductDetail />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      
      // Protected Routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'cart',
            element: <Cart />,
          },
          {
            path: 'checkout',
            element: <Checkout />,
          },
          {
            path: 'payment/:orderId',
            element: <Payment />,
          },
          {
            path: 'order/:orderId',
            element: <OrderTracking />,
          },
          {
            path: 'orders',
            element: <OrderHistory />,
          },
          {
            path: 'addresses',
            element: <Addresses />,
          },
        ],
      },
      
      // 404
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

export default router;
