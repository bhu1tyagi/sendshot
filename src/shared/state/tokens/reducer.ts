import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SERVER_URL } from '@env';

// For local fallback
const SERVER_BASE_URL = SERVER_URL || 'http://localhost:3000';

export interface TokenData {
  id: string;
  address: string;
  name: string;
  symbol: string;
  logoURI?: string;
  creatorId: string;
  createdAt: string;
  initialPrice: number;
  currentPrice?: number;
  priceChange24h?: number;
  totalSupply: string;
  holders?: number;
  protocolType: 'pumpfun' | 'raydium' | 'tokenmill' | 'meteora';
}

interface TokensState {
  userTokens: Record<string, TokenData[]>; // userId -> array of tokens
  allTokens: TokenData[];
  loading: boolean;
  error: string | null;
}

const initialState: TokensState = {
  userTokens: {},
  allTokens: [],
  loading: false,
  error: null,
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

const tokensSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {},
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
    
    // createToken
    builder.addCase(createToken.fulfilled, (state, action) => {
      const token = action.payload;
      // Add to allTokens
      state.allTokens.push(token);
      // Add to userTokens if the creator's array exists
      if (state.userTokens[token.creatorId]) {
        state.userTokens[token.creatorId].push(token);
      } else {
        state.userTokens[token.creatorId] = [token];
      }
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

export default tokensSlice.reducer; 