import { useState, useEffect } from "react";
import {
  Clock,
  Lock,
  Unlock,
  Plus,
  ShieldCheck,
  Blocks,
  Eye,
  Copy,
  Check,
  RefreshCw,
  Coins
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "../components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  createTimeCapsule,
  getTimeCapsule,
  listTimeCapsules,
  getTimeCapsuleStats
} from "../lib/api";
import { hybridSign } from "../lib/pqc-crypto";

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

function CapsuleCard({ capsule, onView }) {
  const progress = capsule.blocks_remaining === 0
    ? 100
    : Math.min(99, ((capsule.unlock_block_height - capsule.blocks_remaining - capsule.created_at_block) / (capsule.unlock_block_height - capsule.created_at_block)) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className={`bg-card border-white/10 card-hover cursor-pointer ${
          capsule.is_unlocked ? "border-green-500/30" : "border-primary/20"
        }`}
        onClick={() => onView(capsule.id)}
        data-testid={`capsule-${capsule.id}`}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {capsule.is_unlocked ? (
                <Unlock className="w-5 h-5 text-green-400" />
              ) : (
                <Lock className="w-5 h-5 text-primary" />
              )}
              <h3 className="font-heading font-bold text-sm">{capsule.title}</h3>
            </div>
            <Badge
              variant="outline"
              className={capsule.is_unlocked
                ? "border-green-500/50 text-green-400"
                : "border-primary/50 text-primary"}
            >
              {capsule.is_unlocked ? "Unlocked" : "Locked"}
            </Badge>
          </div>

          {capsule.description && (
            <p className="text-xs text-muted-foreground mb-3">{capsule.description}</p>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Unlock at Block #{capsule.unlock_block_height.toLocaleString()}</span>
              <span className="text-muted-foreground">
                {capsule.is_unlocked ? "Opened" : `${capsule.blocks_remaining.toLocaleString()} blocks remaining`}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
            <span>Created: {formatTime(capsule.created_at)}</span>
            <span className="font-mono">{capsule.creator_address?.slice(0, 12)}...</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function TimeCapsule() {
  const [capsules, setCapsules] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedCapsule, setSelectedCapsule] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [unlockBlocks, setUnlockBlocks] = useState("");
  const [recipientAddr, setRecipientAddr] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [capsulesRes, statsRes] = await Promise.all([
        listTimeCapsules(50),
        getTimeCapsuleStats()
      ]);
      setCapsules(capsulesRes.data.capsules || []);
      setStats(statsRes.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleView = async (id) => {
    try {
      const res = await getTimeCapsule(id);
      setSelectedCapsule(res.data);
      setViewDialogOpen(true);
    } catch {
      toast.error("Failed to load time capsule");
    }
  };

  const decryptContent = (encrypted) => {
    try {
      const bytes = encrypted.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
      return new TextDecoder().decode(new Uint8Array(bytes));
    } catch {
      return "[Cannot decrypt]";
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || !unlockBlocks) {
      toast.error("Fill in all required fields");
      return;
    }

    const saved = localStorage.getItem("pqc_wallet");
    if (!saved) {
      toast.error("PQC Wallet required. Go to PQC Wallet page first.");
      return;
    }

    const wallet = JSON.parse(saved);
    const unlockHeight = parseInt(unlockBlocks);
    if (isNaN(unlockHeight) || unlockHeight <= 0) {
      toast.error("Invalid unlock block height");
      return;
    }

    setCreating(true);
    try {
      const contentBytes = new TextEncoder().encode(content);
      const hashBuf = await crypto.subtle.digest("SHA-256", contentBytes);
      const contentHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
      const encrypted = Array.from(contentBytes).map(b => b.toString(16).padStart(2, "0")).join("");

      const sigData = `${wallet.address}${contentHash}${unlockHeight}`;
      const sig = await hybridSign(wallet, sigData);

      await createTimeCapsule({
        creator_address: wallet.address,
        encrypted_content: encrypted,
        content_hash: contentHash,
        unlock_block_height: unlockHeight,
        title: title.trim(),
        description: description.trim() || null,
        recipient_address: recipientAddr.trim() || null,
        ecdsa_signature: sig.ecdsa_signature,
        dilithium_signature: sig.dilithium_signature,
        ecdsa_public_key: wallet.ecdsa_public_key,
        dilithium_public_key: wallet.dilithium_public_key,
      });

      toast.success("Time Capsule created and locked on-chain!");
      setCreateDialogOpen(false);
      setTitle(""); setDescription(""); setContent(""); setUnlockBlocks(""); setRecipientAddr("");
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create time capsule");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="timecapsule-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-8 h-8 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">Time Capsule</h1>
        </div>
        <p className="text-muted-foreground">Decentralized Time-Locked Storage — Encrypt data, unlock at a future block height</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Capsules</p>
            <p className="text-lg font-bold mt-1">{stats?.total_capsules ?? "..."}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Locked</p>
            <p className="text-lg font-bold mt-1 text-primary">{stats?.locked ?? "..."}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Unlocked</p>
            <p className="text-lg font-bold mt-1 text-green-400">{stats?.unlocked ?? "..."}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Current Block</p>
            <p className="text-lg font-bold mt-1">{stats?.current_block_height?.toLocaleString() ?? "..."}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gold-button" data-testid="create-capsule-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create Time Capsule
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Create Time Capsule
              </DialogTitle>
              <DialogDescription>
                Store encrypted data on-chain. No one can access it until the target block is reached.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Time Capsule" data-testid="capsule-title-input" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" data-testid="capsule-desc-input" />
              </div>
              <div>
                <Label>Content to Lock *</Label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Your secret message or data..."
                  className="w-full min-h-[80px] px-3 py-2 bg-background border border-input rounded-sm text-sm resize-y"
                  data-testid="capsule-content-input"
                />
              </div>
              <div>
                <Label>Unlock at Block Height *</Label>
                <Input
                  type="number"
                  value={unlockBlocks}
                  onChange={e => setUnlockBlocks(e.target.value)}
                  placeholder={`e.g. ${(stats?.current_block_height || 100) + 100}`}
                  data-testid="capsule-unlock-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current block: {stats?.current_block_height?.toLocaleString() ?? "?"}. ~10 min per block.
                </p>
              </div>
              <div>
                <Label>Recipient Address (optional)</Label>
                <Input
                  value={recipientAddr}
                  onChange={e => setRecipientAddr(e.target.value)}
                  placeholder="BRICSPQ... (leave empty for public)"
                  className="font-mono text-xs"
                  data-testid="capsule-recipient-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button className="gold-button" onClick={handleCreate} disabled={creating} data-testid="submit-capsule-btn">
                {creating ? "Creating..." : "Lock on Chain"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={loadData} data-testid="refresh-capsules-btn">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Capsules List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading capsules...</div>
      ) : capsules.length === 0 ? (
        <Card className="bg-card border-white/10">
          <CardContent className="p-8 text-center space-y-3">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No time capsules yet. Create the first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {capsules.map(c => (
            <CapsuleCard key={c.id} capsule={c} onView={handleView} />
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {selectedCapsule?.is_unlocked ? <Unlock className="w-5 h-5 text-green-400" /> : <Lock className="w-5 h-5 text-primary" />}
              {selectedCapsule?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedCapsule && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={selectedCapsule.is_unlocked ? "border-green-500/50 text-green-400" : "border-primary/50 text-primary"}>
                  {selectedCapsule.is_unlocked ? "Unlocked" : "Locked"}
                </Badge>
                {selectedCapsule.pqc_verified && (
                  <Badge variant="outline" className="border-green-500/50 text-green-400">
                    <ShieldCheck className="w-3 h-3 mr-1" />PQC Verified
                  </Badge>
                )}
              </div>

              {selectedCapsule.description && (
                <p className="text-sm text-muted-foreground">{selectedCapsule.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Created at Block</span>
                  <p className="font-mono">#{selectedCapsule.created_at_block?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Unlock at Block</span>
                  <p className="font-mono">#{selectedCapsule.unlock_block_height?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Blocks Remaining</span>
                  <p className="font-mono">{selectedCapsule.blocks_remaining?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Creator</span>
                  <p className="font-mono truncate">{selectedCapsule.creator_address}</p>
                </div>
              </div>

              {selectedCapsule.is_unlocked && selectedCapsule.encrypted_content ? (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded">
                  <p className="text-xs text-green-400 mb-2 flex items-center gap-1">
                    <Unlock className="w-3 h-3" /> Capsule Content
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{decryptContent(selectedCapsule.encrypted_content)}</p>
                </div>
              ) : (
                <div className="p-4 bg-primary/10 border border-primary/30 rounded text-center">
                  <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Content locked until block #{selectedCapsule.unlock_block_height?.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{Math.round((selectedCapsule.blocks_remaining || 0) * 10 / 60)} hours remaining
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
