import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Rate limiting for API calls
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canAttempt(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Input sanitization
export const sanitizeInput = (input: string): string => {
  // Remove potential XSS vectors
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// Password validation
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
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
    isValid: errors.length === 0,
    errors
  };
};

// Encrypt sensitive data
export const encryptData = async (data: string): Promise<string> => {
  try {
    if (Platform.OS === 'web') {
      // For web, use base64 encoding (not secure, but better than plain text)
      return btoa(data);
    }
    // For mobile, use expo-crypto
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    return digest;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

// Session timeout manager
export class SessionManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly timeoutDuration: number;
  private readonly onTimeout: () => void;
  private lastActivity: number = Date.now();

  constructor(timeoutMinutes: number = 15, onTimeout: () => void) {
    this.timeoutDuration = timeoutMinutes * 60 * 1000;
    this.onTimeout = onTimeout;
  }

  startSession(): void {
    this.resetTimer();
  }

  resetTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.lastActivity = Date.now();
    this.timeoutId = setTimeout(() => {
      this.onTimeout();
    }, this.timeoutDuration) as unknown as NodeJS.Timeout;
  }

  stopSession(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  getTimeRemaining(): number {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, this.timeoutDuration - elapsed);
  }
}

// Export rate limiter instances
export const authRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
