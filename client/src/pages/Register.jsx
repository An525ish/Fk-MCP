import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { ButtonLoader } from '../components/common/Loader';
import { register, clearError } from '../store/slices/authSlice';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

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

    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    dispatch(register({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      password: formData.password
    }));
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl bg-white rounded-sm shadow-lg flex overflow-hidden">
        {/* Left Side - Branding */}
        <div className="hidden md:flex md:w-2/5 bg-[#2874f0] p-8 flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Looks like you're new here!
            </h2>
            <p className="text-blue-100">
              Sign up with your email to get started
            </p>
          </div>
          <div className="flex items-center justify-center">
            <svg className="w-48 h-48" viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="80" r="40" fill="#FFE500"/>
              <circle cx="100" cy="80" r="30" fill="#2874f0"/>
              <circle cx="90" cy="75" r="5" fill="white"/>
              <circle cx="110" cy="75" r="5" fill="white"/>
              <path d="M85 90 Q100 105 115 90" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M60 140 L100 110 L140 140" stroke="#FFE500" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="100" cy="160" r="20" fill="#FFE500"/>
              <path d="M100 150 L100 170 M90 160 L110 160" stroke="#2874f0" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-3/5 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                name="name"
                placeholder="Full Name *"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                autoComplete="name"
              />
            </div>

            <div>
              <input
                type="email"
                name="email"
                placeholder="Email *"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number (optional)"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                autoComplete="tel"
                maxLength={10}
              />
            </div>

            <div>
              <input
                type="password"
                name="password"
                placeholder="Password *"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                autoComplete="new-password"
              />
            </div>

            <div>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password *"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input-field"
                autoComplete="new-password"
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
              {loading ? <ButtonLoader /> : 'Create Account'}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-[#2874f0] font-medium hover:underline"
              >
                Existing User? Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
