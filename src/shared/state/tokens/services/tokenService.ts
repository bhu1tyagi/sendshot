import { AppDispatch } from '../../store';
import { createToken } from '../reducer';
import { TokenData } from '../reducer';
import { SERVER_URL } from '@env';

// For local fallback
const SERVER_BASE_URL = SERVER_URL || 'http://localhost:3000';

/**
 * Centralized token service to manage token creation across all protocols
 * This service coordinates between protocol-specific token creation logic,
 * database updates, and Redux store updates.
 */
export class TokenService {
  /**
   * Register a newly created token
   * This function is called by protocol-specific token creation functions
   * after a token has been successfully created on-chain.
   * 
   * It updates the database first, then updates the Redux store.
   */
  static async registerToken(
    tokenData: Omit<TokenData, 'id' | 'createdAt'>,
    dispatch: AppDispatch
  ): Promise<TokenData> {
    try {
      console.log(`[TokenService] Registering new ${tokenData.protocolType} token: ${tokenData.name} (${tokenData.symbol})`);
      
      // First, create the token in the database
      const response = await fetch(`${SERVER_BASE_URL}/api/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenData),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to register token in database');
      }
      
      const newToken = data.token;
      console.log(`[TokenService] Token registered in database with ID: ${newToken.id}`);
      
      // Then dispatch to update Redux store
      await dispatch(createToken(tokenData));
      
      return newToken;
    } catch (error) {
      console.error('[TokenService] Error registering token:', error);
      throw error;
    }
  }
  
  /**
   * Fetch tokens for a specific creator
   */
  static async fetchUserTokens(userId: string): Promise<TokenData[]> {
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/tokens/user/${userId}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch user tokens');
      }
      
      return data.tokens;
    } catch (error) {
      console.error('[TokenService] Error fetching user tokens:', error);
      throw error;
    }
  }
} 