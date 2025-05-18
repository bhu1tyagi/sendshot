import React, { useCallback, useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../../modules/walletProviders/hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icons from '../../../assets/svgs';
import COLORS from '@/assets/colors';
import { AppHeader } from '@/core/sharedUI';
import { RootState, AppDispatch } from '@/shared/state/store';
import { fetchUserTokens } from '@/shared/state/tokens/reducer';

// Launchpad modules
const modules = [
  {
    key: 'pumpfun',
    title: 'Pumpfun',
    subtitle: 'The OG Solana Launchpad',
    navigateTo: 'Pumpfun',
    iconImage: require('@/assets/images/Pumpfun_logo.png'),
    backgroundImage: require('@/assets/images/Pumpfun_bg.png'),
    usePngIcon: true,
    protocolType: 'pumpfun',
  },
  // {
  //   key: 'pumpswap',
  //   title: 'Pump Swap',
  //   description:
  //     'Swap tokens, add/remove liquidity, and create pools on the Solana blockchain.',
  //   backgroundColor: '#BBDEFB',
  //   navigateTo: 'PumpSwap',
  // },
  {
    key: 'launchlab',
    title: 'Launch Lab',
    subtitle: 'Launch Tokens via Rayduim',
    navigateTo: 'LaunchlabsScreen',
    iconComponent: Icons.RadyuimIcom,
    backgroundImage: require('@/assets/images/Rayduim_bg.png'),
    protocolType: 'raydium',
  },
  {
    key: 'tokenmill',
    title: 'Token Mill',
    subtitle: 'Launch tokens with customizable bonding curve',
    navigateTo: 'TokenMill',
    iconComponent: Icons.TokenMillIcon,
    backgroundImage: require('@/assets/images/TokenMill_bg.png'),
    protocolType: 'tokenmill',
  },
  {
    key: 'meteora',
    title: 'Meteora',
    subtitle: 'Powerful DEX with concentrated liquidity',
    navigateTo: 'MeteoraScreen',
    iconImage: require('@/assets/images/meteora.jpg'),
    backgroundImage: require('@/assets/images/new_meteora_cover.png'),
    usePngIcon: true,
    protocolType: 'meteora',
  },
];

// Define styles for the LaunchPads screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 16,
    marginLeft: 4,
    textAlign: 'center',
  },
  launchCard: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardBackground: {
    width: '100%',
    height: '100%',
  },
  cardFooter: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '75%',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.greyLight,
    marginTop: 2,
  },
  launchButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 8,
  },
  launchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  loginRequired: {
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.greyLight,
    marginTop: 20,
    marginBottom: 10,
  },
  loginButton: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 8,
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  }
});

// Android specific styles
const androidStyles = StyleSheet.create({
  safeArea: {
    paddingTop: 30,
  },
});

export default function ModuleScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoggedIn, address } = useSelector((state: RootState) => state.auth);
  const auth = useAuth();
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Fetch user tokens when logged in
  useEffect(() => {
    if (isLoggedIn && address) {
      dispatch(fetchUserTokens(address));
    }
  }, [isLoggedIn, address, dispatch]);

  const handlePress = useCallback((module: any) => {
    if (!isLoggedIn) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to launch a token.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Login Now", 
            onPress: () => handleLogin()
          }
        ]
      );
      return;
    }
    
    if (module.navigateTo) {
      // Store the protocol type in navigation params
      // Cast as any to fix navigation types
      navigation.navigate(module.navigateTo, {
        protocolType: module.protocolType
      } as any);
    }
  }, [navigation, isLoggedIn]);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      // Use the loginWithEmail method since we can see it's defined in useAuth.ts
      if (typeof auth.loginWithEmail === 'function') {
        await auth.loginWithEmail();
      } else {
        console.warn('Login method unavailable');
        Alert.alert('Login Unavailable', 'The login service is currently unavailable.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Login Failed', 'Could not complete the login process.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Render a launch card
  const renderLaunchCard = (module: any) => {
    const IconComponent = module.iconComponent;

    return (
      <View key={module.key} style={styles.launchCard}>
        <ImageBackground
          source={module.backgroundImage}
          style={styles.cardBackground}
          resizeMode="cover"
        >
          <BlurView
            intensity={45}
            tint="dark"
            style={styles.cardFooter}
          >
            <View style={styles.cardInfo}>
              <View style={styles.iconContainer}>
                {module.usePngIcon ? (
                  <Image
                    source={module.iconImage}
                    style={{ width: 32, height: 32 }}
                    resizeMode="contain"
                  />
                ) : module.key === 'launchlab' ? (
                  <IconComponent width={32} height={32} color="#F5C05E" />
                ) : (
                  <IconComponent width={32} height={32} color={COLORS.white} />
                )}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{module.title}</Text>
                <Text style={styles.cardSubtitle}>{module.subtitle}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.launchButton}
              onPress={() => handlePress(module)}
            >
              <Text style={styles.launchButtonText}>Launch</Text>
            </TouchableOpacity>
          </BlurView>
        </ImageBackground>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        Platform.OS === 'android' && androidStyles.safeArea,
      ]}>
      {/* Replace custom header with reusable AppHeader */}
      <AppHeader
        title="Launchpads"
        showBackButton={false}
        onBackPress={handleBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!isLoggedIn && (
          <>
            <Text style={styles.loginRequired}>
              Login to create and manage your tokens
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        
        {modules.map(module => renderLaunchCard(module))}
      </ScrollView>
    </SafeAreaView>
  );
}
