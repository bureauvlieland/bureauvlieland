import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const SupportCTA = () => {
  return (
    <div className="text-right text-sm text-muted-foreground hidden md:block">
      <p className="mb-1">
        Twijfelt u over de juiste opzet?
        <br />
        Wij denken graag met u mee.
      </p>
      <Link to="/contact">
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
          Neem contact op
        </Button>
      </Link>
    </div>
  );
};
