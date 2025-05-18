import { createToken as createTokenInDb, TokenCreationData } from '@/shared/services/tokenService';
import { useSelector } from 'react-redux';
import { RootState } from '@/shared/state/store';

/**
 * Creates a token in the database after it has been created on-chain with PumpFun
 * This ensures the token is properly recorded and displayed in the UI
 */
export async function registerPumpfunToken(
  tokenData: Omit<TokenCreationData, 'protocolType'>
): Promise<boolean> {
  try {
    console.log('[registerPumpfunToken] Registering token:', {
      name: tokenData.name,
      symbol: tokenData.symbol,
      address: tokenData.address,
      creatorId: tokenData.creatorId
    });
    
    // Validate that creatorId exists and is a string
    if (!tokenData.creatorId || typeof tokenData.creatorId !== 'string') {
      console.error('[registerPumpfunToken] Invalid creatorId:', tokenData.creatorId);
      return false;
    }
    
    // Add protocol type for PumpFun
    const completeTokenData: TokenCreationData = {
      ...tokenData,
      protocolType: 'pumpfun',
    };
    
    // Create token in database and update Redux
    return await createTokenInDb(completeTokenData);
  } catch (error) {
    console.error('Error registering PumpFun token:', error);
    return false;
  }
} 