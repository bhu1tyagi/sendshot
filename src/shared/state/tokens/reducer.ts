import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { BIRDEYE_API_KEY, SERVER_URL } from '@env';
import { Connection, PublicKey, clusterApiUrl, Cluster } from '@solana/web3.js';
import { HELIUS_STAKED_URL, CLUSTER } from '@env';
import { PayloadAction } from '@reduxjs/toolkit';

// For local fallback
const SERVER_BASE_URL = SERVER_URL || 'http://localhost:3000';

export interface TokenData {
  id: string;
  address: string;
  name: string;
  symbol: string;
  logoURI?: string;
  metadataURI?: string; // Token metadata as a JSON string
  creatorId: string;
  createdAt: string;
  initialPrice: number;
  currentPrice?: number;
  priceChange24h?: number;
  totalSupply: string;
  holders?: number;
  protocolType: 'pumpfun' | 'raydium' | 'tokenmill' | 'meteora';
  // New fields for wallet holdings
  balance?: number;
  usdValue?: number;
}

export interface WalletTokenData {
  mint: string;
  address: string; // token address
  symbol: string;
  name: string;
  logoURI?: string;
  decimals: number;
  balance: number;
  usdValue?: number;
  priceChange24h?: number;
}

interface TokensState {
  userTokens: Record<string, TokenData[]>; // userId -> array of tokens
  walletTokens: Record<string, WalletTokenData[]>; // walletAddress -> array of tokens
  allTokens: TokenData[];
  loading: boolean;
  walletTokensLoading: boolean;
  error: string | null;
  walletTokensError: string | null;
}

const initialState: TokensState = {
  userTokens: {},
  walletTokens: {},
  allTokens: [],
  loading: false,
  walletTokensLoading: false,
  error: null,
  walletTokensError: null,
};

/**
 * Fetch all tokens created by a specific user
 */
export const fetchUserTokens = createAsyncThunk(
  'tokens/fetchUserTokens',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/tokens/user/${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to fetch user tokens');
      }
      
      return {
        userId,
        tokens: data.tokens || [],
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch user tokens');
    }
  }
);

/**
 * Fetch all tokens in the system
 */
export const fetchAllTokens = createAsyncThunk(
  'tokens/fetchAllTokens',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/tokens`);
      const data = await response.json();
      
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to fetch all tokens');
      }
      
      return data.tokens || [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch all tokens');
    }
  }
);

/**
 * Fetch tokens held by a specific wallet
 */
export const fetchWalletTokens = createAsyncThunk(
  'tokens/fetchWalletTokens',
  async (walletAddress: string, { rejectWithValue }) => {
    try {
      console.log(`Fetching token accounts for wallet: ${walletAddress}`);
      
      // Use Birdeye API to get wallet portfolio
      const response = await fetch(`https://public-api.birdeye.so/v1/wallet/token_list?wallet=${walletAddress}`, {
        method: 'GET',
        headers: { 
          'X-API-KEY': BIRDEYE_API_KEY, 
          'accept': 'application/json',
          'x-chain': 'solana'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch wallet data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch wallet portfolio from Birdeye API');
      }
      
      // Map Birdeye data to our WalletTokenData format
      const tokens: WalletTokenData[] = data.data.items
        .filter((item: any) => item.uiAmount > 0) // Filter out zero balance tokens
        .map((item: any) => ({
          mint: item.address,
          address: item.address,
          symbol: item.symbol || 'Unknown',
          name: item.name || 'Unknown Token',
          logoURI: item.logoURI || item.icon,
          decimals: item.decimals,
          balance: item.uiAmount,
          usdValue: item.valueUsd || 0,
          priceChange24h: 0, // Birdeye doesn't provide 24h price change in this endpoint
        }));
      
      console.log(`Found ${tokens.length} tokens in wallet with total value: $${data.data.totalUsd}`);
      return { walletAddress, tokens };
      
    } catch (error: any) {
      console.error('Error fetching wallet tokens:', error);
      return rejectWithValue(error.message || 'Failed to fetch wallet tokens');
    }
  }
);

/**
 * Create a new token
 */
export const createToken = createAsyncThunk(
  'tokens/createToken',
  async (tokenData: Omit<TokenData, 'id' | 'createdAt'>, { rejectWithValue }) => {
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
        return rejectWithValue(data.error || 'Failed to create token');
      }
      
      return data.token;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create token');
    }
  }
);

/**
 * Update token information
 */
export const updateToken = createAsyncThunk(
  'tokens/updateToken',
  async (
    { tokenId, updates }: { tokenId: string; updates: Partial<TokenData> },
    { rejectWithValue }
  ) => {
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
        return rejectWithValue(data.error || 'Failed to update token');
      }
      
      return data.token;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update token');
    }
  }
);

interface UpdateTokenBalancePayload {
  walletAddress: string;
  tokenAddress: string;
  newBalance: number;
  usdValue?: number;
}

const tokensSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    updateTokenBalance(state, action: PayloadAction<UpdateTokenBalancePayload>) {
      const { walletAddress, tokenAddress, newBalance, usdValue } = action.payload;
      
      // Check if wallet tokens exist
      if (state.walletTokens[walletAddress]) {
        // Find the token in the wallet
        const tokenIndex = state.walletTokens[walletAddress].findIndex(
          token => token.address === tokenAddress || token.mint === tokenAddress
        );
        
        if (tokenIndex !== -1) {
          // If token exists and balance is zero or negative, remove the token
          if (newBalance <= 0) {
            state.walletTokens[walletAddress] = state.walletTokens[walletAddress].filter(
              (_, index) => index !== tokenIndex
            );
          } else {
            // Otherwise update the token balance
            state.walletTokens[walletAddress][tokenIndex].balance = newBalance;
            
            // Update USD value if provided
            if (usdValue !== undefined) {
              state.walletTokens[walletAddress][tokenIndex].usdValue = usdValue;
            } else if (state.walletTokens[walletAddress][tokenIndex].usdValue) {
              // Recalculate USD value based on current price per token
              const currentToken = state.walletTokens[walletAddress][tokenIndex];
              const pricePerToken = currentToken.usdValue! / currentToken.balance;
              state.walletTokens[walletAddress][tokenIndex].usdValue = pricePerToken * newBalance;
            }
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    // fetchUserTokens
    builder.addCase(fetchUserTokens.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUserTokens.fulfilled, (state, action) => {
      state.loading = false;
      state.userTokens[action.payload.userId] = action.payload.tokens;
    });
    builder.addCase(fetchUserTokens.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || action.error.message || 'Unknown error';
    });
    
    // fetchAllTokens
    builder.addCase(fetchAllTokens.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchAllTokens.fulfilled, (state, action) => {
      state.loading = false;
      state.allTokens = action.payload;
    });
    builder.addCase(fetchAllTokens.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || action.error.message || 'Unknown error';
    });
    
    // fetchWalletTokens
    builder.addCase(fetchWalletTokens.pending, (state) => {
      state.walletTokensLoading = true;
      state.walletTokensError = null;
    });
    builder.addCase(fetchWalletTokens.fulfilled, (state, action) => {
      state.walletTokensLoading = false;
      state.walletTokens[action.payload.walletAddress] = action.payload.tokens;
    });
    builder.addCase(fetchWalletTokens.rejected, (state, action) => {
      state.walletTokensLoading = false;
      state.walletTokensError = action.payload as string || action.error.message || 'Unknown error';
    });
    
    // createToken
    builder.addCase(createToken.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    
    builder.addCase(createToken.fulfilled, (state, action) => {
      state.loading = false;
      const token = action.payload;
      
      // Add safety check: only proceed if token exists and has required properties
      if (token && token.id) {
        // Add to allTokens
        state.allTokens.push(token);
        
        // Make sure creatorId exists before trying to update userTokens
        if (token.creatorId) {
          // Add to userTokens if the creator's array exists
          if (state.userTokens[token.creatorId]) {
            state.userTokens[token.creatorId].push(token);
          } else {
            state.userTokens[token.creatorId] = [token];
          }
        }
      }
    });
    
    builder.addCase(createToken.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || action.error.message || 'Failed to create token';
      console.error('Token creation failed:', state.error);
    });
    
    // updateToken
    builder.addCase(updateToken.fulfilled, (state, action) => {
      const updatedToken = action.payload;
      
      // Update in allTokens
      const allTokenIndex = state.allTokens.findIndex(t => t.id === updatedToken.id);
      if (allTokenIndex !== -1) {
        state.allTokens[allTokenIndex] = updatedToken;
      }
      
      // Update in userTokens
      if (state.userTokens[updatedToken.creatorId]) {
        const userTokenIndex = state.userTokens[updatedToken.creatorId].findIndex(
          t => t.id === updatedToken.id
        );
        if (userTokenIndex !== -1) {
          state.userTokens[updatedToken.creatorId][userTokenIndex] = updatedToken;
        }
      }
    });
  },
});

export const { updateTokenBalance } = tokensSlice.actions;
export default tokensSlice.reducer; 