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
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  createWallet, 
  getWalletBalance, 
  getWalletQR, 
  createTransaction,
  getAddressTransactions 
} from "../lib/api";
import QRCode from "qrcode.react";

function WalletCard({ wallet, onRefresh, onSelect, isSelected }) {
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
    toast.success(`${label} copied`);
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
          <p className="text-xs text-muted-foreground mb-1">Address</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs truncate flex-1">{wallet.address}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(wallet.address, "Address");
              }}
              data-testid="copy-address-btn"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Private Key</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs truncate flex-1">
              {showPrivateKey ? wallet.private_key : "••••••••••••••••••••••••"}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setShowPrivateKey(!showPrivateKey);
              }}
              data-testid="toggle-private-key-btn"
            >
              {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>
        </div>
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
      toast.error("Please fill all fields");
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
      toast.success("Transaction sent successfully!");
      setOpen(false);
      setRecipient("");
      setAmount("");
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send transaction");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gold-button rounded-sm" data-testid="send-btn">
          <Send className="w-4 h-4 mr-2" />
          Send
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10" data-testid="send-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Send BRICS</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>From</Label>
            <Input 
              value={wallet?.address || ""} 
              disabled 
              className="font-mono text-sm bg-background"
            />
          </div>
          <div>
            <Label>Recipient Address</Label>
            <Input
              placeholder="BRICS..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono bg-background border-white/20"
              data-testid="recipient-input"
            />
          </div>
          <div>
            <Label>Amount (BRICS)</Label>
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
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="gold-button rounded-sm"
            data-testid="confirm-send-btn"
          >
            {sending ? "Sending..." : "Send Transaction"}
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
    toast.success("Address copied!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/20 rounded-sm" data-testid="receive-btn">
          <QrCode className="w-4 h-4 mr-2" />
          Receive
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10" data-testid="receive-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Receive BRICS</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="qr-container">
            <QRCode value={wallet?.address || ""} size={200} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code or copy the address below
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

export default function Wallet() {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [walletName, setWalletName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
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

  const handleCreateWallet = async () => {
    setCreating(true);
    try {
      const res = await createWallet(walletName || "My Wallet");
      const newWallet = res.data;
      const updated = [...wallets, newWallet];
      setWallets(updated);
      localStorage.setItem("bricscoin_wallets", JSON.stringify(updated));
      setSelectedWallet(newWallet);
      setCreateDialogOpen(false);
      setWalletName("");
      toast.success("Wallet created successfully!");
    } catch (error) {
      toast.error("Failed to create wallet");
    } finally {
      setCreating(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
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
    toast.success("Wallet exported!");
  };

  return (
    <div className="space-y-6" data-testid="wallet-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Wallet</h1>
          <p className="text-muted-foreground">Manage your BRICS wallets</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/20"
            onClick={handleRefresh}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gold-button rounded-sm" data-testid="create-wallet-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Wallet
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10" data-testid="create-wallet-dialog">
              <DialogHeader>
                <DialogTitle className="font-heading">Create New Wallet</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label>Wallet Name (optional)</Label>
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
                  {creating ? "Creating..." : "Create Wallet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {wallets.length === 0 ? (
        <Card className="bg-card border-white/10 text-center py-12" data-testid="no-wallets">
          <CardContent>
            <WalletIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-heading font-bold mb-2">No Wallets Yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first wallet to start receiving and sending BRICS
            </p>
            <Button 
              className="gold-button rounded-sm"
              onClick={() => setCreateDialogOpen(true)}
              data-testid="create-first-wallet-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Wallet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallets List */}
          <div className="space-y-4">
            <h2 className="font-heading font-bold">Your Wallets</h2>
            {wallets.map((wallet) => (
              <WalletCard
                key={wallet.address}
                wallet={wallet}
                onRefresh={refreshKey}
                onSelect={setSelectedWallet}
                isSelected={selectedWallet?.address === wallet.address}
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
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card className="bg-card border-white/10" data-testid="transaction-history-card">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="font-heading">Transaction History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No transactions yet
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
                                  {isSent ? "Sent" : "Received"}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {isSent 
                                    ? `To: ${tx.recipient.slice(0, 16)}...`
                                    : `From: ${tx.sender.slice(0, 16)}...`
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-mono ${isSent ? "text-red-500" : "text-green-500"}`}>
                                {isSent ? "-" : "+"}{tx.amount} BRICS
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tx.confirmed ? "Confirmed" : "Pending"}
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
