import { Navigate } from "react-router-dom";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Skeleton } from "@/components/ui/skeleton";

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Gate component that checks if a feature is enabled via app_settings.
 * If disabled, redirects to fallback path (default: /binnenkort).
 */
export const FeatureGate = ({ 
  featureKey, 
  children, 
  fallbackPath = "/binnenkort" 
}: FeatureGateProps) => {
  const { settings, isLoading } = useAppSettings();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  const isEnabled = settings[featureKey] === true || settings[featureKey] === "true";

  if (!isEnabled) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
