import bcrypt from 'bcrypt';
import { config } from './config';

// Session timeout duration (15 minutes)
export const ADMIN_SESSION_TIMEOUT_MS = 15 * 60 * 1000;

// Interface for admin session data
export interface AdminSessionData {
  adminAuthenticated: boolean;
  adminUsername?: string;
  lastActivity?: number;
  createdAt?: number;
}

/**
 * Verify admin username and password
 * @param username - Provided username
 * @param password - Provided plain-text password
 * @returns Promise<boolean> - True if credentials are valid
 */
export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  try {
    // Check if credentials are configured
    if (!config.adminUsername || !config.adminPasswordHash) {
      console.error('[Admin Auth] Missing admin credentials configuration');
      return false;
    }

    console.log('[Admin Auth] Checking username:', username, 'vs', config.adminUsername);
    
    // Verify username (case-sensitive)
    if (username !== config.adminUsername) {
      console.log('[Admin Auth] Username mismatch');
      return false;
    }

    console.log('[Admin Auth] Username matched, checking password...');
    
    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, config.adminPasswordHash);
    console.log('[Admin Auth] Password check result:', isValid);
    return isValid;
  } catch (error) {
    console.error('[Admin Auth] Error verifying credentials:', error);
    return false;
  }
}

/**
 * Check if admin session is valid and not expired
 * @param session - Express session object
 * @returns boolean - True if session is valid
 */
export function isAdminSessionValid(session: any): boolean {
  if (!session || !session.adminAuthenticated) {
    return false;
  }

  // Check session timeout
  const lastActivity = session.lastActivity;
  if (!lastActivity) {
    return false;
  }

  const now = Date.now();
  const timeSinceActivity = now - lastActivity;

  if (timeSinceActivity > ADMIN_SESSION_TIMEOUT_MS) {
    return false;
  }

  return true;
}

/**
 * Update admin session activity timestamp
 * @param session - Express session object
 */
export function updateAdminSessionActivity(session: any): void {
  if (session && session.adminAuthenticated) {
    session.lastActivity = Date.now();
  }
}

/**
 * Create admin session after successful authentication
 * @param session - Express session object
 * @param username - Admin username
 */
export function createAdminSession(session: any, username: string): void {
  const now = Date.now();
  session.adminAuthenticated = true;
  session.adminUsername = username;
  session.lastActivity = now;
  session.createdAt = now;
}

/**
 * Destroy admin session
 * @param session - Express session object
 */
export function destroyAdminSession(session: any): void {
  if (session) {
    delete session.adminAuthenticated;
    delete session.adminUsername;
    delete session.lastActivity;
    delete session.createdAt;
  }
}
