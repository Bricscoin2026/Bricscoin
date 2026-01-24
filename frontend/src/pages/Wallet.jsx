import { useState, useEffect } from "react";
import { 
  Wallet as WalletIcon, 
  Plus, 
  Copy, 
  Check, 
  Send, 
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  Upload,
  Key,
  FileText,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  createWallet, 
  getWalletBalance, 
  importWalletSeed,
  importWalletKey,
  createTransaction,
  getAddressTransactions 
} from "../lib/api";
import { QRCodeSVG } from "qrcode.react";

function WalletCard({ wallet, onRefresh, onSelect, isSelected, onShowSeed }) {
  const [balance, setBalance] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await getWalletBalance(wallet.address);
        setBalance(res.data.balance);
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    }
    fetchBalance();
  }, [wallet.address, onRefresh]);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copiato`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`wallet-gradient rounded-sm p-6 cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => onSelect(wallet)}
      data-testid={`wallet-card-${wallet.address.slice(0, 10)}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">{wallet.name}</p>
          <p className="text-2xl font-heading font-bold gold-text mt-1">
            {balance !== null ? `${balance.toLocaleString()} BRICS` : "Loading..."}
          </p>
        </div>
        <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center">
          <WalletIcon className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Indirizzo</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs truncate flex-1">{wallet.address}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(wallet.address, "Indirizzo");
              }}
              data-testid="copy-address-btn"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {wallet.seed_phrase && (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onShowSeed(wallet);
            }}
            data-testid="show-seed-btn"
          >
            <Key className="w-3 h-3 mr-2" />
            Mostra Seed Phrase
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function SendDialog({ wallet, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!recipient || !amount) {
      toast.error("Compila tutti i campi");
      return;
    }

    setSending(true);
    try {
      await createTransaction({
        sender_private_key: wallet.private_key,
        sender_address: wallet.address,
        recipient_address: recipient,
        amount: parseFloat(amount),
      });
      toast.success("Transazione inviata!");
      setOpen(false);
      setRecipient("");
      setAmount("");
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invio fallito");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gold-button rounded-sm" data-testid="send-btn">
          <Send className="w-4 h-4 mr-2" />
          Invia
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10" data-testid="send-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Invia BRICS</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Da</Label>
            <Input 
              value={wallet?.address || ""} 
              disabled 
              className="font-mono text-sm bg-background"
            />
          </div>
          <div>
            <Label>Indirizzo Destinatario</Label>
            <Input
              placeholder="BRICS..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono bg-background border-white/20"
              data-testid="recipient-input"
            />
          </div>
          <div>
            <Label>Importo (BRICS)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono bg-background border-white/20"
              data-testid="amount-input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-white/20"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="gold-button rounded-sm"
            data-testid="confirm-send-btn"
          >
            {sending ? "Invio..." : "Invia Transazione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveDialog({ wallet }) {
  const [open, setOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet?.address || "");
    toast.success("Indirizzo copiato!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/20 rounded-sm" data-testid="receive-btn">
          <QrCode className="w-4 h-4 mr-2" />
          Ricevi
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10" data-testid="receive-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Ricevi BRICS</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="qr-container">
            <QRCodeSVG value={wallet?.address || ""} size={200} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scansiona il QR code o copia l'indirizzo
          </p>
          <div className="w-full">
            <div className="flex items-center gap-2 p-3 bg-background rounded-sm border border-white/10">
              <p className="font-mono text-xs flex-1 truncate">{wallet?.address}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                data-testid="copy-receive-address-btn"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SeedPhraseDialog({ wallet, open, onOpenChange }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet?.seed_phrase || "");
    setCopied(true);
    toast.success("Seed phrase copiata!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10" data-testid="seed-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Seed Phrase - TIENILA SEGRETA!
          </DialogTitle>
          <DialogDescription className="text-yellow-500/80">
            Queste 12 parole permettono di recuperare il tuo wallet. Non condividerle MAI con nessuno!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-sm p-4">
            <div className="grid grid-cols-3 gap-2">
              {wallet?.seed_phrase?.split(' ').map((word, i) => (
                <div key={i} className="flex items-center gap-2 bg-background/50 rounded px-2 py-1">
                  <span className="text-xs text-muted-foreground">{i + 1}.</span>
                  <span className="font-mono text-sm">{word}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20"
          >
            Chiudi
          </Button>
          <Button
            onClick={handleCopy}
            className="gold-button rounded-sm"
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            Copia Seed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [importType, setImportType] = useState("seed");
  const [seedPhrase, setSeedPhrase] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [walletName, setWalletName] = useState("");
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      let res;
      if (importType === "seed") {
        if (!seedPhrase.trim()) {
          toast.error("Inserisci la seed phrase");
          return;
        }
        res = await importWalletSeed(seedPhrase.trim(), walletName || "Wallet Importato");
      } else {
        if (!privateKey.trim()) {
          toast.error("Inserisci la chiave privata");
          return;
        }
        res = await importWalletKey(privateKey.trim(), walletName || "Wallet Importato");
      }
      
      toast.success("Wallet importato!");
      setOpen(false);
      setSeedPhrase("");
      setPrivateKey("");
      setWalletName("");
      onSuccess(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Importazione fallita");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/20 rounded-sm" data-testid="import-wallet-btn">
          <Upload className="w-4 h-4 mr-2" />
          Importa Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 max-w-md" data-testid="import-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Importa Wallet</DialogTitle>
          <DialogDescription>
            Recupera un wallet esistente con la seed phrase o la chiave privata
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={importType} onValueChange={setImportType} className="py-4">
          <TabsList className="grid w-full grid-cols-2 bg-background">
            <TabsTrigger value="seed" className="data-[state=active]:bg-primary/20">
              <FileText className="w-4 h-4 mr-2" />
              Seed Phrase
            </TabsTrigger>
            <TabsTrigger value="key" className="data-[state=active]:bg-primary/20">
              <Key className="w-4 h-4 mr-2" />
              Chiave Privata
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="seed" className="space-y-4 mt-4">
            <div>
              <Label>Seed Phrase (12 parole)</Label>
              <Textarea
                placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
                value={seedPhrase}
                onChange={(e) => setSeedPhrase(e.target.value)}
                className="font-mono bg-background border-white/20 min-h-[80px]"
                data-testid="seed-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Inserisci le 12 parole separate da spazi
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="key" className="space-y-4 mt-4">
            <div>
              <Label>Chiave Privata</Label>
              <Input
                type="password"
                placeholder="Inserisci la chiave privata esadecimale"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="font-mono bg-background border-white/20"
                data-testid="private-key-input"
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <div>
          <Label>Nome Wallet (opzionale)</Label>
          <Input
            placeholder="Wallet Importato"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            className="bg-background border-white/20"
          />
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-white/20"
          >
            Annulla
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing}
            className="gold-button rounded-sm"
            data-testid="confirm-import-btn"
          >
            {importing ? "Importazione..." : "Importa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Wallet() {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [walletName, setWalletName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [seedWallet, setSeedWallet] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load wallets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bricscoin_wallets");
    if (saved) {
      const parsed = JSON.parse(saved);
      setWallets(parsed);
      if (parsed.length > 0) {
        setSelectedWallet(parsed[0]);
      }
    }
  }, []);

  // Fetch transactions when wallet selected
  useEffect(() => {
    async function fetchTransactions() {
      if (!selectedWallet) return;
      try {
        const res = await getAddressTransactions(selectedWallet.address);
        setTransactions(res.data.transactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    }
    fetchTransactions();
  }, [selectedWallet, refreshKey]);

  const saveWallets = (newWallets) => {
    setWallets(newWallets);
    localStorage.setItem("bricscoin_wallets", JSON.stringify(newWallets));
  };

  const handleCreateWallet = async () => {
    setCreating(true);
    try {
      const res = await createWallet(walletName || "My Wallet");
      const newWallet = res.data;
      const updated = [...wallets, newWallet];
      saveWallets(updated);
      setSelectedWallet(newWallet);
      setCreateDialogOpen(false);
      setWalletName("");
      
      // Show seed phrase immediately
      setSeedWallet(newWallet);
      setSeedDialogOpen(true);
      
      toast.success("Wallet creato! Salva la seed phrase!");
    } catch (error) {
      toast.error("Creazione wallet fallita");
    } finally {
      setCreating(false);
    }
  };

  const handleImportSuccess = (newWallet) => {
    const updated = [...wallets, newWallet];
    saveWallets(updated);
    setSelectedWallet(newWallet);
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleShowSeed = (wallet) => {
    setSeedWallet(wallet);
    setSeedDialogOpen(true);
  };

  const exportWallet = () => {
    if (!selectedWallet) return;
    const data = JSON.stringify(selectedWallet, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bricscoin-wallet-${selectedWallet.address.slice(0, 10)}.json`;
    a.click();
    toast.success("Wallet esportato!");
  };

  return (
    <div className="space-y-6" data-testid="wallet-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Wallet</h1>
          <p className="text-muted-foreground">Gestisci i tuoi wallet BRICS</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-white/20"
            onClick={handleRefresh}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
          <ImportDialog onSuccess={handleImportSuccess} />
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gold-button rounded-sm" data-testid="create-wallet-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Wallet
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10" data-testid="create-wallet-dialog">
              <DialogHeader>
                <DialogTitle className="font-heading">Crea Nuovo Wallet</DialogTitle>
                <DialogDescription>
                  Verrà generata una seed phrase di 12 parole per il backup
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label>Nome Wallet (opzionale)</Label>
                <Input
                  placeholder="My Wallet"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  className="bg-background border-white/20"
                  data-testid="wallet-name-input"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateWallet}
                  disabled={creating}
                  className="gold-button rounded-sm"
                  data-testid="confirm-create-wallet-btn"
                >
                  {creating ? "Creazione..." : "Crea Wallet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seed Phrase Dialog */}
      <SeedPhraseDialog 
        wallet={seedWallet} 
        open={seedDialogOpen} 
        onOpenChange={setSeedDialogOpen} 
      />

      {wallets.length === 0 ? (
        <Card className="bg-card border-white/10 text-center py-12" data-testid="no-wallets">
          <CardContent>
            <WalletIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-heading font-bold mb-2">Nessun Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Crea un nuovo wallet o importane uno esistente
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button 
                className="gold-button rounded-sm"
                onClick={() => setCreateDialogOpen(true)}
                data-testid="create-first-wallet-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crea Wallet
              </Button>
              <ImportDialog onSuccess={handleImportSuccess} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallets List */}
          <div className="space-y-4">
            <h2 className="font-heading font-bold">I Tuoi Wallet</h2>
            {wallets.map((wallet) => (
              <WalletCard
                key={wallet.address}
                wallet={wallet}
                onRefresh={refreshKey}
                onSelect={setSelectedWallet}
                isSelected={selectedWallet?.address === wallet.address}
                onShowSeed={handleShowSeed}
              />
            ))}
          </div>

          {/* Selected Wallet Details */}
          {selectedWallet && (
            <div className="lg:col-span-2 space-y-6">
              {/* Actions */}
              <Card className="bg-card border-white/10" data-testid="wallet-actions-card">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-3">
                    <SendDialog wallet={selectedWallet} onSuccess={handleRefresh} />
                    <ReceiveDialog wallet={selectedWallet} />
                    <Button
                      variant="outline"
                      className="border-white/20 rounded-sm"
                      onClick={exportWallet}
                      data-testid="export-wallet-btn"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Esporta
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card className="bg-card border-white/10" data-testid="transaction-history-card">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="font-heading">Cronologia Transazioni</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Nessuna transazione
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {transactions.map((tx) => {
                        const isSent = tx.sender === selectedWallet.address;
                        return (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-4 table-row-hover"
                            data-testid={`tx-history-${tx.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${
                                isSent ? "bg-red-500/20" : "bg-green-500/20"
                              }`}>
                                {isSent ? (
                                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                                ) : (
                                  <ArrowDownLeft className="w-5 h-5 text-green-500" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {isSent ? "Inviato" : "Ricevuto"}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {isSent 
                                    ? `A: ${tx.recipient.slice(0, 16)}...`
                                    : `Da: ${tx.sender.slice(0, 16)}...`
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-mono ${isSent ? "text-red-500" : "text-green-500"}`}>
                                {isSent ? "-" : "+"}{tx.amount} BRICS
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tx.confirmed ? "Confermato" : "In attesa"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
