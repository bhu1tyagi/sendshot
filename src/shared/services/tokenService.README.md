# Token Service

This service provides a centralized way to create and manage tokens across all launch protocols in the app. It ensures that tokens are properly stored in both the database and Redux state.

## Usage

When a new token is created on-chain through any of the supported protocols (PumpFun, Raydium, TokenMill, Meteora), you should use the corresponding token integration service to register it in our system.

### Example Usage

```typescript
// For PumpFun tokens
import { registerPumpfunToken } from '@/modules/pumpFun';

// After successfully creating a token on-chain
const success = await registerPumpfunToken({
  address: "tokenAddress123",
  name: "My Token",
  symbol: "MTK",
  creatorId: "userId123",
  initialPrice: 0.01,
  totalSupply: "1000000",
  // other token properties...
});

// For Raydium tokens
import { registerRaydiumToken } from '@/modules/raydium';

// For TokenMill tokens
import { registerTokenMillToken } from '@/modules/tokenMill';

// For Meteora tokens
import { registerMeteoraToken } from '@/modules/meteora/services/tokenIntegration';
```

## Implementation Details

1. Each protocol has its own token integration service that adds the appropriate protocol type.
2. The central token service handles:
   - Saving the token to the database via API
   - Updating the Redux store
   - Displaying success/error notifications
   - Ensuring the UI is only updated after the database operation succeeds

## Data Flow

1. Token is created on-chain through a protocol (PumpFun, Raydium, etc.)
2. Protocol-specific integration service is called with token data
3. Token data is sent to the server API
4. After successful database storage, the Redux state is updated
5. UI components reflect the changes by reading from Redux

This approach ensures consistent token management across all protocols and proper synchronization between the database and UI. 