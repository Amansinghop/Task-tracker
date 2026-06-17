import { createHash } from 'crypto';

export function generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
  // Create a unique device fingerprint from user agent and IP
  const combined = `${userAgent}:${ipAddress}`;
  return createHash('sha256').update(combined).digest('hex');
}

export function generateTokenHash(token: string): string {
  // Hash the token for secure storage
  return createHash('sha256').update(token).digest('hex');
}
