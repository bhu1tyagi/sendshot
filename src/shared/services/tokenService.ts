import { store } from '@/shared/state/store';
import { createToken as createTokenAction, fetchUserTokens } from '@/shared/state/tokens/reducer';
import { showSuccessNotification, showErrorNotification } from '@/shared/state/notification/reducer';
import { SERVER_URL } from '@env';
import { TokenData } from '../state/tokens/reducer';

// For local fallback
const SERVER_BASE_URL = SERVER_URL || 'http://localhost:3000';

export interface TokenCreationData {
  address: string;
  name: string;
  symbol: string;
  metadataURI?: string;
  creatorId: string;
  initialPrice: number;
  currentPrice?: number;
  priceChange24h?: number;
  totalSupply: string;
  holders?: number;
  protocolType: 'pumpfun' | 'raydium' | 'tokenmill' | 'meteora';
}

/**
 * Centralized service for creating tokens across all protocol modules
 * This ensures tokens are properly stored in both the database and Redux state
 */
export async function createToken(tokenData: TokenCreationData): Promise<boolean> {
  try {
    // Validate required fields before dispatch
    if (!tokenData.address || !tokenData.name || !tokenData.symbol || 
        !tokenData.creatorId || !tokenData.initialPrice || 
        !tokenData.totalSupply || !tokenData.protocolType) {
      
      console.error('Token creation failed: Missing required fields', {
        hasAddress: !!tokenData.address,
        hasName: !!tokenData.name,
        hasSymbol: !!tokenData.symbol,
        hasCreatorId: !!tokenData.creatorId,
        hasInitialPrice: !!tokenData.initialPrice,
        hasTotalSupply: !!tokenData.totalSupply,
        hasProtocolType: !!tokenData.protocolType
      });
      
      store.dispatch(
        showErrorNotification({
          message: `Failed to create token: Missing required fields`,
        })
      );
      
      return false;
    }

    console.log(`Creating token in database: ${tokenData.name} (${tokenData.symbol})`, {
      address: tokenData.address,
      creatorId: tokenData.creatorId,
      protocolType: tokenData.protocolType
    });
    
    // Dispatch the createToken action which handles the API call
    const resultAction = await store.dispatch(createTokenAction(tokenData));

    console.log('Token creation result: ------------- ', resultAction);
    
    // Check if the action was successful (not rejected)
    if (createTokenAction.fulfilled.match(resultAction)) {
      // Token was successfully created, refresh the user's tokens
      if (tokenData.creatorId) {
        await store.dispatch(fetchUserTokens(tokenData.creatorId));
      }
      
      // Show success notification
      store.dispatch(
        showSuccessNotification({
          message: `${tokenData.name} token created successfully!`,
        })
      );
      
      return true;
    } else {
      // Handle rejection
      const errorMessage = resultAction.payload || 'Unknown error';
      console.error('Token creation rejected:', errorMessage);
      
      store.dispatch(
        showErrorNotification({
          message: `Failed to create token: ${errorMessage}`,
        })
      );
      
      return false;
    }
  } catch (error) {
    console.error('Error creating token:', error);
    
    // Show error notification
    store.dispatch(
      showErrorNotification({
        message: `Failed to create token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    );
    
    return false;
  }
}

/**
 * Get all tokens created by a specific user
 */
export async function getUserTokens(userId: string) {
  try {
    return await store.dispatch(fetchUserTokens(userId)).unwrap();
  } catch (error) {
    console.error('Error fetching user tokens:', error);
    return null;
  }
}

/**
 * Service to handle token-related API calls
 */
export const TokenService = {
  /**
   * Fetch all tokens from the server
   */
  async getAllTokens(): Promise<TokenData[]> {
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/tokens`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tokens');
      }
      
      return data.tokens || [];
    } catch (error) {
      console.error('Error fetching all tokens:', error);
      throw error;
    }
  },

  /**
   * Fetch tokens created by a specific user
   */
  async getUserTokens(userId: string): Promise<TokenData[]> {
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/tokens/user/${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user tokens');
      }
      
      return data.tokens || [];
    } catch (error) {
      console.error(`Error fetching tokens for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get a specific token by ID
   */
  async getTokenById(tokenId: string): Promise<TokenData> {
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/tokens/${tokenId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch token');
      }
      
      return data.token;
    } catch (error) {
      console.error(`Error fetching token ${tokenId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new token
   */
  async createToken(tokenData: Omit<TokenData, 'id' | 'createdAt'>): Promise<TokenData> {
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create token');
      }
      
      return data.token;
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  },

  /**
   * Update an existing token
   */
  async updateToken(tokenId: string, updates: Partial<TokenData>): Promise<TokenData> {
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/tokens/${tokenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update token');
      }
      
      return data.token;
    } catch (error) {
      console.error(`Error updating token ${tokenId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a token
   */
  async deleteToken(tokenId: string): Promise<boolean> {
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/tokens/${tokenId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete token');
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting token ${tokenId}:`, error);
      throw error;
    }
  },
};

export default TokenService; 