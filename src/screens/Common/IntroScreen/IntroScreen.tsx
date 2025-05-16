import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import COLORS from '@/assets/colors';
import Logo from '@/assets/svgs/logo.svg';
import { useSelector } from 'react-redux';
import { RootState } from '@/shared/state/store';

export default function IntroScreen() {
  const navigation = useAppNavigation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);

  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsCheckingAuth(true);
      
      // PRIORITIZE Redux state check first - fastest path for logged in users
      if (isLoggedIn) {
        console.log('User logged in according to Redux state, navigating to MainTabs');
        navigation.navigate('MainTabs' as never);
        setIsCheckingAuth(false);
        return;
      }
    };

    checkAuthStatus();
  }, [navigation, isLoggedIn]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="transparent" translucent={true} />
      <View style={styles.container}>
        <Logo width={250} height={120} />
        {isCheckingAuth && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.brandPrimary} style={styles.loader} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // Ensure background matches container
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  loader: {
    marginTop: 20,
  },
});
