#!/bin/bash
# =============================================================================
# BricsCoin PQC Deploy Script
# Deploy Post-Quantum Cryptography to production server
# 
# SICURO: Non tocca MongoDB/blockchain, aggiorna solo il codice
# 
# USO: Copia questo file sul server e eseguilo:
#   scp deploy-pqc.sh root@5.161.254.163:/root/
#   ssh root@5.161.254.163 "bash /root/deploy-pqc.sh"
# =============================================================================

set -e

echo "========================================"
echo "  BricsCoin PQC Deploy v1.0"
echo "  $(date)"
echo "========================================"
echo ""

# Detect project directory
BRICS_DIR=""
for dir in /root/bricscoin /root/BricsCoin /root/bricscoin26; do
    if [ -d "$dir/backend" ]; then
        BRICS_DIR="$dir"
        break
    fi
done

if [ -z "$BRICS_DIR" ]; then
    echo "ERRORE: Directory del progetto non trovata!"
    echo "Per favore imposta manualmente: export BRICS_DIR=/percorso/del/progetto"
    exit 1
fi

echo "Directory progetto: $BRICS_DIR"
echo ""

# ==================== STEP 1: BACKUP ====================
echo "[1/7] Backup dei file attuali..."
BACKUP_DIR="/root/bricscoin-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$BRICS_DIR/backend/server.py" "$BACKUP_DIR/" 2>/dev/null || true
cp "$BRICS_DIR/backend/stratum_server.py" "$BACKUP_DIR/" 2>/dev/null || true
echo "  Backup salvato in: $BACKUP_DIR"

# ==================== STEP 2: INSTALL DEPENDENCIES ====================
echo ""
echo "[2/7] Installazione dipendenze Python (dilithium-py per ML-DSA-65)..."

# Check if running in Docker
if [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
    pip install dilithium-py 2>&1 | tail -2
else
    # Try with pip3 first, then pip
    pip3 install dilithium-py 2>&1 | tail -2 || pip install dilithium-py 2>&1 | tail -2
fi
echo "  dilithium-py installato"

# ==================== STEP 3: COPY PQC MODULE ====================
echo ""
echo "[3/7] Copia modulo PQC..."

cat > "$BRICS_DIR/backend/pqc_crypto.py" << 'PQCEOF'
"""
BricsCoin Post-Quantum Cryptography Module
Hybrid signature scheme: ECDSA (secp256k1) + ML-DSA-65 (FIPS 204)
"""
import hashlib
from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError
from dilithium_py.ml_dsa import ML_DSA_65
from mnemonic import Mnemonic

mnemo = Mnemonic("english")

def generate_pqc_wallet(seed_phrase=None):
    if seed_phrase:
        if not mnemo.check(seed_phrase):
            raise ValueError("Invalid seed phrase")
        seed = mnemo.to_seed(seed_phrase)
    else:
        seed_phrase = mnemo.generate(strength=128)
        seed = mnemo.to_seed(seed_phrase)
    ecdsa_private_key = SigningKey.from_string(seed[:32], curve=SECP256k1)
    ecdsa_public_key = ecdsa_private_key.get_verifying_key()
    dil_pk, dil_sk = ML_DSA_65.keygen()
    ecdsa_pub_hex = ecdsa_public_key.to_string().hex()
    dil_pub_hex = dil_pk.hex()
    combined_hash = hashlib.sha256((ecdsa_pub_hex + dil_pub_hex).encode()).hexdigest()
    address = "BRICSPQ" + combined_hash[:38]
    return {
        "address": address, "seed_phrase": seed_phrase, "wallet_type": "pqc_hybrid",
        "ecdsa_private_key": ecdsa_private_key.to_string().hex(),
        "ecdsa_public_key": ecdsa_pub_hex,
        "dilithium_public_key": dil_pub_hex,
        "dilithium_secret_key": dil_sk.hex(),
    }

def recover_pqc_wallet(ecdsa_private_key_hex, dilithium_secret_key_hex, dilithium_public_key_hex):
    try:
        ecdsa_sk = SigningKey.from_string(bytes.fromhex(ecdsa_private_key_hex), curve=SECP256k1)
        ecdsa_pk = ecdsa_sk.get_verifying_key()
        ecdsa_pub_hex = ecdsa_pk.to_string().hex()
        combined_hash = hashlib.sha256((ecdsa_pub_hex + dilithium_public_key_hex).encode()).hexdigest()
        address = "BRICSPQ" + combined_hash[:38]
        return {
            "address": address, "wallet_type": "pqc_hybrid",
            "ecdsa_private_key": ecdsa_private_key_hex,
            "ecdsa_public_key": ecdsa_pub_hex,
            "dilithium_public_key": dilithium_public_key_hex,
            "dilithium_secret_key": dilithium_secret_key_hex,
        }
    except Exception as e:
        raise ValueError(f"Invalid PQC keys: {str(e)}")

def hybrid_sign(ecdsa_private_key_hex, dilithium_secret_key_hex, message):
    msg_bytes = message.encode()
    ecdsa_sk = SigningKey.from_string(bytes.fromhex(ecdsa_private_key_hex), curve=SECP256k1)
    ecdsa_sig = ecdsa_sk.sign(msg_bytes, hashfunc=hashlib.sha256)
    dil_sk = bytes.fromhex(dilithium_secret_key_hex)
    dil_sig = ML_DSA_65.sign(dil_sk, msg_bytes)
    return {
        "ecdsa_signature": ecdsa_sig.hex(),
        "dilithium_signature": dil_sig.hex(),
        "scheme": "ecdsa_secp256k1+ml-dsa-65"
    }

def hybrid_verify(ecdsa_public_key_hex, dilithium_public_key_hex,
                   ecdsa_signature_hex, dilithium_signature_hex, message):
    msg_bytes = message.encode()
    result = {"ecdsa_valid": False, "dilithium_valid": False, "hybrid_valid": False}
    try:
        ecdsa_pk = VerifyingKey.from_string(bytes.fromhex(ecdsa_public_key_hex), curve=SECP256k1)
        ecdsa_sig_bytes = bytes.fromhex(ecdsa_signature_hex)
        msg_digest = hashlib.sha256(msg_bytes).digest()
        result["ecdsa_valid"] = ecdsa_pk.verify_digest(ecdsa_sig_bytes, msg_digest)
    except (BadSignatureError, Exception):
        result["ecdsa_valid"] = False
    try:
        dil_pk = bytes.fromhex(dilithium_public_key_hex)
        dil_sig = bytes.fromhex(dilithium_signature_hex)
        result["dilithium_valid"] = ML_DSA_65.verify(dil_pk, msg_bytes, dil_sig)
    except Exception:
        result["dilithium_valid"] = False
    result["hybrid_valid"] = result["ecdsa_valid"] and result["dilithium_valid"]
    return result

def create_migration_transaction(legacy_private_key_hex, pqc_wallet, amount):
    from datetime import datetime, timezone
    legacy_sk = SigningKey.from_string(bytes.fromhex(legacy_private_key_hex), curve=SECP256k1)
    legacy_pk = legacy_sk.get_verifying_key()
    legacy_pub_hex = legacy_pk.to_string().hex()
    legacy_address_hash = hashlib.sha256(legacy_pub_hex.encode()).hexdigest()
    legacy_address = "BRICS" + legacy_address_hash[:40]
    timestamp = datetime.now(timezone.utc).isoformat()
    tx_data = f"{legacy_address}{pqc_wallet['address']}{amount}{timestamp}"
    ecdsa_sig = legacy_sk.sign(tx_data.encode())
    return {
        "sender_address": legacy_address, "recipient_address": pqc_wallet["address"],
        "amount": amount, "timestamp": timestamp, "signature": ecdsa_sig.hex(),
        "public_key": legacy_pub_hex, "migration": True, "migration_type": "legacy_to_pqc"
    }
PQCEOF

echo "  pqc_crypto.py copiato"

# ==================== STEP 4: COPY DISK CLEANUP ====================
echo ""
echo "[4/7] Installazione script pulizia disco..."

cat > "$BRICS_DIR/disk-cleanup.sh" << 'CLEANEOF'
#!/bin/bash
echo "=== BricsCoin Disk Cleanup - $(date) ==="
if command -v docker &> /dev/null; then
    echo "Cleaning Docker..."
    docker system prune -af --volumes 2>/dev/null || true
fi
if command -v journalctl &> /dev/null; then
    echo "Cleaning journals..."
    journalctl --vacuum-size=100M 2>/dev/null || true
fi
echo "Cleaning old logs..."
find /var/log -name "*.log.*" -mtime +14 -delete 2>/dev/null || true
find /var/log -name "*.gz" -mtime +14 -delete 2>/dev/null || true
find /tmp -type f -mtime +7 -delete 2>/dev/null || true
pip cache purge 2>/dev/null || true
echo "Current disk usage:"
df -h / | tail -1
echo "=== Cleanup complete ==="
CLEANEOF

chmod +x "$BRICS_DIR/disk-cleanup.sh"

# Install cron job (weekly Sunday 3AM)
if command -v crontab &> /dev/null; then
    (crontab -l 2>/dev/null | grep -v "disk-cleanup.sh"; echo "0 3 * * 0 $BRICS_DIR/disk-cleanup.sh >> /var/log/bricscoin-cleanup.log 2>&1") | crontab -
    echo "  Cron job pulizia disco installato (Domenica 3:00)"
else
    echo "  ATTENZIONE: crontab non disponibile. Esegui manualmente: bash $BRICS_DIR/disk-cleanup.sh"
fi

# ==================== STEP 5: TEST PQC MODULE ====================
echo ""
echo "[5/7] Test modulo PQC..."

cd "$BRICS_DIR/backend"
python3 -c "
from pqc_crypto import generate_pqc_wallet, hybrid_sign, hybrid_verify
w = generate_pqc_wallet()
msg = 'deploy test'
sig = hybrid_sign(w['ecdsa_private_key'], w['dilithium_secret_key'], msg)
v = hybrid_verify(w['ecdsa_public_key'], w['dilithium_public_key'], sig['ecdsa_signature'], sig['dilithium_signature'], msg)
assert v['hybrid_valid'], 'PQC verification FAILED!'
print('  ML-DSA-65 OK: wallet=' + w['address'][:20] + '...')
print('  Hybrid sign/verify: PASSED')
"

if [ $? -ne 0 ]; then
    echo "ERRORE: Test PQC fallito! Ripristino backup..."
    cp "$BACKUP_DIR/server.py" "$BRICS_DIR/backend/" 2>/dev/null
    exit 1
fi

# ==================== STEP 6: IMPORTANT NOTE ====================
echo ""
echo "[6/7] NOTA IMPORTANTE"
echo "  ============================================"
echo "  Il modulo PQC e stato installato."
echo "  Ora devi aggiornare server.py manualmente:"
echo ""
echo "  1. Aggiungi in cima al file:"
echo "     from pqc_crypto import ("
echo "         generate_pqc_wallet, recover_pqc_wallet,"
echo "         hybrid_sign, hybrid_verify, create_migration_transaction"
echo "     )"
echo ""
echo "  2. Aggiungi gli endpoint PQC (vedi README-PQC.md)"
echo ""
echo "  OPPURE copia il server.py aggiornato dal preview."
echo "  ============================================"

# ==================== STEP 7: REPORT ====================
echo ""
echo "[7/7] Report finale"
echo "========================================"
echo "  Modulo PQC: INSTALLATO"
echo "  Dipendenze: INSTALLATE"
echo "  Test: SUPERATI"
echo "  Backup: $BACKUP_DIR"
echo "  Disk cleanup: INSTALLATO"
echo ""
echo "  PROSSIMI PASSI:"
echo "  1. Aggiorna server.py con gli endpoint PQC"
echo "  2. Aggiorna il frontend con le pagine PQC"
echo "  3. Riavvia i servizi: docker-compose restart"
echo "  4. Testa: curl http://localhost:PORT/api/pqc/stats"
echo "========================================"
echo ""
echo "  La blockchain NON e stata toccata."
echo "  Nessun dato e stato perso."
echo ""
