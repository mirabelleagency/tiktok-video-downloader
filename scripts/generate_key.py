from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import base64
import hashlib

# Generate RSA key pair
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
    backend=default_backend()
)

# Get public key in DER format
public_key = private_key.public_key()
public_der = public_key.public_bytes(
    encoding=serialization.Encoding.DER,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

# Convert to base64 for manifest
manifest_key = base64.b64encode(public_der).decode('ascii')

# Calculate extension ID from public key
sha256 = hashlib.sha256(public_der).digest()[:16]
extension_id = ''.join(chr(ord('a') + (b >> 4)) + chr(ord('a') + (b & 0xf)) for b in sha256)

print('=== STABLE EXTENSION KEY ===')
print()
print(f'Extension ID: {extension_id}')
print()
print('Add this to manifest.json after "manifest_version":')
print(f'"key": "{manifest_key}",')
print()
print('Then update Google Cloud Console OAuth client with this Application ID:')
print(extension_id)
