import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

/**
 * Returns X-Timestamp and X-Signature headers for a request.
 *
 * Signed message: `{timestamp}\n{METHOD}\n{path}`
 * The server rejects signatures older than ±5 minutes (replay protection).
 */
export function signRequest(
  secret: string,
  method: string,
  path: string,
): { 'X-Timestamp': string; 'X-Signature': string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${timestamp}\n${method.toUpperCase()}\n${path}`;
  const signature = bytesToHex(
    hmac(sha256, utf8ToBytes(secret), utf8ToBytes(message)),
  );
  return { 'X-Timestamp': timestamp, 'X-Signature': signature };
}
