# Services

This directory contains service integrations and business logic implementations. Services handle external API calls, blockchain interactions, and other core functionality.

## Directory Structure

```
services/
├── walletProviders/        # Wallet integration services
│   ├── privy.ts          # Privy wallet integration
│   ├── dynamic.ts       # Dynamic wallet integration
│   └── turnkey.ts      # Turnkey wallet integration
├── pumpfun/             # Pump.fun integration services
│   ├── buy.ts         # Token purchase functionality
│   ├── sell.ts       # Token sale functionality
│   └── launch.ts    # Token launch functionality
├── tokenMill/         # Token mill services
│   ├── bondingCurve.ts  # Bonding curve operations
│   └── tokenOperations.ts # General token operations
└── api/              # API service implementations
```

## Service Categories

### Wallet Providers
Handles different wallet integration methods:
- **Privy**: Embedded wallet solution with social login
- **Dynamic**: External wallet connections
- **Turnkey**: Secure wallet management

### Token Services
- **Pump.fun Integration**:
  - Token buying and selling
  - Token launching
  - Price tracking
  - Portfolio management

- **Token Mill**:
  - Bonding curve configuration
  - Token creation and management
  - Price curve calculations
  - Transaction handling

### API Services
- External API integrations
- Data fetching and caching
- Error handling and retries
- Rate limiting

## Best Practices

1. **Error Handling**:
   - Use consistent error types
   - Implement proper error logging
   - Return meaningful error messages
   - Handle network errors gracefully
   - Implement retry mechanisms

2. **Type Safety**:
   - Define TypeScript interfaces for all service methods
   - Use proper return types
   - Document expected errors
   - Validate input parameters
   - Use strict type checking

3. **Configuration**:
   - Use environment variables for configuration
   - Keep sensitive data secure
   - Document required configuration
   - Support different environments
   - Implement configuration validation

4. **Testing**:
   - Mock external service calls
   - Test error conditions
   - Validate response handling
   - Test edge cases
   - Include integration tests

5. **Performance**:
   - Implement caching where appropriate
   - Use batch operations when possible
   - Optimize network requests
   - Handle rate limiting
   - Monitor service health

## Example Service Structure

```typescript
/**
 * Service interface definition
 */
export interface ServiceInterface {
  /** Method description */
  method1(param: string): Promise<Result>;
  /** Method description */
  method2(param: number): void;
}

/**
 * Service implementation
 * @class
 * @implements {ServiceInterface}
 */
export class Service implements ServiceInterface {
  private readonly config: Config;
  private readonly logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Method description
   * @param {string} param - Parameter description
   * @returns {Promise<Result>} - Return value description
   * @throws {ServiceError} - Error description
   */
  async method1(param: string): Promise<Result> {
    try {
      // Implementation
      return result;
    } catch (error) {
      this.logger.error('Method1 failed', { param, error });
      throw new ServiceError('Failed to execute method1', error);
    }
  }
}
```

## Adding New Services

1. Create a new service file or directory
2. Define the service interface
3. Implement the service
4. Add error handling
5. Write unit tests
6. Document the service
7. Add configuration options
8. Implement logging
9. Add monitoring
10. Test in different environments

## Security Considerations

- Never log sensitive information
- Use proper authentication
- Implement rate limiting
- Handle errors securely
- Use HTTPS for all external calls
- Validate all inputs
- Follow security best practices for wallet interactions
- Implement proper key management
- Use secure storage for sensitive data
- Monitor for suspicious activity

## Monitoring and Maintenance

- Implement health checks
- Add performance monitoring
- Track error rates
- Monitor API usage
- Implement circuit breakers
- Add service metrics
- Set up alerts
- Regular security audits
- Performance optimization
- Documentation updates

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