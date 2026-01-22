import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#172337] text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h4 className="text-gray-500 text-xs font-medium mb-3">ABOUT</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="hover:text-white">Contact Us</Link></li>
              <li><Link to="/" className="hover:text-white">About Us</Link></li>
              <li><Link to="/" className="hover:text-white">Careers</Link></li>
              <li><Link to="/" className="hover:text-white">Flipkart Stories</Link></li>
              <li><Link to="/" className="hover:text-white">Press</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-gray-500 text-xs font-medium mb-3">HELP</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="hover:text-white">Payments</Link></li>
              <li><Link to="/" className="hover:text-white">Shipping</Link></li>
              <li><Link to="/" className="hover:text-white">Cancellation & Returns</Link></li>
              <li><Link to="/" className="hover:text-white">FAQ</Link></li>
              <li><Link to="/" className="hover:text-white">Report Infringement</Link></li>
            </ul>
          </div>

          {/* Policy */}
          <div>
            <h4 className="text-gray-500 text-xs font-medium mb-3">POLICY</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="hover:text-white">Return Policy</Link></li>
              <li><Link to="/" className="hover:text-white">Terms Of Use</Link></li>
              <li><Link to="/" className="hover:text-white">Security</Link></li>
              <li><Link to="/" className="hover:text-white">Privacy</Link></li>
              <li><Link to="/" className="hover:text-white">Sitemap</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-gray-500 text-xs font-medium mb-3">SOCIAL</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white">Facebook</a></li>
              <li><a href="#" className="hover:text-white">Twitter</a></li>
              <li><a href="#" className="hover:text-white">YouTube</a></li>
            </ul>
          </div>
        </div>

        <hr className="border-gray-700 my-6" />

        <div className="flex flex-col md:flex-row justify-between items-center text-xs">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" />
              </svg>
              Become a Seller
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Advertise
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
              </svg>
              Gift Cards
            </span>
          </div>

          <p>© 2024 Flipkart Clone. Built for demo purposes.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
