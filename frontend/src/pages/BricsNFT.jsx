import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Award, ShieldCheck, Copy, Check, RefreshCw, Lock, Search,
  Coins, FileCheck, Send, Users, Eye, CheckCircle, XCircle,
  Fingerprint, ArrowRightLeft, Upload, FileText, Download,
  CircleDot, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  mintNFT, listNFTs, verifyNFT, getNFTStats,
  createPQCWallet
} from "../lib/api";
import { hybridSign } from "../lib/pqc-crypto";
import api from "../lib/api";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const MINT_FEE = 0.000005;

const CERT_TYPES = [
  { value: "diploma", label: "Diploma / Degree" },
  { value: "property", label: "Property Deed" },
  { value: "authenticity", label: "Authenticity" },
  { value: "professional", label: "Professional License" },
  { value: "membership", label: "Membership" },
  { value: "award", label: "Award / Achievement" },
  { value: "license", label: "Software License" },
  { value: "custom", label: "Custom (free text)" },
];

function truncAddr(addr) {
  if (!addr) return "";
  return addr.length > 20 ? `${addr.slice(0, 12)}...${addr.slice(-6)}` : addr;
}

function fmtTime(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function StepGuide() {
  const steps = [
    { n: 1, title: "Connect Wallet", desc: "Connect your PQC wallet or create a new one. You need BRICS balance." },
    { n: 2, title: "Choose Type", desc: "Select the certificate type (Diploma, Property, etc.) or write your own." },
    { n: 3, title: "Upload File", desc: "Optionally upload the original document (PDF, image). Its SHA-256 hash will be recorded on-chain." },
    { n: 4, title: "Fill Details", desc: "Enter title, description, and optionally the recipient's PQC address." },
    { n: 5, title: "Mint", desc: "Click Mint. The certificate is signed with PQC, recorded on-chain, and you get a unique ID." },
    { n: 6, title: "Share & Verify", desc: "Share the certificate ID. Anyone can verify it in the Verify tab." },
  ];
  return (
    <Card className="bg-card border-white/10 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-primary" /> How to Mint a Certificate
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {steps.map(s => (
            <div key={s.n} className="flex flex-col items-center text-center p-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-sm mb-2">{s.n}</div>
              <p className="text-xs font-bold">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">{s.desc}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BricsNFT() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "gallery";
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [myAddress, setMyAddress] = useState("");
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [verifyId, setVerifyId] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [pqcWallets, setPqcWallets] = useState([]);
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  // Mint form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [certType, setCertType] = useState("custom");
  const [customTypeName, setCustomTypeName] = useState("");
  const [recipient, setRecipient] = useState("");

  // File upload
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const loadWallet = useCallback(() => {
    const chatWallet = localStorage.getItem("pqc_wallet");
    if (chatWallet) {
      try {
        const w = JSON.parse(chatWallet);
        if (w.address) { setMyAddress(w.address); setWalletLoaded(true); return w; }
      } catch { /* ignore */ }
    }
    const saved = localStorage.getItem("bricscoin_pqc_wallets");
    if (saved) {
      try {
        const wallets = JSON.parse(saved);
        setPqcWallets(wallets);
        if (wallets.length === 1) {
          localStorage.setItem("pqc_wallet", JSON.stringify(wallets[0]));
          setMyAddress(wallets[0].address);
          setWalletLoaded(true);
          return wallets[0];
        } else if (wallets.length > 1) {
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

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const res = await listNFTs(100, filterType || null);
      setCertificates(res.data.certificates || []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadWallet();
    getNFTStats().then(r => setStats(r.data)).catch(() => {});
    loadCertificates();
  }, [loadWallet]);

  useEffect(() => { loadCertificates(); }, [filterType]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/nft/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFileHash(res.data.file_hash);
      setFileName(res.data.file_name);
      setUploadedFile(file);
      toast.success(`File uploaded! Hash: ${res.data.file_hash.slice(0, 16)}...`);
    } catch (err) {
      toast.error("File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFileHash("");
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleMint = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    if (certType === "custom" && !customTypeName.trim()) {
      toast.error("Enter a custom certificate type name");
      return;
    }

    const wallet = loadWallet();
    if (!wallet) {
      toast.error("PQC Wallet required.");
      return;
    }

    setMinting(true);
    try {
      const certContent = `${title}|${description}|${certType}|${wallet.address}|${recipient}`;
      const contentHash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(certContent)))
      ).map(b => b.toString(16).padStart(2, "0")).join("");

      const sigData = `${wallet.address}${contentHash}`;
      const sig = await hybridSign(wallet, sigData);

      const res = await mintNFT({
        creator_address: wallet.address,
        recipient_address: recipient || null,
        title: title.trim(),
        description: description.trim(),
        certificate_type: certType,
        custom_type: certType === "custom" ? customTypeName.trim() : null,
        file_hash: fileHash || null,
        file_name: fileName || null,
        ecdsa_signature: sig.ecdsa_signature,
        dilithium_signature: sig.dilithium_signature,
        ecdsa_public_key: wallet.ecdsa_public_key,
        dilithium_public_key: wallet.dilithium_public_key,
      });

      toast.success(`Certificate ${res.data.certificate.id} minted on block #${res.data.certificate.block_height}!`);
      setTitle(""); setDescription(""); setRecipient(""); setCustomTypeName("");
      removeFile();
      loadCertificates();
      getNFTStats().then(r => setStats(r.data)).catch(() => {});
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to mint");
    } finally {
      setMinting(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyId.trim()) { toast.error("Enter a certificate ID"); return; }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await verifyNFT(verifyId.trim());
      setVerifyResult(res.data);
    } catch { toast.error("Verification failed"); }
    finally { setVerifying(false); }
  };

  return (
    <div className="space-y-8" data-testid="bricsnft-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Award className="w-8 h-8 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-heading font-bold gold-text">BricsNFT</h1>
        </div>
        <p className="text-muted-foreground">Quantum-Proof On-Chain Certificates — World's First PQC-Signed NFT System</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Certificates</p>
            <p className="text-lg font-bold mt-1">{stats?.total_certificates ?? "..."}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Unique Issuers</p>
            <p className="text-lg font-bold mt-1">{stats?.unique_creators ?? "..."}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Fees Burned</p>
            <p className="text-lg font-bold mt-1">{stats?.total_fees_burned ?? "0"} BRICS</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Signature</p>
            <Badge variant="outline" className="mt-1 border-green-500/50 text-green-400 text-xs">ECDSA + ML-DSA-65</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Fee */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 flex items-center gap-3">
          <Coins className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm"><span className="font-bold text-primary">Mint Fee: {MINT_FEE} BRICS</span> per certificate (burned)</p>
            <p className="text-xs text-muted-foreground">Each certificate is permanently recorded on-chain with PQC signatures. Optionally attach a file — its SHA-256 hash is stored immutably.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-6">
        <TabsList className="bg-card border border-white/10">
          <TabsTrigger value="gallery" data-testid="tab-gallery"><Eye className="w-4 h-4 mr-2" />Gallery</TabsTrigger>
          <TabsTrigger value="mint" data-testid="tab-mint"><FileCheck className="w-4 h-4 mr-2" />Mint</TabsTrigger>
          <TabsTrigger value="verify" data-testid="tab-verify"><Fingerprint className="w-4 h-4 mr-2" />Verify</TabsTrigger>
        </TabsList>

        {/* Gallery */}
        <TabsContent value="gallery" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={filterType === "" ? "default" : "outline"} size="sm" onClick={() => setFilterType("")} data-testid="filter-all">All</Button>
            {CERT_TYPES.map(t => (
              <Button key={t.value} variant={filterType === t.value ? "default" : "outline"} size="sm" onClick={() => setFilterType(t.value)} data-testid={`filter-${t.value}`}>
                {t.label}
              </Button>
            ))}
          </div>
          {loading ? (
            <div className="text-center py-12"><RefreshCw className="w-8 h-8 text-muted-foreground mx-auto animate-spin" /></div>
          ) : certificates.length === 0 ? (
            <Card className="bg-card border-white/10"><CardContent className="p-12 text-center">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No certificates minted yet. Be the first!</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map(cert => (
                <motion.div key={cert.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="bg-card border-white/10 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedCert(cert)} data-testid={`cert-${cert.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="text-xs">{cert.display_type || cert.certificate_type}</Badge>
                        <div className="flex items-center gap-1">
                          {cert.has_file && <FileText className="w-3 h-3 text-blue-400" />}
                          {cert.pqc_verified && <ShieldCheck className="w-4 h-4 text-green-400" />}
                        </div>
                      </div>
                      <h3 className="font-heading font-bold text-sm line-clamp-2">{cert.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{cert.description}</p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-white/5">
                        <span className="font-mono">{truncAddr(cert.creator_address)}</span>
                        <span>Block #{cert.block_height}</span>
                      </div>
                      <p className="text-xs font-mono text-primary">{cert.id}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Mint */}
        <TabsContent value="mint" className="space-y-4">
          <StepGuide />

          {!walletLoaded ? (
            <Card className="bg-card border-primary/30">
              <CardContent className="p-4">
                {showWalletPicker && pqcWallets.length > 0 ? (
                  <div className="space-y-3">
                    <h2 className="text-sm font-heading font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />Select PQC Wallet
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pqcWallets.map((w, i) => (
                        <button key={w.address} onClick={() => selectWallet(w)}
                          className="text-left p-3 rounded border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-colors" data-testid={`pick-wallet-${i}`}>
                          <p className="font-mono text-xs truncate text-primary">{w.address}</p>
                          <p className="text-xs text-muted-foreground mt-1">{w.name || `Wallet ${i + 1}`}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Lock className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="text-sm font-heading font-bold">Step 1: Connect a PQC Wallet</h2>
                      <p className="text-xs text-muted-foreground mt-1">You need a PQC wallet with BRICS balance to mint certificates.</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button className="gold-button" size="sm"
                        onClick={async () => {
                          try {
                            const res = await createPQCWallet("BricsNFT Wallet");
                            const w = res.data;
                            const existing = JSON.parse(localStorage.getItem("bricscoin_pqc_wallets") || "[]");
                            existing.push(w);
                            localStorage.setItem("bricscoin_pqc_wallets", JSON.stringify(existing));
                            localStorage.setItem("pqc_wallet", JSON.stringify(w));
                            setMyAddress(w.address);
                            setWalletLoaded(true);
                            toast.success("Wallet created! Send BRICS to it before minting.");
                          } catch { toast.error("Failed to create wallet"); }
                        }}
                        data-testid="create-wallet-btn">
                        <ShieldCheck className="w-4 h-4 mr-2" />Create Wallet
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.location.href = "/wallet"} data-testid="go-wallet-btn">Use Existing</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary" />Mint New Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-4">
                    {/* Step 2: Type */}
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-black text-xs flex items-center justify-center font-bold">2</span>
                        Certificate Type
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {CERT_TYPES.map(t => (
                          <button key={t.value} onClick={() => setCertType(t.value)}
                            className={`text-left p-2 rounded border text-xs transition-colors ${
                              certType === t.value ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 hover:border-white/20"
                            }`} data-testid={`type-${t.value}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      {certType === "custom" && (
                        <Input value={customTypeName} onChange={e => setCustomTypeName(e.target.value)}
                          placeholder="Enter your custom type name (e.g. Medical Record, Land Registry...)"
                          className="mt-2 text-sm" data-testid="custom-type-input" />
                      )}
                    </div>

                    {/* Step 3: File Upload */}
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-black text-xs flex items-center justify-center font-bold">3</span>
                        Upload Document (optional)
                      </Label>
                      {!uploadedFile ? (
                        <div
                          className="border-2 border-dashed border-white/10 rounded p-6 text-center hover:border-primary/30 transition-colors cursor-pointer"
                          onClick={() => fileRef.current?.click()}
                          data-testid="file-dropzone"
                        >
                          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload (PDF, image, document)</p>
                          <p className="text-xs text-muted-foreground mt-1">Max 10MB. The SHA-256 hash will be stored on-chain.</p>
                          <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload}
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt" data-testid="file-input" />
                        </div>
                      ) : (
                        <div className="border border-green-500/30 bg-green-500/5 rounded p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-green-400" />
                              <div>
                                <p className="text-sm font-medium">{fileName}</p>
                                <p className="text-xs text-muted-foreground font-mono">SHA-256: {fileHash.slice(0, 24)}...</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={removeFile} data-testid="remove-file-btn">
                              <XCircle className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {uploading && <Progress value={50} className="mt-2 h-1" />}
                    </div>

                    {/* Recipient */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Recipient Address (optional)</Label>
                      <Input value={recipient} onChange={e => setRecipient(e.target.value)}
                        placeholder="BRICSPQ... (leave empty = you)" className="font-mono text-xs mt-1" data-testid="nft-recipient" />
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    {/* Step 4: Details */}
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-black text-xs flex items-center justify-center font-bold">4</span>
                        Certificate Details
                      </Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Bachelor's Degree in Computer Science" className="mb-3" data-testid="nft-title" />
                      <textarea value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Detailed description of the certificate, who issued it, what it certifies..."
                        className="w-full min-h-[140px] rounded border border-white/10 bg-background p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="nft-description" />
                    </div>

                    {/* Preview */}
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-3 space-y-1">
                        <p className="text-xs font-bold text-primary">Preview</p>
                        <p className="text-xs"><strong>Type:</strong> {certType === "custom" ? (customTypeName || "Custom") : certType}</p>
                        <p className="text-xs"><strong>Title:</strong> {title || "—"}</p>
                        {fileHash && <p className="text-xs"><strong>File:</strong> {fileName}</p>}
                        <p className="text-xs"><strong>Fee:</strong> {MINT_FEE} BRICS (burned)</p>
                      </CardContent>
                    </Card>

                    {/* Step 5: Mint */}
                    <Button className="gold-button w-full" onClick={handleMint} disabled={minting} data-testid="mint-btn">
                      {minting ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Minting...</>
                      ) : (
                        <><Award className="w-4 h-4 mr-2" />Mint Certificate ({MINT_FEE} BRICS)</>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Signed with ECDSA + ML-DSA-65. Immutable on-chain forever.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Verify */}
        <TabsContent value="verify" className="space-y-4">
          <Card className="bg-card border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-primary" />Verify Certificate Authenticity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter a certificate ID to verify it exists on the BricsCoin blockchain and check its PQC signatures.</p>
              <div className="flex gap-2">
                <Input value={verifyId} onChange={e => setVerifyId(e.target.value)}
                  placeholder="BRICSNFT-XXXXXXXXXXXX" className="font-mono flex-1" data-testid="verify-input"
                  onKeyDown={e => e.key === "Enter" && handleVerify()} />
                <Button className="gold-button" onClick={handleVerify} disabled={verifying} data-testid="verify-btn">
                  {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {verifyResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={`border ${verifyResult.valid ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        {verifyResult.valid ? (
                          <><CheckCircle className="w-6 h-6 text-green-400" /><span className="font-heading font-bold text-green-400">VALID CERTIFICATE</span></>
                        ) : (
                          <><XCircle className="w-6 h-6 text-red-400" /><span className="font-heading font-bold text-red-400">NOT FOUND</span></>
                        )}
                      </div>
                      {verifyResult.valid && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div><p className="text-xs text-muted-foreground">Title</p><p className="font-medium">{verifyResult.title}</p></div>
                          <div><p className="text-xs text-muted-foreground">Type</p><Badge variant="outline">{verifyResult.certificate_type}</Badge></div>
                          <div><p className="text-xs text-muted-foreground">Issuer</p><p className="font-mono text-xs">{truncAddr(verifyResult.creator)}</p></div>
                          <div><p className="text-xs text-muted-foreground">Owner</p><p className="font-mono text-xs">{truncAddr(verifyResult.owner)}</p></div>
                          <div><p className="text-xs text-muted-foreground">Block</p><p>#{verifyResult.block_height}</p></div>
                          <div><p className="text-xs text-muted-foreground">Created</p><p className="text-xs">{fmtTime(verifyResult.created_at)}</p></div>
                          <div className="col-span-full"><p className="text-xs text-muted-foreground">Content Hash (SHA-256)</p><p className="font-mono text-xs break-all">{verifyResult.content_hash}</p></div>
                          <div>
                            <p className="text-xs text-muted-foreground">PQC Verified</p>
                            <Badge variant="outline" className={verifyResult.pqc_verified ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}>
                              {verifyResult.pqc_verified ? "ECDSA + ML-DSA-65" : "Unverified"}
                            </Badge>
                          </div>
                        </div>
                      )}
                      {!verifyResult.valid && <p className="text-sm text-muted-foreground">{verifyResult.reason}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Certificate Detail Dialog */}
      <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />Certificate Details
            </DialogTitle>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedCert.display_type || selectedCert.certificate_type}</Badge>
                {selectedCert.pqc_verified && <Badge variant="outline" className="border-green-500/50 text-green-400">PQC Verified</Badge>}
                {selectedCert.has_file && <Badge variant="outline" className="border-blue-500/50 text-blue-400">Has File</Badge>}
              </div>
              <div><p className="text-xs text-muted-foreground">Title</p><p className="font-heading font-bold">{selectedCert.title}</p></div>
              <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm text-muted-foreground">{selectedCert.description}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Issuer</p><p className="font-mono text-xs break-all">{selectedCert.creator_address}</p></div>
                <div><p className="text-xs text-muted-foreground">Owner</p><p className="font-mono text-xs break-all">{selectedCert.owner_address}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Certificate ID</p><p className="font-mono text-xs text-primary">{selectedCert.id}</p></div>
                <div><p className="text-xs text-muted-foreground">Block</p><p>#{selectedCert.block_height}</p></div>
              </div>
              <div><p className="text-xs text-muted-foreground">Content Hash</p><p className="font-mono text-xs break-all">{selectedCert.content_hash}</p></div>
              {selectedCert.has_file && (
                <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm">{selectedCert.file_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">SHA-256: {selectedCert.file_hash?.slice(0, 24)}...</p>
                    </div>
                  </div>
                  <a href={`${BACKEND_URL}/api/nft/file/${selectedCert.file_hash}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" data-testid="download-file-btn">
                      <Download className="w-4 h-4 mr-1" />Download
                    </Button>
                  </a>
                </div>
              )}
              <div><p className="text-xs text-muted-foreground">Transaction</p><p className="font-mono text-xs break-all">{selectedCert.tx_id}</p></div>
              <div><p className="text-xs text-muted-foreground">Created</p><p className="text-xs">{fmtTime(selectedCert.created_at)}</p></div>
              {selectedCert.transfer_history?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Transfer History</p>
                  {selectedCert.transfer_history.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs mb-1">
                      <Badge variant="outline" className="text-xs">{h.type}</Badge>
                      <span className="font-mono">{truncAddr(h.from)}</span>
                      <ArrowRightLeft className="w-3 h-3" />
                      <span className="font-mono">{truncAddr(h.to)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
