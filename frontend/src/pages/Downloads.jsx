import { 
  Download, 
  Monitor, 
  Apple, 
  Smartphone,
  HardDrive,
  ExternalLink,
  Code,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { motion } from "framer-motion";

const CODEBERG_BASE = "https://codeberg.org/Bricscoin_26/Bricscoin/raw/branch/main/downloads/BricsCoin%20Core%203.0.0";
const CODEBERG_FOLDER = "https://codeberg.org/Bricscoin_26/Bricscoin/src/branch/main/downloads/BricsCoin%20Core%203.0.0";

const platforms = [
  {
    name: "Windows",
    icon: Monitor,
    color: "text-blue-500",
    bg: "bg-blue-500/20",
    file: "BricsCoin%20Core%203.0.0.exe",
    label: "BricsCoin Core 3.0.0.exe",
    desc: "Portable .exe - No installation needed",
    size: "~69 MB",
    instructions: [
      "Download the .exe file",
      "Run the file directly (no install)",
      "Launch BricsCoin Core"
    ]
  },
  {
    name: "macOS",
    icon: Apple,
    color: "text-gray-300",
    bg: "bg-gray-500/20",
    file: "BricsCoin%20Core-3.0.0-arm64-mac.zip",
    label: "BricsCoin Core-3.0.0-arm64-mac.zip",
    desc: "Apple Silicon (M1/M2/M3) - Extract and run",
    size: "~87 MB",
    instructions: [
      "Download the .zip file",
      "Extract the archive",
      "Move to Applications folder",
      "Right-click → Open (first time only)"
    ]
  },
  {
    name: "Linux",
    icon: HardDrive,
    color: "text-orange-500",
    bg: "bg-orange-500/20",
    file: "BricsCoin%20Core-3.0.0-arm64.AppImage",
    label: "BricsCoin Core-3.0.0-arm64.AppImage",
    desc: "AppImage - Make executable and run",
    size: "~100 MB",
    instructions: [
      "Download the .AppImage file",
      "chmod +x BricsCoin*.AppImage",
      "./BricsCoin*.AppImage"
    ]
  }
];

export default function Downloads() {
  return (
    <div className="space-y-6" data-testid="downloads-page">
      <div>
        <h1 className="text-3xl font-heading font-bold">Download Wallet</h1>
        <p className="text-muted-foreground">
          BricsCoin Core v3.0 — Quantum-Safe Desktop Wallet
        </p>
      </div>

      {/* PQC Badge */}
      <Card className="bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 border-emerald-500/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-bold text-lg">Quantum-Safe Wallet v3.0</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Hybrid signature scheme: <strong className="text-emerald-400">ECDSA + ML-DSA-65 (FIPS 204)</strong>. 
                Private keys are signed locally and never leave your device. 
                Recovery from seed phrase supported.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0">
              PQC HYBRID
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Web Wallet */}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-primary/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-bold text-lg">Web Wallet (PWA)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Use the wallet directly from your browser. On mobile, 
                add to home screen for a native experience.
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

      {/* Desktop Downloads */}
      <div>
        <h2 className="font-heading font-bold text-xl mb-4">Desktop Wallet — BricsCoin Core v3.0</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1) }}
            >
              <Card className="bg-card border-white/10 h-full flex flex-col">
                <CardContent className="p-6 flex flex-col items-center text-center flex-1">
                  <div className={`w-12 h-12 rounded-sm ${p.bg} flex items-center justify-center mb-4`}>
                    <p.icon className={`w-6 h-6 ${p.color}`} />
                  </div>
                  <h4 className="font-bold mb-1">{p.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{p.desc}</p>
                  <code className="text-xs bg-white/10 px-2 py-1 rounded mb-1">{p.size}</code>
                  <div className="flex-1" />
                  <Button
                    className="gold-button rounded-sm w-full mt-4"
                    onClick={() => window.open(CODEBERG_DOWNLOADS, '_blank')}
                    data-testid={`download-${p.name.toLowerCase()}-btn`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download {p.name}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading">Installation Instructions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {platforms.map(p => (
              <div key={p.name}>
                <div className="flex items-center gap-2 mb-3">
                  <p.icon className={`w-5 h-5 ${p.color}`} />
                  <h4 className="font-bold">{p.name}</h4>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  {p.instructions.map((step, j) => (
                    <li key={j}>
                      {step.startsWith("chmod") || step.startsWith("./") 
                        ? <code className="bg-white/10 px-1 rounded">{step}</code>
                        : step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
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
            BricsCoin is open source. View, modify and contribute to the code.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-white/20"
              onClick={() => window.open('https://codeberg.org/Bricscoin_26/Bricscoin', '_blank')}
              data-testid="codeberg-link-btn"
            >
              <Code className="w-4 h-4 mr-2" />
              View on Codeberg
            </Button>
            <Button
              variant="outline"
              className="border-white/20"
              onClick={() => window.open(CODEBERG_DOWNLOADS, '_blank')}
              data-testid="codeberg-downloads-btn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              All Downloads on Codeberg
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
