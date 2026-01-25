import { useState, useEffect } from "react";
import { 
  Download, 
  Monitor, 
  Apple, 
  Smartphone,
  HardDrive,
  FileArchive,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getOSInfo(filename) {
  const lower = filename.toLowerCase();
  
  // BricsCoin Core - Full Node (high priority)
  if (lower.includes('core')) {
    return { 
      os: 'BricsCoin Core', 
      icon: HardDrive, 
      color: 'text-primary',
      bgColor: 'bg-primary/20',
      description: 'Full Node Desktop Wallet - Professional UI with Matrix theme. Requires Node.js.',
      priority: 1
    };
  }
  
  // Generic source code
  if (lower.includes('source') && !lower.includes('core')) {
    return { 
      os: 'Source Code', 
      icon: FileArchive, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/20',
      description: 'Complete BricsCoin project source code',
      priority: 3
    };
  }
  
  if (lower.includes('linux') || lower.includes('appimage')) {
    return { 
      os: 'Linux', 
      icon: HardDrive, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
      description: 'AppImage - Universal executable for Linux',
      priority: 2
    };
  }
  if (lower.includes('windows') || lower.includes('win')) {
    return { 
      os: 'Windows', 
      icon: Monitor, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
      description: 'Compressed folder - Extract and run',
      priority: 2
    };
  }
  if (lower.includes('mac') || lower.includes('darwin')) {
    return { 
      os: 'macOS', 
      icon: Apple, 
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      description: 'Source code - Manual build required',
      priority: 2
    };
  }
  if (lower.includes('android') || lower.includes('apk')) {
    return { 
      os: 'Android', 
      icon: Smartphone, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      description: 'APK for Android devices',
      priority: 2
    };
  }
  return { 
    os: 'Download', 
    icon: FileArchive, 
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/20',
    description: 'Download file',
    priority: 4
  };
}

export default function Downloads() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDownloads = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/downloads`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Error fetching downloads:", error);
      toast.error("Error loading downloads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
  }, []);

  const handleDownload = (file) => {
    const downloadUrl = `${BACKEND_URL}${file.url}`;
    window.open(downloadUrl, '_blank');
    toast.success(`Download started: ${file.name}`);
  };

  return (
    <div className="space-y-6" data-testid="downloads-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Download Wallet</h1>
          <p className="text-muted-foreground">
            Download the BricsCoin wallet for your device
          </p>
        </div>
        <Button
          variant="outline"
          className="border-white/20"
          onClick={fetchDownloads}
          disabled={loading}
          data-testid="refresh-downloads-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* PWA Info */}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-primary/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-bold text-lg">Web Wallet (PWA)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You can use the wallet directly from your browser! On mobile devices, 
                add this page to your home screen for a native app-like experience.
              </p>
            </div>
            <Button 
              className="gold-button rounded-sm shrink-0"
              onClick={() => window.location.href = '/wallet'}
              data-testid="open-web-wallet-btn"
            >
              Open Web Wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Wallets */}
      <div>
        <h2 className="font-heading font-bold text-xl mb-4">Desktop Wallets</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-white/10 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-white/5 rounded-sm" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : files.length === 0 ? (
          <Card className="bg-card border-white/10 text-center py-12">
            <CardContent>
              <Download className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-heading font-bold mb-2">No downloads available</h3>
              <p className="text-muted-foreground">
                Wallets will be available soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files
              .map(file => ({ ...file, osInfo: getOSInfo(file.name) }))
              .sort((a, b) => (a.osInfo.priority || 99) - (b.osInfo.priority || 99))
              .map((file, index) => {
              const osInfo = file.osInfo;
              const Icon = osInfo.icon;
              
              return (
                <motion.div
                  key={file.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="bg-card border-white/10 hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={() => handleDownload(file)}
                    data-testid={`download-card-${osInfo.os.toLowerCase()}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-sm ${osInfo.bgColor} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-6 h-6 ${osInfo.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-bold truncate">{osInfo.os}</h3>
                          <p className="text-xs text-muted-foreground truncate">{file.name}</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {osInfo.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                        <Button 
                          size="sm" 
                          className="gold-button rounded-sm group-hover:scale-105 transition-transform"
                          data-testid={`download-btn-${osInfo.os.toLowerCase()}`}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructions */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading">Installation Instructions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BricsCoin Core */}
            <div className="md:col-span-2 p-4 bg-primary/10 border border-primary/20 rounded-sm">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-primary">BricsCoin Core v2.0 (Recommended)</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                The official Desktop Wallet with professional Matrix-style UI. Create wallets, send/receive BRICS, view blocks and transactions.
              </p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Download <code className="bg-white/10 px-1 rounded">BricsCoin-Core-v2.0.tar.gz</code></li>
                <li>Extract: <code className="bg-white/10 px-1 rounded">tar -xzf BricsCoin-Core-v2.0.tar.gz</code></li>
                <li>Enter the folder: <code className="bg-white/10 px-1 rounded">cd bricscoin-core</code></li>
                <li>Install dependencies: <code className="bg-white/10 px-1 rounded">npm install</code></li>
                <li>Start: <code className="bg-white/10 px-1 rounded">npm start</code></li>
              </ol>
              <p className="text-xs text-muted-foreground mt-3">
                Requirements: Node.js 18+, npm or yarn
              </p>
            </div>

            {/* Windows */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold">Windows</h4>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Download BricsCoin Core</li>
                <li>Install <a href="https://nodejs.org" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Node.js</a></li>
                <li>Follow the instructions above</li>
              </ol>
            </div>

            {/* macOS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Apple className="w-5 h-5 text-gray-400" />
                <h4 className="font-bold">macOS</h4>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Install Xcode CLI: <code className="bg-white/10 px-1 rounded">xcode-select --install</code></li>
                <li>Install Node.js via <a href="https://brew.sh" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Homebrew</a>: <code className="bg-white/10 px-1 rounded">brew install node</code></li>
                <li>Follow the BricsCoin Core instructions above</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source Code */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading">Source Code</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground mb-4">
            BricsCoin is open source! You can view, modify and contribute to the code.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-white/20"
              onClick={() => window.open('https://github.com/Bricscoin2026/Bricscoin', '_blank')}
              data-testid="github-link-btn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on GitHub
            </Button>
            <Button
              variant="outline"
              className="border-white/20"
              onClick={() => window.open(`${BACKEND_URL}/api/docs/info`, '_blank')}
              data-testid="docs-link-btn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
