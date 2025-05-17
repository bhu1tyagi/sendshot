# State Management

This directory contains the Redux state management setup using Redux Toolkit. It follows a feature-based structure with each feature having its own slice of state.

## Directory Structure

```
state/
├── store.ts              # Redux store configuration
├── auth/                 # Authentication state
│   ├── reducer.ts       # Auth slice reducer
│   └── selectors.ts    # Auth state selectors
├── thread/             # Thread feature state
└── transaction/       # Transaction state
```

## State Organization

The application state is organized into feature slices:

- **auth**: Authentication state and user information
- **thread**: Social thread data and interactions
- **transaction**: Transaction history and status

## Best Practices

1. **State Structure**:
   - Keep state normalized
   - Avoid redundant data
   - Use proper TypeScript types
   - Document state shape

2. **Actions**:
   - Use Redux Toolkit's `createSlice`
   - Define action types clearly
   - Use meaningful action names
   - Document action payloads

3. **Selectors**:
   - Use memoized selectors with `createSelector`
   - Keep selectors focused
   - Document selector usage
   - Consider performance implications

4. **Side Effects**:
   - Use Redux Thunk for async operations
   - Handle errors properly
   - Document async flows
   - Test async behavior

## Example Slice Structure

```typescript
// types.ts
export interface FeatureState {
  data: Record<string, DataItem>;
  loading: boolean;
  error: string | null;
}

// slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: FeatureState = {
  data: {},
  loading: false,
  error: null,
};

const featureSlice = createSlice({
  name: 'feature',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    // ... more reducers
  },
});

// selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

export const selectFeatureData = (state: RootState) => state.feature.data;
```

## Using the Store

1. **Accessing State**:
```typescript
import { useSelector } from 'react-redux';
import { selectFeatureData } from './selectors';

const Component = () => {
  const data = useSelector(selectFeatureData);
  // ...
};
```

2. **Dispatching Actions**:
```typescript
import { useDispatch } from 'react-redux';
import { actions } from './slice';

const Component = () => {
  const dispatch = useDispatch();
  
  const handleAction = () => {
    dispatch(actions.setLoading(true));
  };
};
```

## Adding New State

1. Create a new directory for the feature
2. Define TypeScript interfaces
3. Create the slice with reducers
4. Add selectors
5. Add to root reducer
6. Document the new state

## Performance Considerations

- Use proper memoization
- Avoid unnecessary re-renders
- Keep state granular
- Use proper TypeScript types
- Consider using RTK Query for API calls

## Testing

- Test reducers
- Test selectors
- Test async operations
- Mock API calls
- Use proper test utilities

## Token Management System

The token management system allows users to create and track tokens across different protocols in the application. 

### Token Structure

The `tokens` state slice manages user-created tokens with the following structure:

```typescript
interface TokenData {
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
```

### State Structure

The tokens state is structured as follows:

```typescript
interface TokensState {
  userTokens: Record<string, TokenData[]>; // userId -> array of tokens
  allTokens: TokenData[];
  loading: boolean;
  error: string | null;
}
```

### API Actions

The following actions are available to interact with the token state:

- `fetchUserTokens(userId: string)` - Fetches all tokens created by a specific user
- `fetchAllTokens()` - Fetches all tokens in the system
- `createToken(tokenData: Omit<TokenData, 'id' | 'createdAt'>)` - Creates a new token
- `updateToken({ tokenId, updates })` - Updates an existing token

### Usage Examples

**Fetch user tokens:**

```typescript
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserTokens } from '@/shared/state/tokens';
import { RootState } from '@/shared/state/store';

// In your component
const { address } = useSelector((state: RootState) => state.auth);
const dispatch = useDispatch();

useEffect(() => {
  if (address) {
    dispatch(fetchUserTokens(address));
  }
}, [address, dispatch]);
```

**Create a new token:**

```typescript
import { createToken } from '@/shared/state/tokens';
import { useDispatch } from 'react-redux';

// In your component
const dispatch = useDispatch();

const handleCreateToken = () => {
  dispatch(createToken({
    address: '0x123...',
    name: 'My Token',
    symbol: 'MTK',
    creatorId: address,
    initialPrice: 0.01,
    totalSupply: '1000000',
    protocolType: 'pumpfun'
  }));
};
```

### Database Schema

The tokens are stored in the database with the following schema:

```sql
CREATE TABLE tokens (
  id UUID PRIMARY KEY,
  address TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  logo_uri TEXT,
  creator_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  initial_price DECIMAL NOT NULL,
  current_price DECIMAL,
  price_change_24h DECIMAL,
  total_supply TEXT NOT NULL,
  holders INTEGER,
  protocol_type TEXT NOT NULL
);
``` 