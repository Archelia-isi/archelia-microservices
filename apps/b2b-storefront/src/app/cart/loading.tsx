export default function CartLoading() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
      
      <div className="flex flex-col gap-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-12 bg-gray-50 border-b border-gray-200"></div>
          
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-6 flex gap-4 items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                  </div>
                </div>
                <div className="col-span-2 flex justify-center">
                  <div className="h-8 bg-gray-100 rounded w-20"></div>
                </div>
                <div className="col-span-2 flex justify-end">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="col-span-2 flex justify-end">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col items-end">
          <div className="h-4 bg-gray-100 rounded w-48 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="h-12 bg-gray-200 rounded w-full sm:w-64"></div>
        </div>
      </div>
    </div>
  );
}
