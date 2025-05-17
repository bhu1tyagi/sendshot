import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppNavigation } from '@/shared/hooks/useAppNavigation';
import COLORS from '@/assets/colors';
import Logo from '@/assets/svgs/logo.svg';
import { useSelector } from 'react-redux';
import { RootState } from '@/shared/state/store';

export default function IntroScreen() {
  console.log('[IntroScreen] Component mounted');
  
  const navigation = useAppNavigation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const hasNavigated = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0.7)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Start animation effect
  useEffect(() => {
    console.log('[IntroScreen] Animation effect setup');
    // Create animation sequence for pulse effect
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    console.log('[IntroScreen] Auth check effect triggered, isLoggedIn:', isLoggedIn);
    
    const checkAuthStatus = async () => {
      // Prevent navigation from being triggered multiple times
      if (hasNavigated.current) {
        console.log('[IntroScreen] Navigation already happened, skipping');
        return;
      }
      
      setIsCheckingAuth(true);
      console.log('[IntroScreen] Starting timer for navigation delay');
      
      // Clear any existing timer to prevent multiple timers
      if (timerRef.current) {
        console.log('[IntroScreen] Clearing existing timer');
        clearTimeout(timerRef.current);
      }
      
      // Always show the animation for a consistent period of time
      timerRef.current = setTimeout(() => {
        console.log('[IntroScreen] Timer fired, ready to navigate');
        
        if (hasNavigated.current) {
          console.log('[IntroScreen] Navigation already happened inside timer, skipping');
          return;
        }
        
        hasNavigated.current = true;
        
        if (isLoggedIn) {
          console.log('[IntroScreen] User logged in, resetting navigation to MainTabs');
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        } else {
          console.log('[IntroScreen] User not logged in, resetting navigation to LoginOptions');
          navigation.reset({
            index: 0,
            routes: [{ name: 'LoginOptions' }],
          });
        }
        
        setIsCheckingAuth(false);
      }, 2500);
    };

    checkAuthStatus();
    
    // Cleanup function to handle unmounting
    return () => {
      console.log('[IntroScreen] Cleanup - component unmounting');
      hasNavigated.current = true; // Prevent navigation if component unmounts
      if (timerRef.current) {
        console.log('[IntroScreen] Clearing timer on unmount');
        clearTimeout(timerRef.current);
      }
    };
  }, [navigation, isLoggedIn]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="transparent" translucent={true} />
      <View style={styles.container}>
        {/* Animated Logo Component */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Logo width={250} height={120} />
        </Animated.View>
        
        {/* Debug text - remove in production */}
        <Text style={styles.debugText}>
          {isLoggedIn ? 'Logged In' : 'Not Logged In'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  debugText: {
    position: 'absolute',
    bottom: 40,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
});
