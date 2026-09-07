'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold">500 - Errore di sistema</h2>
      <p className="mt-4 text-red-500">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-8 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Riprova
      </button>
    </div>
  );
}
