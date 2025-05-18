import { store } from '@/shared/state/store';
import { createToken as createTokenAction, fetchUserTokens } from '@/shared/state/tokens/reducer';
import { showSuccessNotification, showErrorNotification } from '@/shared/state/notification/reducer';

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