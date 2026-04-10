/**
 * pages/NotFoundPage.jsx
 */
import { Link } from "react-router-dom";
import { Home, SearchX } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-6">
          <SearchX size={36} className="text-primary-500" />
        </div>
        <h1 className="font-display text-6xl font-bold gradient-text mb-2">
          404
        </h1>
        <h2 className="font-display text-xl font-semibold text-[--text-primary] mb-2">
          Page Not Found
        </h2>
        <p className="text-[--text-secondary] mb-8 max-w-sm">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary">
          <Home size={16} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
