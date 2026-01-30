import { 
  Download, 
  Monitor, 
  Apple, 
  Smartphone,
  HardDrive,
  ExternalLink,
  Code
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { motion } from "framer-motion";

export default function Downloads() {
  return (
    <div className="space-y-6" data-testid="downloads-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">Download Wallet</h1>
        <p className="text-muted-foreground">
          Download the BricsCoin wallet for your device
        </p>
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
              onClick={() => window.location.href = "/wallet"}
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
        
        {/* Codeberg Wallet Source Card */}
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Code className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">BricsCoin Core Wallet</h3>
                <p className="text-muted-foreground mb-4">
                  Download the official desktop wallet source from Codeberg.<br />
                  Available for Windows, macOS and Linux.
                </p>
              </div>
              <Button 
  onClick={() => window.open('https://codeberg.org/Bricscoin_26/Bricscoin/src/branch/main/downloads', '_blank')}
  className="gold-button rounded-sm"
  size="lg"
  data-testid="codeberg-wallet-btn"
>
  <Code className="w-5 h-5 mr-2" />
  Download from Codeberg
</Button>
            </div>
          </CardContent>
        </Card>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Windows */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card border-white/10 h-full">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-sm bg-blue-500/20 flex items-center justify-center mb-1">
                  <Monitor className="w-6 h-6 text-blue-500" />
                </div>
                <h4 className="font-bold mb-1">Windows</h4>
                <p className="text-sm text-muted-foreground">
                  Portable .exe - No installation needed
                </p>
                <code className="text-xs bg-white/10 px-2 py-1 rounded">
                  BricsCoin Core 2.2.0.exe
                </code>
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={() =>
                    window.open(
                      "https://codeberg.org/Bricscoin_26/Bricscoin/raw/branch/main/downloads/BricsCoin%20Core%202.2.0.exe",
                      "_blank"
                    )
                  }
                  data-testid="download-windows-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download for Windows
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* macOS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-card border-white/10 h-full">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-sm bg-gray-500/20 flex items-center justify-center mb-1">
                  <Apple className="w-6 h-6 text-gray-300" />
                </div>
                <h4 className="font-bold mb-1">macOS</h4>
                <p className="text-sm text-muted-foreground">
                  Extract and run - May require security approval
                </p>
                <code className="text-xs bg-white/10 px-2 py-1 rounded">
                  BricsCoin-Core-mac.zip
                </code>
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={() =>
                    window.open(
                      "https://codeberg.org/Bricscoin_26/Bricscoin/raw/branch/main/downloads/BricsCoin-Core-mac.zip",
                      "_blank"
                    )
                  }
                  data-testid="download-mac-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download for macOS
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Linux */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-card border-white/10 h-full">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-sm bg-orange-500/20 flex items-center justify-center mb-1">
                  <HardDrive className="w-6 h-6 text-orange-500" />
                </div>
                <h4 className="font-bold mb-1">Linux</h4>
                <p className="text-sm text-muted-foreground">
                  Archive with AppImage - Make executable with chmod +x
                </p>
                <code className="text-xs bg-white/10 px-2 py-1 rounded">
                  BricsCoin-Core-linux.zip
                </code>
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={() =>
                    window.open(
                      "https://codeberg.org/Bricscoin_26/Bricscoin/raw/branch/main/downloads/BricsCoin-Core-linux.zip",
                      "_blank"
                    )
                  }
                  data-testid="download-linux-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download for Linux
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading">Installation Instructions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Windows */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold">Windows</h4>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Download the .exe file</li>
                <li>Run the installer or portable executable</li>
                <li>Launch BricsCoin Core</li>
              </ol>
            </div>

            {/* macOS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Apple className="w-5 h-5 text-gray-400" />
                <h4 className="font-bold">macOS</h4>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Download the .zip file</li>
                <li>Extract the archive</li>
                <li>Move to Applications folder</li>
                <li>Right-click → Open (first time)</li>
              </ol>
            </div>

            {/* Linux */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-5 h-5 text-orange-500" />
                <h4 className="font-bold">Linux</h4>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Download the .zip file</li>
                <li>Extract the AppImage</li>
                <li>
                  <code className="bg-white/10 px-1 rounded">
                    chmod +x BricsCoin*.AppImage
                  </code>
                </li>
                <li>
                  <code className="bg-white/10 px-1 rounded">
                    ./BricsCoin*.AppImage
                  </code>
                </li>
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
              onClick={() =>
                window.open(
                  "https://codeberg.org/Bricscoin_26/Bricscoin",
                  "_blank"
                )
              }
              data-testid="codeberg-link-btn"
            >
              <Code className="w-4 h-4 mr-2" />
              View on Codeberg
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}