import express, { RequestHandler } from 'express';
import * as UserController from '../controllers/userController';

const router = express.Router();

// Create or update a user
router.post('/', UserController.createOrUpdateUser as unknown as RequestHandler);

export default router; 