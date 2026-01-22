/**
 * Token Storage Utility
 * Securely persists authentication tokens across sessions
 * Uses encryption for secure storage on disk
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { logger } from './logger.js';

// Storage location in user's home directory (hidden folder)
const STORAGE_DIR = join(homedir(), '.flipkart-minutes-mcp');
const TOKEN_FILE = join(STORAGE_DIR, 'auth.enc');
const KEY_FILE = join(STORAGE_DIR, '.key');

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

interface StoredAuth {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: number;
  expiresAt?: number;
}

/**
 * Get or create encryption key
 * The key is derived from a random secret stored separately
 */
function getEncryptionKey(): Buffer {
  try {
    // Ensure storage directory exists
    if (!existsSync(STORAGE_DIR)) {
      mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
    }

    let secret: Buffer;
    
    if (existsSync(KEY_FILE)) {
      secret = readFileSync(KEY_FILE);
    } else {
      // Generate new random secret
      secret = randomBytes(32);
      writeFileSync(KEY_FILE, secret, { mode: 0o600 });
    }

    // Derive key using scrypt
    const salt = Buffer.from('flipkart-minutes-mcp-salt');
    return scryptSync(secret, salt, 32);
  } catch (error) {
    logger.error('Failed to get encryption key', error instanceof Error ? error : String(error));
    throw new Error('Failed to initialize secure storage');
  }
}

/**
 * Encrypt data
 */
function encrypt(data: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + AuthTag + Encrypted data
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt data
 */
function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  
  // Extract IV, AuthTag, and encrypted content
  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
  const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Save authentication data securely
 */
export function saveAuth(token: string, user: { id: string; name: string; email: string }, expiresInDays: number = 30): void {
  try {
    const authData: StoredAuth = {
      token,
      user,
      createdAt: Date.now(),
      expiresAt: Date.now() + (expiresInDays * 24 * 60 * 60 * 1000),
    };

    const encrypted = encrypt(JSON.stringify(authData));
    
    // Ensure directory exists
    if (!existsSync(STORAGE_DIR)) {
      mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
    }
    
    writeFileSync(TOKEN_FILE, encrypted, { mode: 0o600 });
    logger.info(`Auth saved for user: ${user.email}`);
  } catch (error) {
    logger.error('Failed to save auth', error instanceof Error ? error : String(error));
    throw new Error('Failed to save authentication');
  }
}

/**
 * Load authentication data
 * Returns null if no valid auth exists or if expired
 */
export function loadAuth(): StoredAuth | null {
  try {
    if (!existsSync(TOKEN_FILE)) {
      logger.debug('No stored auth found');
      return null;
    }

    const encrypted = readFileSync(TOKEN_FILE, 'utf8');
    const decrypted = decrypt(encrypted);
    const authData: StoredAuth = JSON.parse(decrypted);

    // Check if expired
    if (authData.expiresAt && Date.now() > authData.expiresAt) {
      logger.info('Stored auth has expired, clearing...');
      clearAuth();
      return null;
    }

    logger.info(`Loaded stored auth for user: ${authData.user.email}`);
    return authData;
  } catch (error) {
    logger.warn('Failed to load stored auth, clearing...', error instanceof Error ? error.message : String(error));
    // If decryption fails, clear the corrupted file
    clearAuth();
    return null;
  }
}

/**
 * Clear stored authentication
 */
export function clearAuth(): void {
  try {
    if (existsSync(TOKEN_FILE)) {
      unlinkSync(TOKEN_FILE);
      logger.info('Cleared stored auth');
    }
  } catch (error) {
    logger.error('Failed to clear auth', error instanceof Error ? error : String(error));
  }
}

/**
 * Check if valid auth exists without loading the full data
 */
export function hasValidAuth(): boolean {
  const auth = loadAuth();
  return auth !== null;
}

/**
 * Get storage location info (for debugging)
 */
export function getStorageInfo(): { directory: string; tokenFile: string; exists: boolean } {
  return {
    directory: STORAGE_DIR,
    tokenFile: TOKEN_FILE,
    exists: existsSync(TOKEN_FILE),
  };
}
