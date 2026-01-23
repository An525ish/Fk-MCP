import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiSearch, FiShoppingCart, FiUser, FiMapPin, FiChevronDown, FiPackage, FiLogOut } from 'react-icons/fi';
import { logout } from '../../store/slices/authSlice';
import { isConnected, getSocket } from '../../services/socket';

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { totalItems } = useSelector((state) => state.cart);
  const { activeAddress } = useSelector((state) => state.addresses);

  // Track socket connection status
  useEffect(() => {
    if (!isAuthenticated) {
      setSocketConnected(false);
      return;
    }

    // Poll for connection status (simpler than event-based)
    const checkConnection = () => {
      const connected = isConnected();
      setSocketConnected(connected);
    };

    // Check immediately
    checkConnection();

    // Also listen to socket events if socket exists
    const socket = getSocket();
    if (socket) {
      const onConnect = () => setSocketConnected(true);
      const onDisconnect = () => setSocketConnected(false);
      
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      
      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    }

    // Fallback: poll every 2 seconds
    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <header className="bg-[#2874f0] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <Link to="/" className="flex flex-col items-end">
            <span className="text-white text-xl font-bold italic">Flipkart</span>
            <span className="text-[10px] text-gray-200 italic flex items-center gap-1">
              Explore <span className="text-yellow-400">Plus</span>
              <svg 
                className="h-3 w-3" 
                viewBox="0 0 16 16" 
                fill="none"
              >
                <path 
                  d="M8 0L10.2 5.3L16 6.2L12 10.1L12.8 16L8 13.3L3.2 16L4 10.1L0 6.2L5.8 5.3L8 0Z" 
                  fill="#FFE500"
                />
              </svg>
            </span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative flex items-center bg-white rounded-sm">
              <input
                type="text"
                placeholder="Search for products, brands and more"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pl-4 pr-12 text-sm text-gray-700 bg-transparent border-none outline-none focus:ring-0"
              />
              <button 
                type="submit"
                className="absolute right-0 top-0 h-full px-4 text-[#2874f0] hover:text-[#1a5dc7] bg-gray-50 border-l border-gray-200"
              >
                <FiSearch size={20} />
              </button>
            </div>
          </form>

          {/* Right Section */}
          <div className="flex items-center gap-6">
            {/* Delivery Location */}
            {isAuthenticated && activeAddress && (
              <Link 
                to="/addresses" 
                className="hidden md:flex items-center gap-1 text-white text-sm hover:text-gray-200"
              >
                <FiMapPin size={16} />
                <span className="max-w-[120px] truncate">
                  {activeAddress.city}, {activeAddress.pincode}
                </span>
              </Link>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1 text-white font-medium hover:text-gray-200"
                >
                  <FiUser size={18} />
                  <span className="hidden md:inline max-w-[100px] truncate">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <FiChevronDown size={14} />
                </button>

                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded shadow-lg z-20 py-2 animate-fade-in">
                      <Link
                        to="/orders"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <FiPackage size={16} />
                        My Orders
                      </Link>
                      <Link
                        to="/addresses"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <FiMapPin size={16} />
                        My Addresses
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 w-full"
                      >
                        <FiLogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-white text-[#2874f0] px-8 py-1.5 font-medium rounded-sm hover:bg-gray-100"
              >
                Login
              </Link>
            )}

            {/* Cart */}
            <Link to="/cart" className="flex items-center gap-1 text-white font-medium hover:text-gray-200">
              <div className="relative">
                <FiShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#ff6161] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </div>
              <span className="hidden md:inline">Cart</span>
            </Link>

            {/* Real-time sync indicator */}
            {isAuthenticated && socketConnected && (
              <div className="hidden md:flex items-center gap-1 text-green-300 text-xs" title="Real-time sync active">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
                <span>Live</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
