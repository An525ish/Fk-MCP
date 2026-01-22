import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useSocket } from '../../hooks/useSocket';

const RootLayout = () => {
  // Initialize socket connection for real-time updates
  useSocket();

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

export default RootLayout;
