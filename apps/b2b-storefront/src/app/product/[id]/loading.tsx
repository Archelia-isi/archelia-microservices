export default function ProductLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12 animate-pulse">
      {/* BREADCRUMB SKELETON */}
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* IMAGE GALLERY SKELETON */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          <div className="w-full aspect-square bg-gray-100 rounded-lg"></div>
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded"></div>
            <div className="w-20 h-20 bg-gray-100 rounded"></div>
          </div>
        </div>

        {/* PRODUCT INFO SKELETON */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-100 rounded w-32"></div>
          </div>

          <div className="h-8 bg-gray-200 rounded w-full mb-2 mt-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-8"></div>

          {/* BUY BOX SKELETON */}
          <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm mb-12">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="flex-1">
                <div className="h-10 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/4"></div>
              </div>
              <div className="w-full md:w-auto flex flex-col items-center gap-4">
                <div className="h-12 bg-gray-100 rounded w-32"></div>
                <div className="h-12 bg-gray-200 rounded w-full md:w-48"></div>
              </div>
            </div>
          </div>

          {/* TABS SKELETON */}
          <div className="flex border-b border-gray-200 mb-6 gap-8">
            <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-6 bg-gray-100 rounded w-32 mb-2"></div>
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
