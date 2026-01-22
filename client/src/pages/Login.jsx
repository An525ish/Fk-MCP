import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { ButtonLoader } from '../components/common/Loader';
import { login, clearError } from '../store/slices/authSlice';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    dispatch(login(formData));
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl bg-white rounded-sm shadow-lg flex overflow-hidden">
        {/* Left Side - Branding */}
        <div className="hidden md:flex md:w-2/5 bg-[#2874f0] p-8 flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Login</h2>
            <p className="text-blue-100">
              Get access to your Orders, Wishlist and Recommendations
            </p>
          </div>
          <img
            src="https://static-assets-web.flixcart.com/batman-returns/batman-returns/p/images/login_img-c6e3c.png"
            alt="Login"
            className="w-full"
          />
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-3/5 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                name="email"
                placeholder="Enter Email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <input
                type="password"
                name="password"
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                autoComplete="current-password"
              />
            </div>

            <p className="text-xs text-gray-500">
              By continuing, you agree to Flipkart's{' '}
              <a href="#" className="text-[#2874f0]">Terms of Use</a> and{' '}
              <a href="#" className="text-[#2874f0]">Privacy Policy</a>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <ButtonLoader /> : 'Login'}
            </button>

            <div className="text-center">
              <Link
                to="/register"
                className="text-[#2874f0] font-medium hover:underline"
              >
                New to Flipkart? Create an account
              </Link>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-600 font-medium mb-2">Demo Credentials:</p>
            <p className="text-sm text-gray-500">Email: test@example.com</p>
            <p className="text-sm text-gray-500">Password: password123</p>
            <button
              type="button"
              onClick={() => setFormData({ email: 'test@example.com', password: 'password123' })}
              className="mt-2 text-[#2874f0] text-sm font-medium"
            >
              Fill Demo Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
