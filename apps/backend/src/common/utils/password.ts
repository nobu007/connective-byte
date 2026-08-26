/**
 * Password hashing and verification utilities
 *
 * PBKDF2-SHA256 (WebCrypto) を使用。
 * 仕様(design.md)はbcrypt 12ラウンドを想定していたが、Cloudflare Workers
 * フリープランのCPU制限(10ms/req)に対し純JS実装のbcryptは50-100ms要し
 * 制約違反となるため、ネイティブ実装のPBKDF2に変更した
 * （NIST/OWASP承認のアルゴリズム。DBが空のため移行対応は不要）。
 *
 * ハッシュ形式: `pbkdf2$sha256$<iterations>$<saltHex>$<hashHex>`
 */

const ITERATIONS = 100_000;
const KEY_LENGTH_BYTES = 32;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const subtle = globalThis.crypto.subtle;
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    keyMaterial,
    KEY_LENGTH_BYTES * 8
  );
  return new Uint8Array(bits);
}

/**
 * Hash a password
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(password, salt, ITERATIONS);
  return `pbkdf2$sha256$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

/**
 * Verify a password against a hash
 * @param password Plain text password
 * @param hash Hashed password
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split('$');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') {
    return false;
  }

  const iterations = parseInt(parts[2], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const salt = fromHex(parts[3]);
  const expected = fromHex(parts[4]);
  const actual = await deriveBits(password, salt, iterations);

  if (actual.length !== expected.length) {
    return false;
  }

  // 定数時間比較
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Validation result with errors
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
