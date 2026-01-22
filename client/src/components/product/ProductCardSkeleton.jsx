const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-sm shadow-sm overflow-hidden">
      {/* Image skeleton */}
      <div className="aspect-square bg-gray-200 animate-pulse" />

      {/* Details skeleton */}
      <div className="p-3">
        <div className="h-3 bg-gray-200 rounded w-16 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-full mb-1 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-12 mb-2 animate-pulse" />
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 bg-gray-200 rounded w-12 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 bg-gray-200 rounded w-16 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-24 mb-3 animate-pulse" />
        <div className="h-9 bg-gray-200 rounded w-full animate-pulse" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
