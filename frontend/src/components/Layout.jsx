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
  Server,
  Info,
  Users
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
    { to: "/network", icon: Network, label: "Network" },
    { to: "/mining", icon: Pickaxe, label: "Mining" },
    { to: "/pools", icon: Users, label: "Pools" },
    { to: "/downloads", icon: Download, label: "Downloads" },
    { to: "/about", icon: Info, label: "About" },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <HashStreamBackground />
      
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <NavLink to="/" className="flex items-center gap-3">
              <img src="/bricscoin-logo.png" alt="BricsCoin" className="w-10 h-10 rounded-full object-cover" />
              <div>
                <h1 className="font-heading font-bold text-lg gold-text">BRICSCOIN</h1>
                <p className="text-xs text-muted-foreground -mt-1">SHA256 Blockchain</p>
              </div>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-white/10">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium ${
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Outlet />
      </main>

      <footer className="glass border-t border-white/10 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2026 BricsCoin. Open source cryptocurrency.</p>
            <div className="flex items-center gap-4">
              <a href="https://x.com/Bricscoin26" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://codeberg.org/Bricscoin_26/Bricscoin" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Server className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
