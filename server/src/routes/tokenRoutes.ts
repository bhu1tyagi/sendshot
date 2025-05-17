import express, { RequestHandler } from 'express';
import * as TokenController from '../controllers/tokenController';

const router = express.Router();

// GET all tokens
router.get('/', TokenController.getAllTokens as unknown as RequestHandler);

// GET tokens created by a specific user
router.get('/user/:userId', TokenController.getUserTokens as unknown as RequestHandler);

// GET a specific token by ID
router.get('/:tokenId', TokenController.getTokenById as unknown as RequestHandler);

// POST create a new token
router.post('/', TokenController.createToken as unknown as RequestHandler);

// PATCH update an existing token
router.patch('/:tokenId', TokenController.updateToken as unknown as RequestHandler);

// DELETE a token
router.delete('/:tokenId', TokenController.deleteToken as unknown as RequestHandler);

export default router; 