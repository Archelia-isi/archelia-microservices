export default function CatalogLoading() {
  return (
    <div className="w-full">
      {/* Header Skeleton */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 animate-pulse">
        <div className="w-full md:w-1/2">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-3/4"></div>
        </div>
        <div className="w-full md:w-1/2 flex gap-2">
          <div className="h-11 bg-gray-100 rounded w-full"></div>
          <div className="h-11 w-12 bg-gray-200 rounded flex-shrink-0"></div>
        </div>
      </div>

      <div className="w-full flex flex-col md:flex-row gap-8">
        {/* Sidebar Skeleton */}
        <div className="md:w-64 flex-shrink-0 hidden md:block">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="mb-4 border-b border-gray-100 pb-4 last:border-0 last:mb-0 last:pb-0">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex gap-3">
                      <div className="w-4 h-4 bg-gray-100 rounded-sm"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col animate-pulse">
                {/* Image placeholder */}
                <div className="w-full h-48 bg-gray-100 border-b border-gray-100"></div>
                {/* Content placeholder */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2 mt-2"></div>
                  <div className="flex justify-between items-end mt-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
