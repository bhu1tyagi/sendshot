import {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {loginSuccess, logoutSuccess, createUserOnLogin} from '../../../shared/state/auth/reducer';
import {usePrivyWalletLogic} from '../services/walletProviders/privy';
import {useCustomization} from '../../../config/CustomizationProvider';
import {useAppNavigation} from '../../../shared/hooks/useAppNavigation';
import {useAppSelector, useAppDispatch} from '../../../shared/hooks/useReduxHooks';
import {useLoginWithOAuth} from '@privy-io/expo';
import { StandardWallet } from '../types';
import { AnyAction } from '@reduxjs/toolkit';
import { AppDispatch } from '../../../shared/state/store';

/**
 * Summarized usage:
 *  1) Read which provider is set from config.
 *  2) If 'privy', we handle via `usePrivyWalletLogic`.
 *  3) If 'dynamic', we handle via `useDynamicWalletLogic`.
 *  4) If 'turnkey', we handle via `useTurnkeyWalletLogic`.
 */
export function useAuth() {
  const {auth: authConfig} = useCustomization();
  const selectedProvider = authConfig.provider;
  const dispatch = useAppDispatch();
  const navigation = useAppNavigation();
  const authState = useAppSelector(state => state.auth);

  // Get wallet address and provider from Redux state
  const storedAddress = authState.address;
  const storedProvider = authState.provider;

  /** PRIVY CASE */
  if (selectedProvider === 'privy') {
    const {
      handlePrivyLogin,
      handlePrivyLogout,
      monitorSolanaWallet,
      user,
      solanaWallet,
    } = usePrivyWalletLogic();
    
    // Get the direct Privy OAuth login hook
    const {login: loginWithOAuth} = useLoginWithOAuth();

    // Create a standardized wallet object for Privy
    const standardWallet: StandardWallet | null = solanaWallet?.wallets?.[0] ? {
      provider: 'privy',
      address: solanaWallet.wallets[0].publicKey,
      publicKey: solanaWallet.wallets[0].publicKey,
      rawWallet: solanaWallet.wallets[0],
      getWalletInfo: () => ({
        walletType: 'Privy',
        address: solanaWallet.wallets?.[0]?.publicKey || null,
      }),
      getProvider: async () => {
        if (solanaWallet?.getProvider) {
          return solanaWallet.getProvider();
        }
        throw new Error('Privy wallet provider not available');
      },
    } : null;

    const loginWithGoogle = useCallback(async () => {
      try {
        // Use direct OAuth login instead of handlePrivyLogin
        const result = await loginWithOAuth({ provider: 'google' });
        console.log('[useAuth] OAuth login result:', result);
        
        console.log('[useAuth] Starting Solana wallet monitoring after successful login');
        
        // First try creating the wallet explicitly
        if (solanaWallet && typeof solanaWallet.create === 'function') {
          try {
            console.log('[useAuth] Attempting direct wallet creation first');
            const createResult = await solanaWallet.create();
            console.log('[useAuth] Direct wallet creation result:', createResult);
          } catch (createError) {
            console.log('[useAuth] Direct wallet creation failed (may already exist):', createError);
          }
        }
        
        // Continue monitoring the wallet after login
        await monitorSolanaWallet({
          selectedProvider: 'privy',
          setStatusMessage: (msg) => {
            console.log('[useAuth] Wallet status:', msg);
          },
          onWalletConnected: info => {
            console.log('[useAuth] Wallet connected:', info);
            // Set initial username from the wallet address when logging in
            const initialUsername = info.address.substring(0, 6);
            console.log('[useAuth] Setting initial username:', initialUsername);
            
            // Dispatch login action to update Redux state
            dispatch(loginSuccess({
              provider: 'privy', 
              address: info.address,
              username: initialUsername
            }));
            
            // Also create/update user in database
            dispatch(createUserOnLogin({
              userId: info.address,
              username: initialUsername,
              provider: 'privy'
            }));
            
            // REMOVED: navigation.navigate('MainTabs');
            // Let Redux state change handle navigation
          },
        });
      } catch (error) {
        console.error('[useAuth] Google login error:', error);
      }
    }, [loginWithOAuth, monitorSolanaWallet, solanaWallet, dispatch]);

    const loginWithApple = useCallback(async () => {
      try {
        console.log('[useAuth] Starting Apple login process...');
        // Use direct OAuth login with proper error handling
        const result = await loginWithOAuth({ 
          provider: 'apple',
          // Don't pass isLegacyAppleIosBehaviorEnabled to use native flow
        });
        
        console.log('[useAuth] Apple OAuth login result:', result);
        
        // Check if we have a valid authentication result before proceeding
        if (!result) {
          console.error('[useAuth] Apple authentication failed - no result returned');
          throw new Error('Apple authentication failed to complete');
        }
        
        console.log('[useAuth] Starting Solana wallet monitoring after successful login');
        
        // First try creating the wallet explicitly
        if (solanaWallet && typeof solanaWallet.create === 'function') {
          try {
            console.log('[useAuth] Attempting direct wallet creation first');
            const createResult = await solanaWallet.create();
            console.log('[useAuth] Direct wallet creation result:', createResult);
          } catch (createError) {
            console.log('[useAuth] Direct wallet creation failed (may already exist):', createError);
          }
        }
        
        // Continue monitoring the wallet after login
        await monitorSolanaWallet({
          selectedProvider: 'privy',
          setStatusMessage: (msg) => {
            console.log('[useAuth] Wallet status:', msg);
          },
          onWalletConnected: info => {
            console.log('[useAuth] Wallet connected:', info);
            // Set initial username from the wallet address when logging in
            const initialUsername = info.address.substring(0, 6);
            console.log('[useAuth] Setting initial username:', initialUsername);
            
            // Dispatch login action to update Redux state
            dispatch(loginSuccess({
              provider: 'privy', 
              address: info.address,
              username: initialUsername
            }));
            
            // Also create/update user in database
            dispatch(createUserOnLogin({
              userId: info.address,
              username: initialUsername,
              provider: 'privy'
            }));
            
            // REMOVED: navigation.navigate('MainTabs');
            // Let Redux state change handle navigation
          },
        });
      } catch (error) {
        console.error('[useAuth] Apple login error:', error);
        throw error; // Re-throw to allow component-level error handling
      }
    }, [loginWithOAuth, monitorSolanaWallet, solanaWallet, dispatch]);

    const loginWithEmail = useCallback(async () => {
      try {
        console.log('[useAuth] Starting email login process...');
        if (handlePrivyLogin) {
          await handlePrivyLogin({
            loginMethod: 'email',
            setStatusMessage: (msg) => {
              console.log('[useAuth] Auth status:', msg);
            }
          });
          
          console.log('[useAuth] Email auth successful, starting wallet monitoring...');
          await monitorSolanaWallet({
            selectedProvider: 'privy',
            setStatusMessage: (msg) => {
              console.log('[useAuth] Wallet status:', msg);
            },
            onWalletConnected: info => {
              console.log('[useAuth] Wallet connected successfully:', info);
              // Set initial username from the wallet address when logging in
              const initialUsername = info.address.substring(0, 6);
              console.log('[useAuth] Setting initial username:', initialUsername);
              
              // Dispatch login action to update Redux state
              dispatch(loginSuccess({
                provider: 'privy', 
                address: info.address,
                username: initialUsername
              }));
              
              // Also create/update user in database
              dispatch(createUserOnLogin({
                userId: info.address,
                username: initialUsername,
                provider: 'privy'
              }));
              
              // REMOVED: navigation.navigate('MainTabs');
              // Let Redux state change handle navigation
            },
          });
        } else {
          throw new Error('Email login not available');
        }
      } catch (error) {
        console.error('[useAuth] Email login error:', error);
        throw error; // Re-throw to allow component-level error handling
      }
    }, [handlePrivyLogin, monitorSolanaWallet, dispatch]);

    const logout = useCallback(async () => {
      console.log('[useAuth] Attempting Privy logout...');
      try {
        // Wrap the SDK call in a try/catch
        try {
          await handlePrivyLogout(() => {});
          console.log('[useAuth] Privy SDK logout successful.');
        } catch (sdkError) {
          console.error('[useAuth] Error during Privy SDK logout (continuing anyway):', sdkError);
          // Continue with Redux state cleanup even if SDK logout fails
        }
        
        // Always clean up Redux state
        console.log('[useAuth] Dispatching logoutSuccess.');
        dispatch(logoutSuccess());
        console.log('[useAuth] Redux logout dispatched. Resetting navigation.');
        
        // Use setTimeout to allow React to process state changes before navigation
        setTimeout(() => {
          try {
            // Reset navigation to the initial route of the logged-out stack
            navigation.reset({
              index: 0,
              routes: [{ name: 'IntroScreen' }],
            });
          } catch (navError) {
            console.error('[useAuth] Error during navigation reset:', navError);
          }
        }, 50);
      } catch (error) {
        console.error('[useAuth] Error during Privy logout:', error);
      }
    }, [handlePrivyLogout, dispatch, navigation]);

    return {
      status: '',
      loginWithGoogle,
      loginWithApple,
      loginWithEmail,
      logout,
      user,
      solanaWallet, // Keep for backward compatibility
      wallet: standardWallet, // Add standardized wallet
    };
  }

  // ADDED: If we're here, check for MWA wallet in Redux state
  if (storedProvider === 'mwa' && storedAddress) {
    console.log('[useAuth] Using MWA logic.');
    // Create standardized wallet object for MWA
    const mwaWallet: StandardWallet = {
      provider: 'mwa',
      address: storedAddress,
      publicKey: storedAddress,
      rawWallet: { address: storedAddress },
      getWalletInfo: () => ({
        walletType: 'MWA',
        address: storedAddress,
      }),
      // For MWA, we don't have a provider as transactions are handled by the Phantom app
      getProvider: async () => {
        // Throw error with useful message about MWA not having a provider
        throw new Error('MWA uses external wallet for signing. This is expected behavior.');
      }
    };

    // Create a solanaWallet object for backward compatibility
    const solanaWallet = {
      wallets: [{
        publicKey: storedAddress,
        address: storedAddress
      }],
      // Same behavior as the standardized wallet
      getProvider: mwaWallet.getProvider
    };

    const logout = useCallback(async () => {
      console.log('[useAuth] Attempting MWA logout (dispatching Redux action only)...');
      try {
        // For MWA, just clean up Redux state since there's no SDK to log out from
        console.log('[useAuth] Dispatching logoutSuccess for MWA.');
        dispatch(logoutSuccess());
        console.log('[useAuth] Redux logout dispatched for MWA. Resetting navigation.');
        
        // Use setTimeout to allow React to process state changes before navigation
        setTimeout(() => {
          try {
            // Reset navigation to the initial route of the logged-out stack
            navigation.reset({
              index: 0,
              routes: [{ name: 'IntroScreen' }],
            });
          } catch (navError) {
            console.error('[useAuth] Error during navigation reset:', navError);
          }
        }, 50);
      } catch (error) {
        console.error('[useAuth] Error during MWA logout dispatch:', error);
      }
    }, [dispatch, navigation]);

    return {
      status: 'authenticated',
      logout,
      user: { id: storedAddress },
      solanaWallet,
      wallet: mwaWallet,
    };
  }

  // If no recognized provider, just return empties with complete API signature
  console.warn('[useAuth] No recognized provider found or MWA not stored. Returning empty auth methods.');
  
  const safeLogout = async () => { 
    console.warn('[useAuth] Logout called but no provider active.');
    // Still dispatch logout action to ensure clean state
    dispatch(logoutSuccess());
    // Navigate to intro screen for safety
    setTimeout(() => {
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'IntroScreen' }],
        });
      } catch (navError) {
        console.error('[useAuth] Error during navigation reset:', navError);
      }
    }, 50);
  };
  
  // Create a complete empty interface with all methods that
  // could be called from any component
  return {
    status: '', 
    logout: safeLogout,
    // Auth methods
    loginWithGoogle: async () => {},
    loginWithApple: async () => {},
    loginWithEmail: async () => {},
    loginWithSMS: async () => {},
    initEmailOtpLogin: async () => {},
    verifyEmailOtp: async () => {},
    // Data
    user: null,
    solanaWallet: null,
    wallet: null,
    // State
    loading: false,
    otpResponse: null,
    isAuthenticated: false,
    connected: false
  };
}
