import { Outlet, NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Wallet, 
  Network,
  Globe,
  Menu,
  X,
  Download,
  Info,
  Code,
  Twitter,
  MessageSquareLock,
  Clock,
  Brain,
  Award,
  ChevronDown,
  Pickaxe,
  Link2,
  Smartphone,
  Coins
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import HashStreamBackground from "./HashStreamBackground";

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [moreOpen]);

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/blockchain", icon: Network, label: "Blockchain" },
    { to: "/wallet", icon: Wallet, label: "Wallet" },
    { to: "/network", icon: Globe, label: "Network" },
    { to: "/p2pool", icon: Network, label: "P2Pool" },
    { to: "/mining", icon: Pickaxe, label: "Mining" },
    { to: "/merge-mining", icon: Link2, label: "Merge Mining" },
  ];

  const moreItems = [
    { to: "/jabos", icon: Coins, label: "Jabos (JBS)" },
    { to: "/mobile-wallet", icon: Smartphone, label: "Mobile Wallet" },
    { to: "/chat", icon: MessageSquareLock, label: "BricsChat" },
    { to: "/timecapsule", icon: Clock, label: "Time Capsule" },
    { to: "/oracle", icon: Brain, label: "AI Oracle" },
    { to: "/nft", icon: Award, label: "BricsNFT" },
    { to: "/downloads", icon: Download, label: "Downloads" },
    { to: "/about", icon: Info, label: "About" },
  ];

  const allItems = [...navItems, ...moreItems];

  return (
    <div className="min-h-screen bg-background relative">
      <HashStreamBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3" data-testid="logo-link">
              <img 
                src="/bricscoin-logo.png" 
                alt="BricsCoin" 
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h1 className="font-heading font-bold text-lg gold-text">BRICSCOIN</h1>
                <p className="text-xs text-muted-foreground -mt-1">SHA256 Blockchain</p>
              </div>
            </NavLink>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
              {/* More dropdown */}
              <div className="relative" ref={moreRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMoreOpen(!moreOpen); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-sm font-medium transition-colors
                    ${moreOpen ? "bg-white/5 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                  data-testid="nav-more-btn"
                >
                  More
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-white/10 rounded-sm shadow-xl z-50 overflow-hidden">
                    {moreItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreOpen(false)}
                        data-testid={`nav-more-${item.label.toLowerCase().replace(' ', '-')}`}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                          }`
                        }
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-button"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/10 bg-card/95 backdrop-blur-xl">
            {allItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-4 text-sm font-medium border-b border-white/5 ${
                    isActive
                      ? "bg-primary/10 text-primary border-l-2 border-l-primary"
                      : "text-muted-foreground"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              BricsCoin &copy; {new Date().getFullYear()} - Decentralized SHA256 Blockchain
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a 
                href="https://codeberg.org/Bricscoin_26/Bricscoin" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Code className="w-4 h-4" />
                Source Code
              </a>
              <span>•</span>
              <a href="/about" className="hover:text-foreground transition-colors">
                About
              </a>
              <span>•</span>
              <a 
                href="/whitepaper"
                className="hover:text-foreground transition-colors"
              >
                Whitepaper
              </a>
              <span>•</span>
              <a 
                href="https://x.com/Bricscoin26" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Twitter className="w-4 h-4" />
                Twitter
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
