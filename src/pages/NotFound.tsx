import { useLocation, Navigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";

// Map old URLs to new destinations for SEO-friendly redirects
const getRedirectDestination = (pathname: string): string | null => {
  const path = pathname.toLowerCase().replace(/\/$/, ''); // normalize: lowercase, remove trailing slash
  
  // Contact pages
  if (path === '/contact') return '/contact';
  if (path === '/offerteformulier') return '/contact';
  
  // Voorbeeldprogrammas & diensten
  if (path === '/voorbeeldprogrammas') return '/bouwstenen';
  if (path === '/duurzame-zakenevents') return '/samenwerken';
  if (path === '/activiteiten') return '/bouwstenen';
  if (path === '/catering-op-vlieland') return '/catering';
  if (path === '/culinaire-ontdekkingen') return '/bouwstenen';
  if (path === '/overnachten') return '/bouwstenen';
  
  // Oude programmas URL redirect
  if (path === '/programmas') return '/samenwerken';
  
  // Activiteiten wildcard
  if (path.startsWith('/activiteiten-op-vlieland')) return '/bouwstenen';
  
  // Product pages wildcard
  if (path.startsWith('/product')) return '/bouwstenen';
  
  // Voor wie pages - redirect oude URLs naar nieuwe landingspagina's
  if (path === '/bedrijfsuitje-naar-vlieland-2') return '/bedrijfsuitje-vlieland';
  if (path === '/incentive-op-vlieland-2') return '/incentive-reis-vlieland';
  if (path === '/vergaderen-op-vlieland-2') return '/heisessie-vlieland';
  if (path === '/teambuilding-op-vlieland') return '/teamuitje-vlieland';
  if (path === '/trouwen-op-vlieland-2') return '/trouwen-op-vlieland';
  if (path === '/schoolreis-naar-vlieland') return '/voor-wie';
  
  // Team/Over ons
  if (path === '/team') return '/over-ons';
  
  // Testimonials
  if (path === '/klanten-aan-het-woord') return '/over-ons';
  
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
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Pagina niet gevonden – Bureau Vlieland</title>
      </Helmet>
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
