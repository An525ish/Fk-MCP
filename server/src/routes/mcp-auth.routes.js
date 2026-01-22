import { Router } from 'express';
import crypto from 'crypto';
import { generateToken } from '../middleware/auth.middleware.js';
import User from '../models/User.model.js';

const router = Router();

// In-memory store for pending auth requests (use Redis in production)
const pendingAuthRequests = new Map();

// Cleanup old requests every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of pendingAuthRequests.entries()) {
    if (now - data.createdAt > 5 * 60 * 1000) { // 5 minutes expiry
      pendingAuthRequests.delete(code);
    }
  }
}, 60 * 1000);

/**
 * @desc    Generate a new auth request code for MCP
 * @route   POST /api/mcp-auth/request
 * @access  Public
 * 
 * MCP calls this to get a code, then opens browser for user to approve
 */
router.post('/request', (req, res) => {
  // Generate a unique code
  const code = crypto.randomBytes(16).toString('hex');
  
  // Store the pending request
  pendingAuthRequests.set(code, {
    createdAt: Date.now(),
    status: 'pending',
    token: null,
    userId: null,
  });

  // Return the code and the URL for user to visit
  const authUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/mcp-authorize?code=${code}`;
  
  res.json({
    success: true,
    data: {
      code,
      authUrl,
      expiresIn: 300, // 5 minutes
      message: 'Please open the URL in your browser to authorize the MCP connection',
    },
  });
});

/**
 * @desc    Check status of auth request
 * @route   GET /api/mcp-auth/status/:code
 * @access  Public
 * 
 * MCP polls this to check if user has approved
 */
router.get('/status/:code', (req, res) => {
  const { code } = req.params;
  
  const request = pendingAuthRequests.get(code);
  
  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Auth request not found or expired',
    });
  }

  if (request.status === 'approved') {
    // Clean up after successful retrieval
    pendingAuthRequests.delete(code);
    
    return res.json({
      success: true,
      data: {
        status: 'approved',
        token: request.token,
        user: request.user,
      },
    });
  }

  if (request.status === 'denied') {
    pendingAuthRequests.delete(code);
    
    return res.json({
      success: true,
      data: {
        status: 'denied',
        message: 'User denied the authorization request',
      },
    });
  }

  // Still pending
  res.json({
    success: true,
    data: {
      status: 'pending',
      message: 'Waiting for user to authorize',
    },
  });
});

/**
 * @desc    Approve auth request (called from web app after user logs in)
 * @route   POST /api/mcp-auth/approve
 * @access  Private (requires logged-in user)
 */
router.post('/approve', async (req, res) => {
  const { code } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Please login to approve the MCP connection',
    });
  }

  const token = authHeader.split(' ')[1];
  
  // Verify the token and get user
  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const request = pendingAuthRequests.get(code);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Auth request not found or expired. Please try again.',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Auth request already processed',
      });
    }

    // Generate a new token for MCP (could have different expiry/scope)
    const mcpToken = generateToken(user._id);

    // Update the request
    request.status = 'approved';
    request.token = mcpToken;
    request.user = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    res.json({
      success: true,
      message: 'MCP connection authorized successfully! You can close this window.',
      data: {
        userName: user.name,
      },
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
});

/**
 * @desc    Deny auth request
 * @route   POST /api/mcp-auth/deny
 * @access  Public
 */
router.post('/deny', (req, res) => {
  const { code } = req.body;
  
  const request = pendingAuthRequests.get(code);
  
  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Auth request not found or expired',
    });
  }

  request.status = 'denied';

  res.json({
    success: true,
    message: 'Authorization denied',
  });
});

export default router;
