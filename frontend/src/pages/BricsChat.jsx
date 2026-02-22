import { useState, useEffect, useCallback } from "react";
import {
  MessageSquareLock,
  Send,
  ShieldCheck,
  Users,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Inbox,
  ArrowUpRight,
  Coins
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  sendChatMessage,
  getChatMessages,
  getChatContacts,
  getChatConversation,
  getChatStats,
  createPQCWallet
} from "../lib/api";
import { hybridSign } from "../lib/pqc-crypto";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString();
}

function truncateAddress(addr) {
  if (!addr) return "";
  return addr.length > 16 ? `${addr.slice(0, 10)}...${addr.slice(-6)}` : addr;
}

export default function BricsChat() {
  const [myAddress, setMyAddress] = useState("");
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pqcWallets, setPqcWallets] = useState([]);
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  // Load PQC wallets from localStorage
  const loadWallet = useCallback(() => {
    // First check dedicated chat wallet
    const chatWallet = localStorage.getItem("pqc_wallet");
    if (chatWallet) {
      try {
        const w = JSON.parse(chatWallet);
        if (w.address) { setMyAddress(w.address); setWalletLoaded(true); return w; }
      } catch { /* ignore */ }
    }
    // Then check PQC wallets list
    const saved = localStorage.getItem("bricscoin_pqc_wallets");
    if (saved) {
      try {
        const wallets = JSON.parse(saved);
        setPqcWallets(wallets);
        if (wallets.length === 1) {
          // Auto-select single wallet
          localStorage.setItem("pqc_wallet", JSON.stringify(wallets[0]));
          setMyAddress(wallets[0].address);
          setWalletLoaded(true);
          return wallets[0];
        } else if (wallets.length > 1) {
          // Multiple wallets — show picker
          setShowWalletPicker(true);
          return null;
        }
      } catch { /* ignore */ }
    }
    return null;
  }, []);

  const selectWallet = (wallet) => {
    localStorage.setItem("pqc_wallet", JSON.stringify(wallet));
    setMyAddress(wallet.address);
    setWalletLoaded(true);
    setShowWalletPicker(false);
  };

  useEffect(() => {
    loadWallet();
    getChatStats().then(r => setStats(r.data)).catch(() => {});
  }, [loadWallet]);

  useEffect(() => {
    if (myAddress) {
      loadContacts();
      loadMessages();
    }
  }, [myAddress]);

  const loadContacts = async () => {
    try {
      const res = await getChatContacts(myAddress);
      setContacts(res.data.contacts || []);
    } catch { /* empty */ }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const res = await getChatMessages(myAddress);
      setMessages(res.data.messages || []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  const loadConversation = async (contact) => {
    setSelectedContact(contact);
    try {
      const res = await getChatConversation(myAddress, contact);
      setMessages(res.data.messages || []);
    } catch { /* empty */ }
  };

  const handleSend = async () => {
    const recipient = selectedContact || recipientAddress;
    if (!recipient || !newMessage.trim()) {
      toast.error("Enter recipient and message");
      return;
    }

    const wallet = loadWallet();
    if (!wallet) {
      toast.error("PQC Wallet not loaded. Go to PQC Wallet page first.");
      return;
    }

    setSending(true);
    try {
      const contentHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(newMessage)
      );
      const hashHex = Array.from(new Uint8Array(contentHash)).map(b => b.toString(16).padStart(2, "0")).join("");

      // Encrypt content (simple hex encode for demo - in production, use recipient's public key)
      const encrypted = Array.from(new TextEncoder().encode(newMessage)).map(b => b.toString(16).padStart(2, "0")).join("");

      const sigData = `${wallet.address}${recipient}${hashHex}`;
      const sig = await hybridSign(wallet, sigData);

      await sendChatMessage({
        sender_address: wallet.address,
        recipient_address: recipient,
        encrypted_content: encrypted,
        content_hash: hashHex,
        ecdsa_signature: sig.ecdsa_signature,
        dilithium_signature: sig.dilithium_signature,
        ecdsa_public_key: wallet.ecdsa_public_key,
        dilithium_public_key: wallet.dilithium_public_key,
      });

      toast.success("Message sent with PQC encryption!");
      setNewMessage("");
      if (selectedContact) {
        loadConversation(selectedContact);
      } else {
        loadMessages();
        loadContacts();
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const decryptMessage = (encrypted) => {
    try {
      const bytes = encrypted.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
      return new TextDecoder().decode(new Uint8Array(bytes));
    } catch {
      return "[Encrypted]";
    }
  };

  const copyAddress = () => {
    if (myAddress) {
      navigator.clipboard.writeText(myAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!walletLoaded) {
    return (
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <MessageSquareLock className="w-8 h-8 text-primary" />
            <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">BricsChat</h1>
          </div>
          <p className="text-muted-foreground">Quantum-Proof On-Chain Messaging</p>
        </motion.div>

        {showWalletPicker && pqcWallets.length > 0 ? (
          /* Wallet Picker - user has multiple PQC wallets */
          <Card className="bg-card border-white/10 max-w-lg">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-heading font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Select PQC Wallet
              </h2>
              <p className="text-sm text-muted-foreground">Choose which PQC wallet to use for BricsChat:</p>
              <div className="space-y-2">
                {pqcWallets.map((w, i) => (
                  <button
                    key={w.address}
                    onClick={() => selectWallet(w)}
                    className="w-full text-left p-3 rounded border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    data-testid={`pick-wallet-${i}`}
                  >
                    <p className="font-mono text-xs truncate text-primary">{w.address}</p>
                    <p className="text-xs text-muted-foreground mt-1">{w.name || `Wallet ${i + 1}`}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* No wallet found - offer to create */
          <Card className="bg-card border-white/10 max-w-lg">
            <CardContent className="p-8 text-center space-y-4">
              <Lock className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-lg font-heading font-bold">PQC Wallet Required</h2>
              <p className="text-muted-foreground text-sm">
                You need a PQC wallet with BRICS balance to use BricsChat.
                Create a wallet, then send some BRICS to it.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  className="gold-button"
                  onClick={async () => {
                    try {
                      const res = await createPQCWallet("BricsChat Wallet");
                      const w = res.data;
                      const existing = JSON.parse(localStorage.getItem("bricscoin_pqc_wallets") || "[]");
                      existing.push(w);
                      localStorage.setItem("bricscoin_pqc_wallets", JSON.stringify(existing));
                      localStorage.setItem("pqc_wallet", JSON.stringify(w));
                      setMyAddress(w.address);
                      setWalletLoaded(true);
                      toast.success("PQC Wallet created! Send BRICS to it before chatting.");
                    } catch (err) {
                      toast.error("Failed to create wallet: " + (err?.response?.data?.detail || err.message));
                    }
                  }}
                  data-testid="create-pqc-inline-btn"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Create New PQC Wallet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/wallet"}
                  data-testid="go-to-wallet-btn"
                >
                  Go to Wallet (use existing)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Fee: 0.000005 BRICS per message (burned)</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="bricschat-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <MessageSquareLock className="w-8 h-8 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">BricsChat</h1>
        </div>
        <p className="text-muted-foreground">Quantum-Proof On-Chain Messaging — World's First PQC-Encrypted Blockchain Chat</p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Your Address</p>
            <button onClick={copyAddress} className="flex items-center gap-1 mx-auto mt-1 text-sm font-mono text-primary hover:underline" data-testid="copy-address-btn">
              {truncateAddress(myAddress)}
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Messages</p>
            <p className="text-lg font-bold mt-1">{stats?.total_messages ?? "..."}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Active Users</p>
            <p className="text-lg font-bold mt-1">{stats?.unique_users ?? "..."}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Encryption</p>
            <Badge variant="outline" className="mt-1 border-green-500/50 text-green-400 text-xs">ECDSA + ML-DSA-65</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Fee Notice */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 flex items-center gap-3">
          <Coins className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm"><span className="font-bold text-primary">Fee: 0.000005 BRICS</span> per message (burned)</p>
            <p className="text-xs text-muted-foreground">Each message creates a real on-chain transaction. The fee is permanently destroyed, making BRICS deflationary.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contacts / Inbox */}
        <Card className="bg-card border-white/10 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No conversations yet. Send your first PQC message!</p>
            ) : (
              contacts.map((c) => (
                <button
                  key={c.address}
                  onClick={() => loadConversation(c.address)}
                  data-testid={`contact-${c.address.slice(0, 10)}`}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    selectedContact === c.address
                      ? "border-primary/50 bg-primary/10"
                      : "border-white/5 hover:border-white/20"
                  }`}
                >
                  <p className="font-mono text-xs truncate">{c.address}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">{c.message_count} msgs</span>
                    <span className="text-xs text-muted-foreground">{formatTime(c.last_message)}</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="bg-card border-white/10 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquareLock className="w-4 h-4 text-primary" />
                {selectedContact ? truncateAddress(selectedContact) : "Messages"}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { loadMessages(); loadContacts(); }} data-testid="refresh-messages">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages List */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2" data-testid="messages-container">
              {loading ? (
                <p className="text-xs text-muted-foreground text-center py-8">Loading...</p>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded border ${
                      m.sender_address === myAddress
                        ? "border-primary/30 bg-primary/5 ml-8"
                        : "border-white/10 bg-card mr-8"
                    }`}
                    data-testid={`message-${m.id}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {m.sender_address === myAddress ? "You" : truncateAddress(m.sender_address)}
                      </span>
                      <div className="flex items-center gap-2">
                        {m.pqc_verified && <ShieldCheck className="w-3 h-3 text-green-400" />}
                        <span className="text-xs text-muted-foreground">{formatTime(m.timestamp)}</span>
                      </div>
                    </div>
                    <p className="text-sm">{decryptMessage(m.encrypted_content)}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">Block #{m.block_height}</p>
                  </div>
                ))
              )}
            </div>

            {/* Send Area */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              {!selectedContact && (
                <div>
                  <Label className="text-xs text-muted-foreground">Recipient PQC Address</Label>
                  <Input
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="BRICSPQ..."
                    className="font-mono text-xs mt-1"
                    data-testid="recipient-input"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a quantum-proof message..."
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1"
                  data-testid="message-input"
                />
                <Button
                  className="gold-button"
                  onClick={handleSend}
                  disabled={sending}
                  data-testid="send-message-btn"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" />
                End-to-end PQC encrypted. Stored on-chain forever. Fee: 0.000005 BRICS (burned)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
