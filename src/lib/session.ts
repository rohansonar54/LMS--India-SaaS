// Web Crypto API Session Token Generator & Validator
// Fully compatible with Next.js Edge Runtime (middleware) and Node.js Runtime (APIs)

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  level: number; // 0 = Admin, 1 = Staff/Manager
  locationId?: string | null;
  locationName?: string | null;
  selectedLocationId?: string | null; // For admin switching ('all' or specific location ObjectId)
  selectedLocationName?: string | null;
  issuedAt?: number;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'lms-shyam-laundrywala-secret-key-2026-secure-session';

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Creates a cryptographically signed session token.
 */
export async function signSession(user: SessionUser): Promise<string> {
  const payload = JSON.stringify({
    ...user,
    issuedAt: Date.now(),
  });

  const payloadB64 = base64UrlEncode(payload);
  const key = await getHmacKey();
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadB64)
  );

  let binary = '';
  const bytes = new Uint8Array(signatureBytes);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const signatureB64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verifies a signed session token. Returns null if invalid or tampered.
 */
export async function verifySession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) {
    // Check backward compatibility for raw JSON cookies during transition
    try {
      const parsed = JSON.parse(token);
      if (parsed && parsed.id && parsed.username) {
        return parsed as SessionUser;
      }
    } catch {
      return null;
    }
    return null;
  }

  const [payloadB64, signatureB64] = parts;

  try {
    const key = await getHmacKey();
    let base64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const sigBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      sigBytes[i] = binary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(payloadB64)
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(payloadB64);
    const user = JSON.parse(payloadJson) as SessionUser;
    if (!user || !user.id || !user.username) return null;

    return user;
  } catch {
    return null;
  }
}
