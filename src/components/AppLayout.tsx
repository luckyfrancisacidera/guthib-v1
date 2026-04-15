import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, Search, Plus, ArrowLeft, X, Menu } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState, useEffect, useRef, useCallback } from "react";
import { OPERATOR_HINTS } from "@/lib/searchParser";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const RECENT_SEARCHES_KEY = "guthib_recent_searches";
const SIDEBAR_STATE_KEY = "guthib_sidebar_open";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter((q) => q !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileQuery, setMobileQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const hideBackRoutes = ["/", "/home", "/dashboard", "/auth", "/explore", "/search", "/boards", "/shop", "/leaderboard"];
  const showBack = !hideBackRoutes.includes(location.pathname);

  const getAutocomplete = useCallback((q: string) => {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) return { operators: [], recent: getRecentSearches() };
    const lastWord = trimmed.split(/\s+/).pop() || "";
    const matchingOps = OPERATOR_HINTS.filter(
      (h) => h.operator.startsWith(lastWord) || h.example.toLowerCase().includes(lastWord)
    ).slice(0, 4);
    return { operators: matchingOps, recent: getRecentSearches().filter((r) => r.toLowerCase().includes(trimmed)).slice(0, 3) };
  }, []);

  const [suggestions, setSuggestions] = useState<ReturnType<typeof getAutocomplete>>({ operators: [], recent: [] });

  useEffect(() => {
    if (searchFocused) setSuggestions(getAutocomplete(searchQuery));
  }, [searchQuery, searchFocused, getAutocomplete]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const submitSearch = (query: string) => {
    const q = query.trim();
    if (!q) return;
    saveRecentSearch(q);
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setSearchFocused(false);
    setMobileSearchOpen(false);
    searchRef.current?.blur();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch(searchQuery);
  };

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch(mobileQuery);
  };

  const insertOperator = (example: string) => {
    setSearchQuery(example + " ");
    searchRef.current?.focus();
  };

  const handleBack = () => {
    if (window.history.length > 2) navigate(-1);
    else navigate("/dashboard");
  };

  const showDropdown = searchFocused && (suggestions.operators.length > 0 || suggestions.recent.length > 0 || !searchQuery.trim());

  const defaultOpen = (() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (stored !== null) return stored === "true";
    } catch {}
    return true;
  })();

  const handleSidebarChange = (open: boolean) => {
    try { localStorage.setItem(SIDEBAR_STATE_KEY, String(open)); } catch {}
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen} onOpenChange={handleSidebarChange}>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top navbar */}
          <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
            <div className="px-4 lg:px-8 flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="mr-1" />
                <Link to="/dashboard" className="flex items-center gap-2">
                  <GraduationCap className="w-7 h-7 text-primary" />
                  <span className="hidden sm:inline font-display text-lg font-bold tracking-tight">GutHib</span>
                </Link>

                {/* Desktop search */}
                <div className="hidden md:block relative" ref={dropdownRef}>
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-secondary/50 text-sm text-muted-foreground w-[280px]">
                    <Search className="w-4 h-4 shrink-0" />
                    <input
                      ref={searchRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      placeholder="Type / to search"
                      className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground text-sm"
                    />
                    {!searchFocused && !searchQuery && (
                      <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded border border-border bg-secondary text-muted-foreground font-mono">/</kbd>
                    )}
                  </form>

                  {showDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-[340px] bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
                      {suggestions.recent.length > 0 && (
                        <div className="p-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 mb-1">Recent</p>
                          {suggestions.recent.map((r) => (
                            <button key={r} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary/50 flex items-center gap-2 transition-colors" onMouseDown={(e) => { e.preventDefault(); setSearchQuery(r); submitSearch(r); }}>
                              <Search className="w-3 h-3 text-muted-foreground" />
                              <span className="truncate">{r}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {suggestions.operators.length > 0 && (
                        <div className="p-2 border-t border-border">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 mb-1">Operators</p>
                          {suggestions.operators.map((op) => (
                            <button key={op.operator} className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary/50 transition-colors" onMouseDown={(e) => { e.preventDefault(); insertOperator(op.example); }}>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-accent">{op.operator}</code>
                                <span className="text-xs text-muted-foreground truncate">{op.description}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {!searchQuery.trim() && suggestions.operators.length === 0 && suggestions.recent.length === 0 && (
                        <div className="p-3">
                          <p className="text-xs text-muted-foreground mb-2">Try searching with operators:</p>
                          <div className="space-y-1">
                            {OPERATOR_HINTS.slice(0, 4).map((h) => (
                              <button key={h.operator} className="w-full text-left px-2 py-1 rounded hover:bg-secondary/50 transition-colors" onMouseDown={(e) => { e.preventDefault(); insertOperator(h.example); }}>
                                <code className="text-xs font-mono text-accent">{h.example}</code>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => { setMobileSearchOpen(true); setMobileQuery(""); }}>
                  <Search className="w-4 h-4" />
                </Button>
                {user ? (
                  <>
                    <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
                      <Link to="/new"><Plus className="w-4 h-4" /></Link>
                    </Button>
                    <NotificationBell />
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-medium">
                            {user.email?.[0].toUpperCase()}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-48 p-2 space-y-1">
                        <Link to={`/${user.user_metadata?.username || 'profile'}`} className="block py-2 px-3 text-sm text-foreground/80 hover:text-foreground hover:bg-accent rounded-md" onClick={() => setPopoverOpen(false)}>Your profile</Link>
                        <Link to="/dashboard" className="block py-2 px-3 text-sm text-foreground/80 hover:text-foreground hover:bg-accent rounded-md" onClick={() => setPopoverOpen(false)}>Dashboard</Link>
                        <Link to="/new" className="block py-2 px-3 text-sm text-foreground/80 hover:text-foreground hover:bg-accent rounded-md" onClick={() => setPopoverOpen(false)}>New repository</Link>
                        <button onClick={() => { signOut(); navigate("/"); setPopoverOpen(false); }} className="block w-full text-left py-2 px-3 text-sm text-destructive hover:bg-accent rounded-md">Sign out</button>
                      </PopoverContent>
                    </Popover>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" asChild><Link to="/auth">Sign in</Link></Button>
                    <Button variant="gh-primary" size="sm" asChild><Link to="/auth">Sign up</Link></Button>
                  </>
                )}
              </div>
            </div>
          </nav>

          {/* Mobile search dialog */}
          <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
            <DialogContent className="sm:max-w-md top-4 translate-y-0 p-0">
              <form onSubmit={handleMobileSubmit} className="flex items-center gap-2 p-3 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input ref={mobileSearchRef} value={mobileQuery} onChange={(e) => setMobileQuery(e.target.value)} placeholder="Search GutHib..." className="bg-transparent outline-none w-full text-foreground text-sm" autoFocus />
                <button type="button" onClick={() => setMobileSearchOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </form>
              <div className="p-3 max-h-[60vh] overflow-y-auto">
                {getRecentSearches().length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Recent searches</p>
                    {getRecentSearches().map((r) => (
                      <button key={r} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary/50 flex items-center gap-2" onClick={() => { setMobileQuery(r); submitSearch(r); }}>
                        <Search className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate">{r}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Search operators</p>
                <div className="space-y-1">
                  {OPERATOR_HINTS.slice(0, 6).map((h) => (
                    <button key={h.operator} className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary/50" onClick={() => { setMobileQuery(h.example + " "); mobileSearchRef.current?.focus(); }}>
                      <code className="text-xs font-mono text-accent">{h.operator}</code>
                      <span className="text-xs text-muted-foreground ml-2">{h.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <main className="flex-1 overflow-x-hidden">
            {showBack && (
              <div className="max-w-[1280px] mx-auto px-4 lg:px-8 pt-4">
                <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
