import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

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

export default RootLayout;
