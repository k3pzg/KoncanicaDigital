import crypto from 'crypto';

const KEYLEN = 64;

export function hashPassword(plainTextPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plainTextPassword, salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plainTextPassword, storedHash) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) {
    return false;
  }

  const hashBuffer = Buffer.from(hash, 'hex');
  const computedHashBuffer = crypto.scryptSync(plainTextPassword, salt, KEYLEN);

  if (hashBuffer.length !== computedHashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, computedHashBuffer);
}
