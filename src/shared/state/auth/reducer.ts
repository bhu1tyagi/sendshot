import {SERVER_URL} from '@env';
import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';

export interface AuthState {
  provider: 'privy' | 'dynamic' | 'turnkey' | 'mwa' |  null;
  address: string | null;
  isLoggedIn: boolean;
  profilePicUrl: string | null;
  username: string | null; // storing user's chosen display name
  description: string | null; // storing user's bio description
}

const initialState: AuthState = {
  provider: null,
  address: null,
  isLoggedIn: false,
  profilePicUrl: null,
  username: null,
  description: null,
};

const SERVER_BASE_URL = SERVER_URL || 'http://localhost:3000';

/**
 * New thunk that combines checking if user exists, fetching user data if they do,
 * or creating a new user if they don't
 */
export const loginOrCreateUser = createAsyncThunk(
  'auth/loginOrCreateUser',
  async (userData: {
    provider: 'privy' | 'dynamic' | 'turnkey' | 'mwa';
    address: string;
    username?: string;
  }, thunkAPI) => {
    try {
      console.log('[Auth] loginOrCreateUser for address:', userData.address);
      
      // First, try to fetch the user profile
      const profileResponse = await fetch(
        `${SERVER_BASE_URL}/api/profile?userId=${userData.address}`
      );
      const profileData = await profileResponse.json();
      
      // If user exists, return their data
      if (profileData.success) {
        console.log('[Auth] User exists, returning profile data');
        return {
          provider: userData.provider,
          address: userData.address,
          profilePicUrl: profileData.url,
          username: profileData.username,
          description: profileData.description,
          isNewUser: false
        };
      }
      
      // User doesn't exist, create a new one
      console.log('[Auth] User does not exist, creating new user');
      const createResponse = await fetch(`${SERVER_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.address,
          username: userData.username || userData.address.substring(0, 6),
          provider: userData.provider,
        }),
      });
      
      const createData = await createResponse.json();
      
      if (!createData.success) {
        return thunkAPI.rejectWithValue(createData.error || 'Failed to create user');
      }
      
      // Return new user data
      return {
        provider: userData.provider,
        address: userData.address,
        username: createData.user.username,
        isNewUser: true
      };
    } catch (error: any) {
      console.error('[Auth] Error in loginOrCreateUser:', error);
      return thunkAPI.rejectWithValue(error.message || 'Error during login/signup');
    }
  }
);

/**
 * Create or update a user in the database after login
 */
export const createUserOnLogin = createAsyncThunk(
  'auth/createUserOnLogin',
  async (userData: {
    userId: string;
    username?: string;
    provider: 'privy' | 'dynamic' | 'turnkey' | 'mwa';
  }, thunkAPI) => {
    try {
      // Make an API call to create or update the user in the database
      const response = await fetch(`${SERVER_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.userId,
          username: userData.username || userData.userId.substring(0, 6),
          provider: userData.provider,
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        return thunkAPI.rejectWithValue(data.error || 'Failed to create user');
      }
      
      return data.user;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'Error creating user');
    }
  }
);

/**
 * Fetch the user's profile from the server, including profile pic URL, username,
 * and attachment data.
 */
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (userId: string, thunkAPI) => {
    const response = await fetch(
      `${SERVER_BASE_URL}/api/profile?userId=${userId}`,
    );
    const data = await response.json();
    if (data.success) {
      return {
        profilePicUrl: data.url,
        username: data.username,
        description: data.description,
      };
    } else {
      return thunkAPI.rejectWithValue(
        data.error || 'Failed to fetch user profile',
      );
    }
  },
);

/**
 * Update the user's username in the database.
 */
export const updateUsername = createAsyncThunk(
  'auth/updateUsername',
  async (
    {userId, newUsername}: {userId: string; newUsername: string},
    thunkAPI,
  ) => {
    try {
      const response = await fetch(
        `${SERVER_BASE_URL}/api/profile/updateUsername`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({userId, username: newUsername}),
        },
      );
      const data = await response.json();
      if (!data.success) {
        return thunkAPI.rejectWithValue(
          data.error || 'Failed to update username',
        );
      }
      return data.username as string;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.message || 'Error updating username',
      );
    }
  },
);

/**
 * Update the user's description in the database.
 */
export const updateDescription = createAsyncThunk(
  'auth/updateDescription',
  async (
    {userId, newDescription}: {userId: string; newDescription: string},
    thunkAPI,
  ) => {
    try {
      const response = await fetch(
        `${SERVER_BASE_URL}/api/profile/updateDescription`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({userId, description: newDescription}),
        },
      );
      const data = await response.json();
      if (!data.success) {
        return thunkAPI.rejectWithValue(
          data.error || 'Failed to update description',
        );
      }
      return data.description as string;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.message || 'Error updating description',
      );
    }
  },
);

/**
 * Delete the current user's account.
 * The server will expect userId in the body since requireAuth was temporarily removed.
 * IMPORTANT: Proper authentication should be reinstated on the server for this endpoint.
 */
export const deleteAccountAction = createAsyncThunk<
  { success: boolean; message: string }, // Expected success response type
  string, // Argument type: userId
  { rejectValue: string } // Type for thunkAPI.rejectWithValue
>(
  'auth/deleteAccount',
  async (userId: string, thunkAPI) => {
    if (!userId) {
      return thunkAPI.rejectWithValue('User ID is required to delete account.');
    }
    try {
      console.log(`[AuthThunk deleteAccountAction] Attempting to delete account for userId: ${userId}`);
      const response = await fetch(
        `${SERVER_BASE_URL}/api/profile/delete-account`, // Corrected API path
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          // Since requireAuth is removed, server expects userId in body.
          // This is insecure and needs to be addressed by reinstating auth.
          body: JSON.stringify({ userId }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error('[AuthThunk deleteAccountAction] API error:', data.error || `HTTP error! status: ${response.status}`);
        return thunkAPI.rejectWithValue(
          data.error || `Failed to delete account. Status: ${response.status}`,
        );
      }
      console.log('[AuthThunk deleteAccountAction] Account deletion successful:', data);
      return data; // Should be { success: true, message: '...' }
    } catch (error: any) {
      console.error('[AuthThunk deleteAccountAction] Network or other error:', error);
      return thunkAPI.rejectWithValue(
        error.message || 'Network error during account deletion.',
      );
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(
      state,
      action: PayloadAction<{
        provider: 'privy' | 'dynamic' | 'turnkey' | 'mwa';
        address: string;
        profilePicUrl?: string;
        username?: string;
        description?: string;
      }>,
    ) {
      console.log('[AuthReducer] loginSuccess action received:', action.payload.provider, action.payload.address.substring(0, 8) + '...');
      
      // Preserve existing profile data if available and no new data provided
      state.provider = action.payload.provider;
      state.address = action.payload.address;
      state.isLoggedIn = true;
      
      // Only update these if they are provided or we don't have them
      if (action.payload.profilePicUrl || !state.profilePicUrl) {
        state.profilePicUrl = action.payload.profilePicUrl || state.profilePicUrl;
      }
      
      // For username: 
      // 1. Use provided username if available
      // 2. Keep existing username if we already have one
      // 3. Otherwise use first 6 chars of wallet address
      if (action.payload.username) {
        state.username = action.payload.username;
      } else if (!state.username && action.payload.address) {
        // Default username is first 6 characters of wallet address
        state.username = action.payload.address.substring(0, 6);
        console.log('[AuthReducer] Setting default username from wallet address:', state.username);
      }
      
      if (action.payload.description || !state.description) {
        state.description = action.payload.description || state.description;
      }
      
      console.log('[AuthReducer] Auth state updated, isLoggedIn set to:', state.isLoggedIn);
    },
    logoutSuccess(state) {
      console.log('[AuthReducer] logoutSuccess: Resetting state.');
      state.provider = null;
      state.address = null;
      state.isLoggedIn = false;
      state.profilePicUrl = null;
      state.username = null;
      state.description = null;
      console.log('[AuthReducer] State after logoutSuccess:', JSON.stringify(state));
    },
    updateProfilePic(state, action: PayloadAction<string>) {
      state.profilePicUrl = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchUserProfile.fulfilled, (state, action) => {
      const {
        profilePicUrl: fetchedProfilePicUrl,
        username: fetchedUsername,
        description: fetchedDescription,
      } = action.payload as any;

      // Get the userId that was requested as the argument to the thunk
      const requestedUserId = action.meta.arg;

      // Only update auth state if:
      // 1. We are logged in AND
      // 2. The requested user ID matches the current user's address
      if (state.isLoggedIn && 
          state.address && 
          requestedUserId && 
          requestedUserId.toLowerCase() === state.address.toLowerCase()) {
        state.profilePicUrl = fetchedProfilePicUrl || state.profilePicUrl;
        state.username = fetchedUsername || state.username;
        state.description = fetchedDescription || state.description;
      }
      // If the user IDs don't match, we don't update the auth state
      // This prevents other users' profiles from affecting the current user's profile
    });

    builder.addCase(updateUsername.fulfilled, (state, action) => {
      state.username = action.payload;
    });

    builder.addCase(updateDescription.fulfilled, (state, action) => {
      state.description = action.payload;
    });

    builder.addCase(deleteAccountAction.pending, (state) => {
      // Optional: Handle pending state, e.g., set a global loading flag if needed
      console.log('[AuthSlice] deleteAccountAction pending...');
    });
    builder.addCase(deleteAccountAction.fulfilled, (state, action) => {
      // On successful account deletion from the server, the client should logout.
      // The logoutSuccess reducer (called by useAuth().logout()) will clear user state.
      // No direct state changes here needed if logout handles it.
      console.log('[AuthSlice] deleteAccountAction fulfilled:', action.payload.message);
    });
    builder.addCase(deleteAccountAction.rejected, (state, action) => {
      // Optional: Handle rejected state, e.g., display a global error
      console.error('[AuthSlice] deleteAccountAction rejected:', action.payload || action.error.message);
    });
    
    // Add cases for createUserOnLogin
    builder.addCase(createUserOnLogin.fulfilled, (state, action) => {
      console.log('[AuthSlice] createUserOnLogin fulfilled:', action.payload);
      // We can update state with any additional user data returned from server if needed
    });
    builder.addCase(createUserOnLogin.rejected, (state, action) => {
      console.error('[AuthSlice] createUserOnLogin rejected:', action.payload || action.error.message);
      // Could handle error state here if needed
    });
    
    // Add cases for loginOrCreateUser
    builder.addCase(loginOrCreateUser.fulfilled, (state, action) => {
      console.log('[AuthSlice] loginOrCreateUser fulfilled:', action.payload);
      
      // Update auth state with user data
      state.provider = action.payload.provider;
      state.address = action.payload.address;
      state.isLoggedIn = true;
      state.username = action.payload.username || state.username || action.payload.address.substring(0, 6);
      
      // Only update if available from payload
      if (action.payload.profilePicUrl) {
        state.profilePicUrl = action.payload.profilePicUrl;
      }
      
      if (action.payload.description) {
        state.description = action.payload.description;
      }
      
      console.log('[AuthSlice] Auth state updated after login/create:', 
        state.isLoggedIn, state.username);
    });
    
    builder.addCase(loginOrCreateUser.rejected, (state, action) => {
      console.error('[AuthSlice] loginOrCreateUser rejected:', action.payload || action.error.message);
      // Reset login state on failure
      state.isLoggedIn = false;
    });
  },
});

export const {loginSuccess, logoutSuccess, updateProfilePic} =
  authSlice.actions;
export default authSlice.reducer;
