import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCartSafe } from "@/contexts/CartContext";

export const GlobalCartDrawer = () => {
  const location = useLocation();
  const cart = useCartSafe();

  const isOnConfiguratorPage = location.pathname === "/programma-samenstellen";
  const isOnPortalPage = location.pathname.startsWith("/partner") || 
                         location.pathname.startsWith("/admin") || 
                         location.pathname.startsWith("/programma/") ||
                         location.pathname.startsWith("/mijn-programma/") ||
                         location.pathname === "/logies-aanvragen" ||
                         location.pathname === "/activiteiten-boeken";

  if (isOnPortalPage || !cart) {
    return null;
  }

  const { cartItems, itemJustAdded } = cart;

  return (
    <Link to="/programma-samenstellen">
      <Button
        size="lg"
        className={`fixed bottom-4 right-4 z-40 shadow-lg gap-2 transition-transform ${isOnConfiguratorPage ? 'lg:hidden' : ''} ${itemJustAdded ? 'animate-cart-pulse' : ''}`}
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="hidden sm:inline">Uw programma</span>
        {cartItems.length > 0 && (
          <span className={`bg-white text-primary text-xs font-bold px-2 py-0.5 rounded-full ${itemJustAdded ? 'animate-badge-pop' : ''}`}>
            {cartItems.length}
          </span>
        )}
      </Button>
    </Link>
  );
};
