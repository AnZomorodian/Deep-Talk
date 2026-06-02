/**
 * Web Crypto API Helpers for End-to-End Encryption (E2EE) in Secure Telegram
 */

// Helper to convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Text encoder/decoder
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Safe helper to get the Web Crypto API subtle interface.
 * Throws a descriptive error if not available (e.g., non-secure context).
 */
function getSubtle(): SubtleCrypto {
  const crypto = window.crypto || (window as any).msCrypto;
  if (!crypto || !crypto.subtle) {
    throw new Error('Web Crypto API (subtle) is not available. This usually happens in non-secure contexts (not HTTPS or localhost). Please ensure you are using HTTPS.');
  }
  return crypto.subtle;
}

/**
 * Safe helper to get random values.
 */
function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  const crypto = window.crypto || (window as any).msCrypto;
  if (!crypto || !crypto.getRandomValues) {
    throw new Error('Web Crypto API (getRandomValues) is not available.');
  }
  return crypto.getRandomValues(array);
}

// 1. Generate RSA-OAEP Key Pair for E2EE Key Exchange
export async function generateE2EEKeyPair(): Promise<{ publicKey: CryptoKeyPair['publicKey']; privateKey: CryptoKeyPair['privateKey'] }> {
  const keyPair = await getSubtle().generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
  return keyPair;
}

// 2. Export Public Key to Base64 (SubjectPublicKeyInfo format)
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await getSubtle().exportKey('spki', key);
  return arrayBufferToBase64(exported);
}

// 3. Export Private Key to Base64 (PKCS#8 format)
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await getSubtle().exportKey('pkcs8', key);
  return arrayBufferToBase64(exported);
}

// 4. Import Public Key from Base64
export async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64Spki);
  return await getSubtle().importKey(
    'spki',
    buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );
}

// 5. Import Private Key from Base64
export async function importPrivateKey(base64Pkcs8: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64Pkcs8);
  return await getSubtle().importKey(
    'pkcs8',
    buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  );
}

// 6. Encrypt message symmetrically using AES-GCM (returns { encryptedDataHex, ivHex })
// We'll package this into a single composite string for easy transport
export async function encryptSymmetric(plaintext: string, aesKey: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = getRandomValues(new Uint8Array(12));
  const encodedText = encoder.encode(plaintext);
  
  const encryptedBuffer = await getSubtle().encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    encodedText
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// 7. Decrypt message symmetrically using AES-GCM
export async function decryptSymmetric(ciphertextBase64: string, ivBase64: string, aesKey: CryptoKey): Promise<string> {
  const ciphertextBytes = base64ToArrayBuffer(ciphertextBase64);
  const ivBytes = new Uint8Array(base64ToArrayBuffer(ivBase64));

  try {
    const decryptedBuffer = await getSubtle().decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
      },
      aesKey,
      ciphertextBytes
    );
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Failed symmetric decryption:', error);
    return '[Decryption Error: Key mismatch or tampered content]';
  }
}

// 8. Generate Ephemeral AES Key (256-bit)
export async function generateEphemeralAESKey(): Promise<CryptoKey> {
  return await getSubtle().generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// 9. Asymmetrical Wrapping: Encrypt AES Key with Recipient RSA Public Key
export async function wrapAESKey(aesKey: CryptoKey, recipientPublicKey: CryptoKey): Promise<string> {
  // Export AES raw bytes
  const rawAESKey = await getSubtle().exportKey('raw', aesKey);
  // Encrypt raw bytes with RSA
  const encryptedAESBytes = await getSubtle().encrypt(
    {
      name: 'RSA-OAEP',
    },
    recipientPublicKey,
    rawAESKey
  );
  return arrayBufferToBase64(encryptedAESBytes);
}

// 10. Asymmetrical Unwrapping: Decrypt AES Key with Sender RSA Private Key
export async function unwrapAESKey(wrappedAESKeyBase64: string, myPrivateKey: CryptoKey): Promise<CryptoKey> {
  const wrappedBytes = base64ToArrayBuffer(wrappedAESKeyBase64);
  // Decrypt raw bytes with RSA
  const rawAESBytes = await getSubtle().decrypt(
    {
      name: 'RSA-OAEP',
    },
    myPrivateKey,
    wrappedBytes
  );
  
  // Import raw AES Key
  return await getSubtle().importKey(
    'raw',
    rawAESBytes,
    {
      name: 'AES-GCM',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// 11. Multi-Device Secure Private Key Backup (PBKDF2 derivation + AES encryption)
// Encrypts the local private key so the user can back up to server and load on another device
export async function backupPrivateKey(
  privateKeyBase64: string,
  recoveryPassword: string
): Promise<{ encryptedPrivateKey: string; salt: string }> {
  const salt = getRandomValues(new Uint8Array(16));
  const passwordBuffer = encoder.encode(recoveryPassword);

  // Import password as base key data
  const baseKey = await getSubtle().importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive encryption key from password and salt
  const derivedKey = await getSubtle().deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt']
  );

  // Encrypt the private key string
  const privateKeyBytes = encoder.encode(privateKeyBase64);
  const iv = getRandomValues(new Uint8Array(12));
  
  const encrypted = await getSubtle().encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    derivedKey,
    privateKeyBytes
  );

  // Combine iv and encrypted content for compact payload: [iv_B64]:[encrypted_B64]
  const composite = `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(encrypted)}`;
  
  return {
    encryptedPrivateKey: composite,
    salt: arrayBufferToBase64(salt.buffer),
  };
}

// 12. Restore Private Key from Backup
export async function restorePrivateKey(
  compositeBackup: string,
  recoveryPassword: string,
  saltBase64: string
): Promise<string> {
  const parts = compositeBackup.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted backup format');
  }

  const ivBytes = new Uint8Array(base64ToArrayBuffer(parts[0]));
  const encryptedBytes = base64ToArrayBuffer(parts[1]);
  const saltBytes = new Uint8Array(base64ToArrayBuffer(saltBase64));
  const passwordBuffer = encoder.encode(recoveryPassword);

  // Import password
  const baseKey = await getSubtle().importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive decryption key
  const derivedKey = await getSubtle().deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt']
  );

  // Decrypt
  const decryptedBuffer = await getSubtle().decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    derivedKey,
    encryptedBytes
  );

  return decoder.decode(decryptedBuffer);
}

// Full Hybrid Encryption Payload Wrapper
export interface EncryptedPayload {
  wrappedKey: string; // The AES ephemeral key wrapped via recipient public key RSA
  wrappedKeySender?: string; // The AES ephemeral key wrapped via sender public key RSA
  ciphertext: string; // The message text encrypted with AES
  iv: string;         // AES nonce/iv
}

// Helper to encrypt a string fully for a recipient Spki public key string
export async function encryptE2EE(
  plaintext: string, 
  recipientPublicKeySpkiB64: string,
  senderPublicKeySpkiB64?: string
): Promise<string> {
  // 1. Generate Ephemeral AES Symmetric Key
  const aesKey = await generateEphemeralAESKey();
  
  // 2. Encrypt plaintext symmetrically
  const { ciphertext, iv } = await encryptSymmetric(plaintext, aesKey);

  // 3. Import recipient's public key
  const recipientPublicKey = await importPublicKey(recipientPublicKeySpkiB64);

  // 4. Wrap (encrypt) the AES key with recipient RSA public key
  const wrappedKey = await wrapAESKey(aesKey, recipientPublicKey);

  // 5. Wrap (encrypt) the AES key with sender RSA public key if provided
  let wrappedKeySender: string | undefined = undefined;
  if (senderPublicKeySpkiB64) {
    try {
      const senderPublicKey = await importPublicKey(senderPublicKeySpkiB64);
      wrappedKeySender = await wrapAESKey(aesKey, senderPublicKey);
    } catch (e) {
      console.error('Failed to wrap ephemeral key for sender:', e);
    }
  }

  // Return as JSON string for easy server transit
  const payload: EncryptedPayload = {
    wrappedKey,
    wrappedKeySender,
    ciphertext,
    iv,
  };
  return JSON.stringify(payload);
}

// Helper to decrypt an E2EE payload using active Private Key PKCS8 string
export async function decryptE2EE(encryptedJson: string, myPrivateKeyPkcs8B64: string): Promise<string> {
  try {
    const payload: EncryptedPayload = JSON.parse(encryptedJson);
    
    // 1. Import private key
    const myPrivateKey = await importPrivateKey(myPrivateKeyPkcs8B64);

    // 2. Unwrap (decrypt) the AES key (Try wrappedKey first, then fallback to wrappedKeySender if it fails)
    let aesKey;
    try {
      aesKey = await unwrapAESKey(payload.wrappedKey, myPrivateKey);
    } catch (unwrapErr) {
      if (payload.wrappedKeySender) {
        aesKey = await unwrapAESKey(payload.wrappedKeySender, myPrivateKey);
      } else {
        throw unwrapErr;
      }
    }

    // 3. Decrypt plaintext symmetrically
    return await decryptSymmetric(payload.ciphertext, payload.iv, aesKey);
  } catch (error) {
    console.error('E2EE Decryption failed:', error);
    return '[Decryption failure: Invalid JSON payload or unmatched keys]';
  }
}
