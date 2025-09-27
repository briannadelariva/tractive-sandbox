import { Router } from 'express';
import { TractiveService } from '../services/tractiveService';
import { ApiResponse } from '../types';

const router = Router();
const tractiveService = new TractiveService();

/**
 * POST /api/auth/login-tractive
 * Authenticate with Tractive API and store session server-side
 */
router.post('/login-tractive', async (req, res) => {
  try {
    const success = await tractiveService.authenticate();
    
    if (success) {
      res.json({
        success: true,
        data: {
          message: 'Authentication successful',
          sessionToken: 'server-managed-session', // We don't expose real tokens
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse<{ message: string; sessionToken: string }>);
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid Tractive credentials',
        timestamp: new Date().toISOString(),
      } as ApiResponse<never>);
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/auth/status
 * Check authentication status
 */
router.get('/status', (req, res) => {
  // In a real app, you'd check session validity here
  res.json({
    success: true,
    data: {
      authenticated: true, // Simplified for demo
      message: 'Session active',
    },
    timestamp: new Date().toISOString(),
  } as ApiResponse<{ authenticated: boolean; message: string }>);
});

export default router;