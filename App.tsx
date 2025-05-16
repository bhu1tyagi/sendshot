import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/shared/navigation/RootNavigator';
import { navigationRef } from './src/shared/hooks/useAppNavigation';
import { store, persistor } from './src/shared/state/store';
import './src/shared/utils/polyfills';
import COLORS from './src/assets/colors';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';

import { PrivyProvider, PrivyElements } from '@privy-io/expo';

// Dynamic client initialization
import { CustomizationProvider } from './src/config/CustomizationProvider';
import { DefaultCustomizationConfig } from './src/config';
import TransactionNotification from './src/core/sharedUI/TransactionNotification';

// Loading component for PersistGate
const PersistLoading = () => (
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.background,
    }}>
    <ActivityIndicator size="large" color={COLORS.brandPrimary} />
  </View>
);

export default function App() {
  const config = DefaultCustomizationConfig;

  const GlobalUIElements = () => (
    <>
      <TransactionNotification />
    </>
  );

  // Wrap the app with EnvErrorProvider for global env variable error handling
  return (
    <CustomizationProvider config={config}>
      <SafeAreaProvider>
        <StatusBar backgroundColor={COLORS.background} barStyle="light-content" translucent={true} />
        <ReduxProvider store={store}>
          <PersistGate loading={<PersistLoading />} persistor={persistor}>
            <View style={{ flex: 1, backgroundColor: COLORS.background }}>
              <PrivyProvider
                appId={config.auth.privy.appId}
                clientId={config.auth.privy.clientId}
                config={{
                  embedded: {
                    solana: {
                      createOnLogin: 'users-without-wallets',
                    },
                  },
                }}>
                <NavigationContainer ref={navigationRef}>
                  <RootNavigator />
                </NavigationContainer>
                <GlobalUIElements />
                <PrivyElements />
              </PrivyProvider>
            </View>
          </PersistGate>
        </ReduxProvider>
      </SafeAreaProvider>
    </CustomizationProvider>
  );
}
