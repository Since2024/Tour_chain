"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[client error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, #fafbff 0%, #fff8f2 100%)" }}>
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⛰️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-sm mb-6">
          An unexpected error occurred. Try refreshing the page.
          {error.digest && (
            <span className="block mt-1 font-mono text-xs text-gray-400">
              Ref: {error.digest}
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
