/**
 * PumpFun Module
 * 
 * This module provides components and utilities for interacting with the Pump.fun platform,
 * allowing users to buy, sell, and launch tokens through a user-friendly interface.
 */

import { PumpSwapScreen } from './screens';
import { PumpSwapNavigator } from './navigation';
import * as PumpSwapServices from './services/pumpSwapService';
import * as PumpSwapUtils from './utils/pumpSwapUtils';

// Components
export { default as PumpfunBuySection } from './components/PumpfunBuySection';
export { default as PumpfunSellSection } from './components/PumpfunSellSection';
export { default as PumpfunLaunchSection } from './components/PumpfunLaunchSection';
export { default as PumpfunCard } from './components/PumpfunCard';
export { SwapSection as PumpSwapSection } from './components/pumpSwap';

// Screens
export { default as PumpfunScreen } from './screens/pumpfunScreen';
export { PumpSwapScreen };

// Hooks
export { usePumpFun } from './hooks/usePumpFun';

// Services
export {
  buyTokenViaPumpfun,
  sellTokenViaPumpfun,
  createAndBuyTokenViaPumpfun,
} from './services/pumpfunService';
export { PumpSwapServices };
export { registerPumpfunToken } from './services/tokenIntegration';

// Utils
export {
  getProvider,
  checkIfTokenIsOnRaydium,
  getSwapFee,
  getSwapQuote as getRaydiumSwapQuote,
  getSwapTransaction,
  parseRaydiumVersionedTransaction,
  buildPumpFunBuyTransaction,
  buildPumpFunSellTransaction,
  RAYDIUM_SOL_MINT,
} from './utils/pumpfunUtils';
export { PumpSwapUtils };

// Types
export * from './types';

// Navigation
export { PumpSwapNavigator };
