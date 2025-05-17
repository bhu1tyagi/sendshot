import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import MainTabs from './MainTabs';
import { PumpfunScreen, PumpSwapScreen } from '@/modules/pumpFun';
import { TokenMillScreen } from '@/modules/tokenMill';
import { MeteoraScreen } from '@/modules/meteora';
import LaunchlabsScreen from '@/modules/raydium/screens/LaunchlabsScreen';
import IntroScreen from '@/screens/Common/IntroScreen/IntroScreen';
import LoginScreen from '@/screens/Common/LoginScreen/LoginScreen';
import SwapScreen from '@/screens/SampleUI/Swap/SwapScreen';
import { WalletScreen } from '@/screens/Common';
import OnrampScreen from '@/modules/moonpay/screens/OnrampScreen';
import { TokenInfo } from '@/modules/dataModule';
import WebViewScreen from '@/screens/Common/WebViewScreen';
import DeleteAccountConfirmationScreen from '@/screens/Common/DeleteAccountConfirmationScreen';

export type RootStackParamList = {
  IntroScreen: undefined;
  LoginOptions: undefined;
  MainTabs: undefined;
  CoinDetailPage: undefined;
  Blink: undefined;
  Pumpfun: undefined;
  TokenMill: undefined;
  NftScreen: undefined;
  ChatListScreen: undefined;
  ChatScreen: {
    chatId: string;
    chatName: string;
    isGroup: boolean;
  };
  UserSelectionScreen: undefined;
  PumpSwap: undefined;
  MercuroScreen: undefined;
  LaunchlabsScreen: undefined;
  MeteoraScreen: undefined;
  OtherProfile: { userId: string };
  PostThread: { postId: string };
  FollowersFollowingList: undefined;
  ProfileScreen: undefined;
  WalletScreen: {
    walletAddress?: string;
    walletBalance?: string;
  };
  OnrampScreen: undefined;
  WebViewScreen: { uri: string; title: string };
  DeleteAccountConfirmationScreen: undefined;
  SwapScreen: {
    inputToken?: Partial<TokenInfo>;
    outputToken?: {
      address: string;
      symbol: string;
      mint?: string;
      logoURI?: string;
      name?: string;
    };
    inputAmount?: string;
    shouldInitialize?: boolean;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  console.log('[RootNavigator] Rendering with isLoggedIn:', isLoggedIn);
  
  // Render both auth and non-auth screens, but separate them
  const renderScreens = () => {
    return (
      <>
        {/* Common screens for both logged-in and logged-out users */}
        <Stack.Screen name="IntroScreen" component={IntroScreen} />
        
        {/* Auth screens */}
        <Stack.Screen name="LoginOptions" component={LoginScreen} />
        
        {/* Main app screens */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Pumpfun" component={PumpfunScreen} />
        <Stack.Screen name="TokenMill" component={TokenMillScreen} />
        <Stack.Screen name="PumpSwap" component={PumpSwapScreen} />
        <Stack.Screen name="LaunchlabsScreen" component={LaunchlabsScreen} />
        <Stack.Screen name="MeteoraScreen" component={MeteoraScreen} />
        <Stack.Screen name="WalletScreen" component={WalletScreen} />
        <Stack.Screen name="OnrampScreen" component={OnrampScreen} />
        <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
        <Stack.Screen name="DeleteAccountConfirmationScreen" component={DeleteAccountConfirmationScreen} />
        <Stack.Screen name="SwapScreen" component={SwapScreen} />
      </>
    );
  };

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      // Always start with IntroScreen, it will handle navigation based on auth state
      initialRouteName="IntroScreen"
    >
      {renderScreens()}
    </Stack.Navigator>
  );
}
