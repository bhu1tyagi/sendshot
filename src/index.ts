// File: src/index.ts

export * from './config';
export {CustomizationProvider, useCustomization} from './config/CustomizationProvider';

// Export Redux store slices (optional: or let users combine them themselves)
export {store} from './shared/state/store';
export type {RootState, AppDispatch} from './shared/state/store';

// Export Hooks
export {useAuth} from './modules/walletProviders/hooks/useAuth';
export {useAppSelector, useAppDispatch} from './shared/hooks/useReduxHooks';

// Export Services or Providers

// Export Components
export * from './core/thread/components';
export * from './core/sharedUI/TradeCard';

// Export transaction utilities (if needed)
export {sendPriorityTransaction} from './shared/services/transactions/sendPriorityTx';
export {sendJitoBundleTransaction} from './shared/services/transactions/sendJitoBundleTx';

// Export modules
export * from './modules/tokenMill';
export * from './modules/pumpFun';

// Use the routes
app.use('/api/pumpfun', launchRouter);
app.use('/api/raydium/launchpad', raydiumLaunchpadRoutes);
app.use('/api/pump-swap', pumpSwapRouter);
app.use('/api/tokens', tokenRoutes);
app.use('/api/meteora', meteoraDBCRouter);
app.use('/api/users', userRoutes);
app.use('/api', tokenMillRouter);