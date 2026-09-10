export default function Loading() {
  return (
    <div className="w-full h-screen flex flex-col justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00C800]"></div>
      <p className="mt-4 text-gray-500 text-sm font-medium animate-pulse">Caricamento in corso...</p>
    </div>
  );
}
