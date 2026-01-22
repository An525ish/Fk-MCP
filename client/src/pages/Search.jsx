import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ProductCard from '../components/product/ProductCard';
import ProductCardSkeleton from '../components/product/ProductCardSkeleton';
import { searchProducts, clearSearchResults } from '../store/slices/productSlice';

const Search = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const { searchResults, pagination, loading } = useSelector((state) => state.products);

  useEffect(() => {
    if (query) {
      dispatch(searchProducts({ q: query }));
    }

    return () => {
      dispatch(clearSearchResults());
    };
  }, [dispatch, query]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-800">
          {query ? (
            <>
              Search results for "<span className="text-[#2874f0]">{query}</span>"
            </>
          ) : (
            'Search Products'
          )}
        </h1>
        {!loading && searchResults.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} products found
          </p>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {searchResults.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : query ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            No results found
          </h2>
          <p className="text-gray-500">
            We couldn't find any products matching "{query}"
          </p>
          <p className="text-gray-500 mt-2">
            Try searching with different keywords
          </p>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🛍️</div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">
            Start searching
          </h2>
          <p className="text-gray-500">
            Enter a search term to find products
          </p>
        </div>
      )}
    </div>
  );
};

export default Search;
