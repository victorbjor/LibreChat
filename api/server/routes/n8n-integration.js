const express = require('express');
const { logger } = require('~/config');
const { findUser } = require('~/models');
const jwt = require('jsonwebtoken');

const router = express.Router();

/**
 * Generate a token for n8n integration
 */
const generateN8nToken = (user) => {
	const payload = {
		id: user._id.toString(),
		email: user.email,
		username: user.username,
		name: user.name,
		role: user.role,
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
	};

	return jwt.sign(payload, process.env.JWT_SECRET);
};

/**
 * Get n8n integration token for current user
 */
router.get('/token', async (req, res) => {
	try {
		if (!req.user) {
			return res.status(401).json({ 
				status: 'error', 
				message: 'Not authenticated' 
			});
		}

		const token = generateN8nToken(req.user);
		
		res.json({
			status: 'success',
			token,
			user: {
				id: req.user._id.toString(),
				email: req.user.email,
				username: req.user.username,
				name: req.user.name,
				role: req.user.role,
			},
		});
	} catch (error) {
		logger.error('[n8n-integration] Failed to generate token:', error);
		res.status(500).json({ 
			status: 'error', 
			message: 'Failed to generate n8n token' 
		});
	}
});

/**
 * Validate n8n token and return user info
 */
router.post('/validate', async (req, res) => {
	try {
		const { token } = req.body;
		
		if (!token) {
			return res.status(400).json({ 
				status: 'error', 
				message: 'No token provided' 
			});
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await findUser({ _id: decoded.id });
		
		if (!user) {
			return res.status(401).json({ 
				status: 'error', 
				message: 'Invalid token' 
			});
		}

		res.json({
			status: 'success',
			user: {
				id: user._id.toString(),
				email: user.email,
				username: user.username,
				name: user.name,
				role: user.role,
			},
		});
	} catch (error) {
		logger.error('[n8n-integration] Token validation failed:', error);
		res.status(401).json({ 
			status: 'error', 
			message: 'Invalid token' 
		});
	}
});

/**
 * Redirect to n8n with authentication token
 */
router.get('/redirect', async (req, res) => {
	try {
		if (!req.user) {
			return res.status(401).json({ 
				status: 'error', 
				message: 'Not authenticated' 
			});
		}

		const token = generateN8nToken(req.user);
		const n8nUrl = process.env.N8N_URL || 'http://localhost:5678';
		const returnTo = req.query.returnTo || '/';
		
		// Redirect to n8n with token
		const redirectUrl = `${n8nUrl}?librechat_token=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(returnTo)}`;
		
		res.redirect(redirectUrl);
	} catch (error) {
		logger.error('[n8n-integration] Redirect failed:', error);
		res.status(500).json({ 
			status: 'error', 
			message: 'Failed to redirect to n8n' 
		});
	}
});

module.exports = router;
