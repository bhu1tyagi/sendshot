import { Request, Response } from 'express';
import * as TokenModel from '../db/models/token';

export async function getAllTokens(req: Request, res: Response) {
  try {
    const tokens = await TokenModel.getAllTokens();
    return res.status(200).json({ success: true, tokens });
  } catch (error) {
    console.error('Error in getAllTokens:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch tokens' });
  }
}

export async function getUserTokens(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    const tokens = await TokenModel.getUserTokens(userId);
    return res.status(200).json({ success: true, tokens });
  } catch (error) {
    console.error('Error in getUserTokens:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user tokens' });
  }
}

export async function getTokenById(req: Request, res: Response) {
  try {
    const { tokenId } = req.params;
    
    if (!tokenId) {
      return res.status(400).json({ success: false, error: 'Token ID is required' });
    }
    
    const token = await TokenModel.getTokenById(tokenId);
    
    if (!token) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }
    
    return res.status(200).json({ success: true, token });
  } catch (error) {
    console.error('Error in getTokenById:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch token' });
  }
}

export async function createToken(req: Request, res: Response) {
  try {
    const {
      address,
      name,
      symbol,
      metadataURI,
      creatorId,
      initialPrice,
      currentPrice,
      priceChange24h,
      totalSupply,
      holders,
      protocolType,
    } = req.body;
    
    console.log(`[tokenController] Creating token: ${name} (${symbol})`, { 
      address,
      creatorId,
      protocolType
    });

    // Validate required fields
    if (!address || !name || !symbol || !creatorId || !initialPrice || !totalSupply || !protocolType) {
      console.error('[tokenController] Missing required fields:', {
        address: !!address,
        name: !!name,
        symbol: !!symbol,
        creatorId: !!creatorId,
        initialPrice: !!initialPrice,
        totalSupply: !!totalSupply,
        protocolType: !!protocolType
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: address, name, symbol, creatorId, initialPrice, totalSupply, protocolType',
      });
    }
    
    // Convert from camelCase to snake_case
    const tokenData = TokenModel.convertRequestToDbToken(req.body);
    
    const newToken = await TokenModel.createToken(tokenData);
    
    if (!newToken) {
      console.error(`[tokenController] Failed to create token ${name}`);
      return res.status(500).json({ success: false, error: 'Failed to create token' });
    }
    
    console.log(`[tokenController] Created token successfully: ${name} (${symbol}) with id: ${newToken.id}`, {
      returnedToken: newToken
    });
    
    // Ensure the token has all required fields before returning
    if (!newToken.id || !newToken.creatorId) {
      console.error('[tokenController] Created token is missing required fields:', {
        id: !!newToken.id,
        creatorId: !!newToken.creatorId
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Created token is missing required fields',
        token: null 
      });
    }
    
    return res.status(201).json({ success: true, token: newToken });
  } catch (error) {
    console.error('Error in createToken:', error);
    return res.status(500).json({ success: false, error: 'Failed to create token' });
  }
}

export async function updateToken(req: Request, res: Response) {
  try {
    const { tokenId } = req.params;
    
    if (!tokenId) {
      return res.status(400).json({ success: false, error: 'Token ID is required' });
    }
    
    // Convert from camelCase to snake_case
    const updates = TokenModel.convertRequestToDbToken(req.body);
    
    const updatedToken = await TokenModel.updateToken(tokenId, updates);
    
    if (!updatedToken) {
      return res.status(404).json({ success: false, error: 'Token not found or update failed' });
    }
    
    return res.status(200).json({ success: true, token: updatedToken });
  } catch (error) {
    console.error('Error in updateToken:', error);
    return res.status(500).json({ success: false, error: 'Failed to update token' });
  }
}

export async function deleteToken(req: Request, res: Response) {
  try {
    const { tokenId } = req.params;
    
    if (!tokenId) {
      return res.status(400).json({ success: false, error: 'Token ID is required' });
    }
    
    const success = await TokenModel.deleteToken(tokenId);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Token not found or delete failed' });
    }
    
    return res.status(200).json({ success: true, message: 'Token deleted successfully' });
  } catch (error) {
    console.error('Error in deleteToken:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete token' });
  }
} 