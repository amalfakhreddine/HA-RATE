import type { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  verifyAdminCredentials,
  isAdminSessionValid,
  updateAdminSessionActivity,
  createAdminSession,
  destroyAdminSession,
} from './admin-auth-service';

/**
 * Middleware to require admin authentication
 * Checks if session is valid and not expired
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!isAdminSessionValid(req.session)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Update activity timestamp
  updateAdminSessionActivity(req.session);
  next();
}

/**
 * Register admin authentication routes
 * @param app - Express application
 */
export function registerAdminAuthRoutes(app: Express) {
  // Login endpoint - verify username and password
  app.post('/api/admin/auth/login', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      });

      const { username, password } = schema.parse(req.body);

      // Verify username and password
      const credentialsValid = await verifyAdminCredentials(username, password);
      if (!credentialsValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Credentials verified - regenerate session ID for security (prevent session fixation)
      req.session.regenerate((err: Error | null) => {
        if (err) {
          console.error('[Admin Auth] Session regeneration error:', err);
          return res.status(500).json({ error: 'Authentication error' });
        }

        // Create admin session data after successful regeneration
        createAdminSession(req.session, username);

        res.json({
          success: true,
          message: 'Authentication successful',
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      
      console.error('[Admin Auth] Login error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  });

  // Logout endpoint
  app.post('/api/admin/auth/logout', (req: Request, res: Response) => {
    try {
      destroyAdminSession(req.session);
      
      // Destroy the entire session
      req.session.destroy((err: Error | null) => {
        if (err) {
          console.error('[Admin Auth] Session destruction error:', err);
          return res.status(500).json({ error: 'Logout error' });
        }

        // Clear the session cookie
        res.clearCookie('bittnexis.sid');
        res.json({ success: true, message: 'Logged out successfully' });
      });
    } catch (error) {
      console.error('[Admin Auth] Logout error:', error);
      res.status(500).json({ error: 'Logout error' });
    }
  });

  // Check authentication status
  app.get('/api/admin/auth/status', (req: Request, res: Response) => {
    try {
      const isAuthenticated = isAdminSessionValid(req.session);
      
      if (isAuthenticated) {
        updateAdminSessionActivity(req.session);
        res.json({
          authenticated: true,
          username: req.session.adminUsername,
        });
      } else {
        res.json({
          authenticated: false,
        });
      }
    } catch (error) {
      console.error('[Admin Auth] Status check error:', error);
      res.status(500).json({ error: 'Status check error' });
    }
  });
}
