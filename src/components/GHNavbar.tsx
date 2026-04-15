import { Search, ChevronDown, Menu, GraduationCap } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const GHNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" />
            <span className="font-display text-lg font-bold tracking-tight">GutHib</span>
          </Link>
          <div className="hidden lg:flex items-center gap-1 ml-4">
            <Link to="/explore" className="px-3 py-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors">Explore</Link>
            {user && (
              <Link to="/dashboard" className="px-3 py-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors">Dashboard</Link>
            )}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <>
              <Button variant="gh-primary" size="sm" asChild>
                <Link to="/new">New Repository</Link>
              </Button>
              <Button variant="gh-outline" size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Sign in</Link>
              <Button variant="gh-primary" size="sm" asChild>
                <Link to="/auth">Start Free</Link>
              </Button>
            </>
          )}
        </div>

        <button className="lg:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background p-4 space-y-2">
          <Link to="/explore" className="block py-2 text-sm text-foreground/80" onClick={() => setMobileOpen(false)}>Explore</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="block py-2 text-sm text-foreground/80" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link to="/new" className="block py-2 text-sm text-foreground/80" onClick={() => setMobileOpen(false)}>New Repository</Link>
            </>
          ) : (
            <div className="pt-2 space-y-2">
              <Button variant="gh-outline" className="w-full" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button variant="gh-primary" className="w-full" asChild>
                <Link to="/auth">Start Free</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default GHNavbar;
