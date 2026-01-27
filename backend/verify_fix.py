import sys
sys.path.insert(0, '.')

# Test the exact verification logic
content = open('server.py').read()

old = '''def verify_signature(public_key_hex: str, signature_hex: str, transaction_data: str) -> bool:
    """Verify transaction signature (DER format from frontend)"""
    try:
        from ecdsa.util import sigdecode_der
        public_key = VerifyingKey.from_string(bytes.fromhex(public_key_hex), curve=SECP256k1)
        # Frontend signs sha256(data) as hex string, we verify the same way
        return public_key.verify(bytes.fromhex(signature_hex), transaction_data.encode(), hashfunc=hashlib.sha256, sigdecode=sigdecode_der)
    except BadSignatureError:
        return False'''

new = '''def verify_signature(public_key_hex: str, signature_hex: str, transaction_data: str) -> bool:
    """Verify transaction signature (DER format from frontend js-sha256)"""
    try:
        from ecdsa.util import sigdecode_der
        public_key = VerifyingKey.from_string(bytes.fromhex(public_key_hex), curve=SECP256k1)
        # Frontend: sha256(data) returns hex string, then signs that hex string
        msg_hash_hex = hashlib.sha256(transaction_data.encode()).hexdigest()
        return public_key.verify(bytes.fromhex(signature_hex), msg_hash_hex.encode(), sigdecode=sigdecode_der)
    except:
        return False'''

content = content.replace(old, new)
open('server.py', 'w').write(content)
print("Done")
