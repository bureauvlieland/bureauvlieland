import { useLocation, Navigate } from "react-router-dom";
import { useEffect, useMemo } from "react";

// Map old URLs to new destinations for SEO-friendly redirects
const getRedirectDestination = (pathname: string): string | null => {
  const path = pathname.toLowerCase().replace(/\/$/, ''); // normalize: lowercase, remove trailing slash
  
  // Contact pages
  if (path === '/contact') return '/#contact';
  if (path === '/offerteformulier') return '/#contact';
  
  // Voorbeeldprogrammas & diensten
  if (path === '/voorbeeldprogrammas') return '/#wat-wij-doen';
  if (path === '/duurzame-zakenevents') return '/#wat-wij-doen';
  if (path === '/activiteiten') return '/#wat-wij-doen';
  if (path === '/catering-op-vlieland') return '/#wat-wij-doen';
  if (path === '/culinaire-ontdekkingen') return '/#wat-wij-doen';
  if (path === '/overnachten') return '/#wat-wij-doen';
  
  // Activiteiten wildcard
  if (path.startsWith('/activiteiten-op-vlieland')) return '/#wat-wij-doen';
  
  // Product pages wildcard
  if (path.startsWith('/product')) return '/#wat-wij-doen';
  
  // Voor wie pages - redirect oude URLs naar nieuwe landingspagina's
  if (path === '/bedrijfsuitje-naar-vlieland-2') return '/bedrijfsuitje-vlieland';
  if (path === '/incentive-op-vlieland-2') return '/#voor-wie';
  if (path === '/vergaderen-op-vlieland-2') return '/#voor-wie';
  if (path === '/teambuilding-op-vlieland') return '/#voor-wie';
  if (path === '/trouwen-op-vlieland') return '/#voor-wie';
  if (path === '/schoolreis-naar-vlieland') return '/#voor-wie';
  
  // Team/Over ons
  if (path === '/team') return '/#over-erwin';
  
  // Testimonials
  if (path === '/klanten-aan-het-woord') return '/#testimonials';
  
  // Algemene voorwaarden - has its own page
  if (path === '/algemene-voorwaarden') return '/algemene-voorwaarden';
  
  return null;
};

const NotFound = () => {
  const location = useLocation();
  
  const redirectTo = useMemo(() => getRedirectDestination(location.pathname), [location.pathname]);

  useEffect(() => {
    if (!redirectTo) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname, redirectTo]);

  // Perform client-side redirect for old URLs
  if (redirectTo) {
    // For hash routes, we need to navigate and then scroll
    if (redirectTo.includes('#')) {
      window.location.href = redirectTo;
      return null;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Pagina niet gevonden</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Terug naar Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
