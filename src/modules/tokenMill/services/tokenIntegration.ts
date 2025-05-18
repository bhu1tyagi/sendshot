import { createToken as createTokenInDb, TokenCreationData } from '@/shared/services/tokenService';

/**
 * Creates a token in the database after it has been created on-chain with TokenMill
 * This ensures the token is properly recorded and displayed in the UI
 */
export async function registerTokenMillToken(
  tokenData: Omit<TokenCreationData, 'protocolType'>
): Promise<boolean> {
  try {
    console.log('[registerTokenMillToken] Registering token:', {
      name: tokenData.name,
      symbol: tokenData.symbol,
      address: tokenData.address,
      creatorId: tokenData.creatorId
    });
    
    // Validate that creatorId exists and is a string
    if (!tokenData.creatorId || typeof tokenData.creatorId !== 'string') {
      console.error('[registerTokenMillToken] Invalid creatorId:', tokenData.creatorId);
      return false;
    }
    
    // Add protocol type for TokenMill
    const completeTokenData: TokenCreationData = {
      ...tokenData,
      protocolType: 'tokenmill',
    };
    
    // Create token in database and update Redux
    return await createTokenInDb(completeTokenData);
  } catch (error) {
    console.error('Error registering TokenMill token:', error);
    return false;
  }
} 