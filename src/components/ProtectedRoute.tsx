import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    const partnerPathMatch = location.pathname.match(/^\/partner\/([^/]+)/);
    if (partnerPathMatch?.[1]) {
      return (
        <Navigate
          to={`/partner/${decodeURIComponent(partnerPathMatch[1])}/login`}
          replace
        />
      );
    }

    const partnerEntrySlug = new URLSearchParams(location.search).get(
      "partnerEntry",
    );
    if (partnerEntrySlug) {
      return <Navigate to={`/partner/${partnerEntrySlug}/login`} replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
