import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const CategoryCarousel = () => {
  const scrollRef = useRef(null);
  const { categories, loading } = useSelector((state) => state.products);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-8 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center min-w-[80px]">
                <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse mb-2" />
                <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm relative">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Scroll buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 hidden md:block"
        >
          <FiChevronLeft size={20} />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 hidden md:block"
        >
          <FiChevronRight size={20} />
        </button>

        {/* Categories */}
        <div
          ref={scrollRef}
          className="flex gap-8 overflow-x-auto hide-scrollbar scroll-smooth"
        >
          {categories.map((category) => (
            <Link
              key={category._id}
              to={`/category/${category._id}`}
              className="flex flex-col items-center min-w-[80px] group"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden mb-2 group-hover:shadow-lg transition-shadow">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center group-hover:text-[#2874f0] transition-colors">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryCarousel;
