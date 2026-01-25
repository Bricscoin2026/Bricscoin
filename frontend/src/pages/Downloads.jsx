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
  
  // BricsCoin Core - Full Node (priorità alta)
  if (lower.includes('core')) {
    return { 
      os: 'BricsCoin Core', 
      icon: HardDrive, 
      color: 'text-primary',
      bgColor: 'bg-primary/20',
      description: 'Full Node Wallet - Supporta tutta la blockchain localmente. Richiede Node.js.',
      priority: 1
    };
  }
  
  // Source code generico
  if (lower.includes('source') && !lower.includes('core')) {
    return { 
      os: 'Codice Sorgente', 
      icon: FileArchive, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/20',
      description: 'Codice sorgente completo del progetto BricsCoin',
      priority: 3
    };
  }
  
  if (lower.includes('linux') || lower.includes('appimage')) {
    return { 
      os: 'Linux', 
      icon: HardDrive, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
      description: 'AppImage - Eseguibile universale per Linux',
      priority: 2
    };
  }
  if (lower.includes('windows') || lower.includes('win')) {
    return { 
      os: 'Windows', 
      icon: Monitor, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
      description: 'Cartella compressa - Estrai ed esegui',
      priority: 2
    };
  }
  if (lower.includes('mac') || lower.includes('darwin')) {
    return { 
      os: 'macOS', 
      icon: Apple, 
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      description: 'Codice sorgente - Build manuale richiesta',
      priority: 2
    };
  }
  if (lower.includes('android') || lower.includes('apk')) {
    return { 
      os: 'Android', 
      icon: Smartphone, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      description: 'APK per dispositivi Android',
      priority: 2
    };
  }
  return { 
    os: 'Download', 
    icon: FileArchive, 
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/20',
    description: 'File di download',
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
      toast.error("Errore nel caricamento dei download");
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
    toast.success(`Download avviato: ${file.name}`);
  };

  return (
    <div className="space-y-6" data-testid="downloads-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Download Wallet</h1>
          <p className="text-muted-foreground">
            Scarica il wallet BricsCoin per il tuo dispositivo
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
          Aggiorna
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
                Puoi usare il wallet direttamente dal browser! Su dispositivi mobili, 
                aggiungi questa pagina alla schermata home per un'esperienza simile ad un'app nativa.
              </p>
            </div>
            <Button 
              className="gold-button rounded-sm shrink-0"
              onClick={() => window.location.href = '/wallet'}
              data-testid="open-web-wallet-btn"
            >
              Apri Web Wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Wallets */}
      <div>
        <h2 className="font-heading font-bold text-xl mb-4">Wallet Desktop</h2>
        
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
              <h3 className="text-lg font-heading font-bold mb-2">Nessun download disponibile</h3>
              <p className="text-muted-foreground">
                I wallet saranno disponibili presto.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file, index) => {
              const osInfo = getOSInfo(file.name);
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
          <CardTitle className="font-heading">Istruzioni di Installazione</CardTitle>
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
                <li>Scarica il file ZIP</li>
                <li>Estrai la cartella</li>
                <li>Esegui BricsCoin-Wallet.exe</li>
                <li>Windows Defender potrebbe mostrare un avviso - clicca "Ulteriori informazioni" → "Esegui comunque"</li>
              </ol>
            </div>

            {/* Linux */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-5 h-5 text-orange-500" />
                <h4 className="font-bold">Linux</h4>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Scarica il file AppImage</li>
                <li>Rendi eseguibile: <code className="bg-white/10 px-1 rounded">chmod +x BricsCoin*.AppImage</code></li>
                <li>Esegui il file</li>
              </ol>
            </div>

            {/* macOS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Apple className="w-5 h-5 text-gray-400" />
                <h4 className="font-bold">macOS</h4>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Scarica il codice sorgente ZIP</li>
                <li>Estrai e apri il terminale nella cartella</li>
                <li>Esegui: <code className="bg-white/10 px-1 rounded">npm install</code></li>
                <li>Esegui: <code className="bg-white/10 px-1 rounded">npm start</code></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source Code */}
      <Card className="bg-card border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-heading">Codice Sorgente</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground mb-4">
            BricsCoin è open source! Puoi visualizzare, modificare e contribuire al codice.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-white/20"
              onClick={() => window.open('https://github.com/Bricscoin2026/Bricscoin', '_blank')}
              data-testid="github-link-btn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Visualizza su GitHub
            </Button>
            <Button
              variant="outline"
              className="border-white/20"
              onClick={() => window.open(`${BACKEND_URL}/api/docs/info`, '_blank')}
              data-testid="docs-link-btn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentazione
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
