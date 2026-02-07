'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <h1 className="text-xl font-bold mb-2">Algo salió mal</h1>
      <p className="text-slate-400 mb-6 text-center">{error.message}</p>
      <Link href="/login" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500">
        Ir a Login
      </Link>
    </div>
  );
}
