import { Outlet, NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Search, 
  Wallet, 
  Pickaxe, 
  Network,
  Menu,
  X,
  Download,
  Server
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import HashStreamBackground from "./HashStreamBackground";

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/explorer", icon: Search, label: "Explorer" },
    { to: "/wallet", icon: Wallet, label: "Wallet" },
    { to: "/mining", icon: Pickaxe, label: "Mining" },
    { to: "/network", icon: Network, label: "Network" },
    { to: "/downloads", icon: Download, label: "Downloads" },
    { to: "/node", icon: Server, label: "Run Node" },
  ];

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
                    `flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
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
            {navItems.map((item) => (
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
              <a href="https://bricscoin26.org" className="hover:text-foreground transition-colors">
                Website
              </a>
              <span>•</span>
              <a href="/node" className="hover:text-foreground transition-colors">
                Run a Node
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
