import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Clipboard,
  Platform,
  StatusBar,
  Animated,
  Easing,
  ActivityIndicator,
  RefreshControl,
  ViewStyle,
  StyleProp,
  StyleSheet,
  Alert,
  DimensionValue,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {Connection, PublicKey} from '@solana/web3.js';
import {HELIUS_STAKED_URL} from '@env';
import {useWallet} from '@/modules/walletProviders/hooks/useWallet';
import {useAuth} from '@/modules/walletProviders/hooks/useAuth';
import COLORS from '@/assets/colors';
import Icons from '@/assets/svgs';
import AppHeader from '@/core/sharedUI/AppHeader';
import {styles} from './WalletScreen.style';
import {RootStackParamList} from '@/shared/navigation/RootNavigator';
import {StackNavigationProp} from '@react-navigation/stack';
import TransferBalanceButton from '@/modules/walletProviders/components/transferBalanceButton';

const SOL_DECIMAL = 1000000000; // 1 SOL = 10^9 lamports

// Component to show a skeleton loading line
interface SkeletonLineProps {
  width: number | DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

function SkeletonLine({
  width,
  height = 20,
  style,
  borderRadius,
}: SkeletonLineProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 750,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: COLORS.lighterBackground,
          borderRadius: borderRadius || height / 2,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Component to show a skeleton card with shimmer effect
interface SkeletonCardProps {
  width: number | DimensionValue;
  height: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  children?: React.ReactNode;
}

function SkeletonCard({
  width,
  height,
  style,
  borderRadius = 12,
  children,
}: SkeletonCardProps) {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [
      -Number(typeof width === 'number' ? width : 300),
      Number(typeof width === 'number' ? width : 300),
    ],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: COLORS.lighterBackground,
          borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}>
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          transform: [{translateX}],
        }}
      />
      {children}
    </View>
  );
}

// Component for skeleton button
interface SkeletonButtonProps {
  width?: number | DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

function SkeletonButton({
  width = '100%',
  height = 56,
  style,
}: SkeletonButtonProps) {
  return (
    <SkeletonCard
      width={width}
      height={height}
      borderRadius={12}
      style={style}
    />
  );
}

// Additional styles for the skeleton components
const skeletonStyles = StyleSheet.create({
  addressCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingIndicatorContainer: {
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonCopyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function WalletScreenSkeleton({insets}: {insets: any}) {
  // Animation for shimmer effect
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmerAnim]);

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <AppHeader title="Wallet" showDefaultRightIcons={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {paddingBottom: insets.bottom > 0 ? insets.bottom : 16},
        ]}>
        {/* Wallet Balance Skeleton */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <SkeletonLine width={150} height={40} style={{marginTop: 8}} />
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}>
              <View
                style={[
                  styles.loadingIconContainer,
                  {backgroundColor: 'rgba(0, 122, 255, 0.1)'},
                ]}>
                <Icons.walletIcon
                  width={24}
                  height={24}
                  color={COLORS.brandBlue}
                />
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Wallet Address Skeleton */}
        <View style={[styles.addressContainer, {marginTop: 24}]}>
          <Text style={styles.addressLabel}>Wallet Address</Text>
          <SkeletonCard width="100%" height={56} style={{marginTop: 8}}>
            <View style={skeletonStyles.addressCardContent}>
              <SkeletonLine
                width="70%"
                height={18}
                style={{marginVertical: 8}}
              />
              <View style={skeletonStyles.skeletonCopyButton}>
                <Icons.copyIcon width={16} height={16} color={COLORS.white} />
              </View>
            </View>
          </SkeletonCard>
        </View>

        {/* Actions Skeleton */}
        <View style={[styles.actionsContainer, {marginTop: 24}]}>
          <Text style={styles.actionsLabel}>Actions</Text>

          {/* Add Funds Button Skeleton */}
          <View style={[styles.actionButton, {marginTop: 12}]}>
            <View
              style={[
                styles.actionIconContainer,
                {backgroundColor: COLORS.brandBlue},
              ]}>
              <Icons.AddFundsIcon width={24} height={24} color={COLORS.white} />
              <View style={styles.plusOverlayContainer}>
                <Icons.PlusCircleIcon
                  width={16}
                  height={16}
                  color={COLORS.brandGreen}
                />
              </View>
            </View>
            <View style={styles.actionTextContainer}>
              <SkeletonLine width={80} height={18} style={{marginBottom: 8}} />
              <SkeletonLine width="80%" height={14} />
            </View>
            <SkeletonCard width={70} height={24} borderRadius={12} />
          </View>

          {/* Send Funds Button Skeleton */}
          <View style={[styles.actionButton, {marginTop: 12}]}>
            <View
              style={[
                styles.actionIconContainer,
                {backgroundColor: COLORS.brandGreen},
              ]}>
              <Icons.SendFundsIcon
                width={24}
                height={24}
                color={COLORS.white}
              />
            </View>
            <View style={styles.actionTextContainer}>
              <SkeletonLine width={90} height={18} style={{marginBottom: 8}} />
              <SkeletonLine width="85%" height={14} />
            </View>
            <SkeletonCard width={70} height={24} borderRadius={12} />
          </View>

          {/* Logout Button Skeleton */}
          <View style={[styles.actionButton, {marginTop: 12}]}>
            <View
              style={[
                styles.actionIconContainer,
                {backgroundColor: COLORS.errorRed},
              ]}>
              <Icons.LogoutIcon width={24} height={24} color={COLORS.white} />
            </View>
            <View style={styles.actionTextContainer}>
              <SkeletonLine width={70} height={18} style={{marginBottom: 8}} />
              <SkeletonLine width="75%" height={14} />
            </View>
          </View>
        </View>

        {/* Legal Links Section Skeleton */}
        <View style={[styles.legalLinksContainer, {marginTop: 32}]}>
          <View style={styles.legalLinkButton}>
            <SkeletonLine width={100} height={16} />
            <SkeletonLine width={16} height={16} style={{borderRadius: 8}} />
          </View>

          <View style={styles.separator} />

          <View style={styles.legalLinkButton}>
            <SkeletonLine width={130} height={16} />
            <SkeletonLine width={16} height={16} style={{borderRadius: 8}} />
          </View>
        </View>

        <View style={skeletonStyles.loadingIndicatorContainer}>
          <SkeletonLine
            width={200}
            height={20}
            style={{alignSelf: 'center', marginBottom: 12}}
          />
          <View style={styles.loadingDotsContainer}>
            <Animated.View
              style={[
                styles.loadingDot,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.3, 0.6, 1],
                    outputRange: [0.3, 1, 0.3, 0.3],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.loadingDot,
                {
                  marginHorizontal: 4,
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.3, 0.6, 1],
                    outputRange: [0.3, 0.3, 1, 0.3],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.loadingDot,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.3, 0.6, 1],
                    outputRange: [0.3, 0.3, 0.3, 1],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

interface WalletScreenProps {
  /**
   * Function to handle on-ramp (add funds) action
   */
  onOnrampPress?: () => void;

  /**
   * Callback for refresh action
   */
  onRefresh?: () => void;

  /**
   * Whether the wallet data is currently refreshing
   */
  refreshing?: boolean;
}

/**
 * WalletScreen component to display wallet information and actions
 */
function WalletScreen({
  onOnrampPress,
  onRefresh,
  refreshing,
}: WalletScreenProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [copied, setCopied] = useState(false);
  const {logout} = useAuth();
  const [sendModalVisible, setSendModalVisible] = useState(false);

  // Use the wallet hook to get the address
  const {address} = useWallet();
  const walletAddress = address;

  // State for balance and loading
  const [nativeBalance, setNativeBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation for loading spinner
  const spinValue = useRef(new Animated.Value(0)).current;

  // Start spinner animation
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [loading, spinValue]);

  // Interpolate for spin animation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Format wallet balance for display
  const walletBalance =
    nativeBalance !== null
      ? `${(nativeBalance / SOL_DECIMAL).toFixed(4)} SOL`
      : '0.00 SOL';

  // Function to fetch balance
  const fetchBalance = async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create a connection to the Solana cluster
      const connection = new Connection(HELIUS_STAKED_URL, 'confirmed');

      // Get the wallet public key
      const publicKey = new PublicKey(walletAddress);

      // Fetch the balance
      const balance = await connection.getBalance(publicKey);
      console.log('balance', balance);
      console.log('[WalletScreen] SOL balance in lamports:', balance);

      // Update state with the balance
      setNativeBalance(balance);
      setLoading(false);
    } catch (err: any) {
      console.error('[WalletScreen] Error fetching balance:', err);
      setError('Failed to fetch wallet balance. Please try again.');
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
    }
    await fetchBalance();
  };

  // Handle onramp (add funds) press
  const handleOnrampPress = () => {
    if (onOnrampPress) {
      onOnrampPress();
    } else {
      // Navigate to OnrampScreen
      navigation.navigate('OnrampScreen' as never);
    }
  };

  // Fetch balance on mount and when wallet address changes
  useEffect(() => {
    fetchBalance();
  }, [walletAddress]);

  // Animation values
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const checkmarkOpacityAnim = useRef(new Animated.Value(0)).current;

  // Handle copy animation
  useEffect(() => {
    if (copied) {
      // Animate copy icon out
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
      ]).start(() => {
        // Animate checkmark in
        Animated.parallel([
          Animated.timing(checkmarkOpacityAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.elastic(1.2),
          }),
        ]).start();

        // After a delay, revert back to copy icon
        setTimeout(() => {
          // Animate checkmark out
          Animated.parallel([
            Animated.timing(checkmarkOpacityAnim, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0.5,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Reset rotation
            rotateAnim.setValue(0);

            // Animate copy icon back in
            Animated.parallel([
              Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
                easing: Easing.elastic(1.2),
              }),
            ]).start(() => {
              setCopied(false);
            });
          });
        }, 1500);
      });
    }
  }, [copied, opacityAnim, scaleAnim, rotateAnim, checkmarkOpacityAnim]);

  // Interpolate rotation value
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const copyToClipboard = () => {
    if (!copied && walletAddress) {
      Clipboard.setString(walletAddress);
      setCopied(true);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  // Show loading state while fetching data
  if (loading && !nativeBalance) {
    return <WalletScreenSkeleton insets={insets} />;
  }

  // Show error state if there was a problem
  if (error && !nativeBalance) {
    return (
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <AppHeader title="Wallet" showDefaultRightIcons={false} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Icons.walletIcon width={48} height={48} color={COLORS.errorRed} />
            <View style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>!</Text>
            </View>
          </View>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchBalance}
            activeOpacity={0.7}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <AppHeader title="Wallet" showDefaultRightIcons={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {paddingBottom: insets.bottom > 0 ? insets.bottom : 16},
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || false}
            onRefresh={handleRefresh}
            colors={[COLORS.brandBlue]}
            tintColor={COLORS.brandBlue}
          />
        }>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          {loading ? (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={styles.balanceValue}>{walletBalance}</Text>
              <ActivityIndicator
                size="small"
                color={COLORS.brandBlue}
                style={{marginLeft: 10}}
              />
            </View>
          ) : (
            <Text style={styles.balanceValue}>{walletBalance}</Text>
          )}
        </View>

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Wallet Address</Text>
          <View style={styles.addressCard}>
            <Text style={styles.addressValue}>
              {walletAddress && walletAddress.length > 10
                ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(
                    walletAddress.length - 4,
                  )}`
                : walletAddress || 'No address found'}
            </Text>
            <TouchableOpacity
              onPress={copyToClipboard}
              style={styles.copyIconButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              activeOpacity={0.7}
              disabled={copied}>
              <View style={styles.iconContainer}>
                {/* Copy Icon (animated) */}
                <Animated.View
                  style={{
                    opacity: opacityAnim,
                    transform: [{scale: scaleAnim}, {rotate}],
                    position: 'absolute',
                  }}>
                  <Icons.copyIcon width={20} height={20} color={COLORS.white} />
                </Animated.View>

                {/* Checkmark (animated) */}
                <Animated.View
                  style={{
                    opacity: checkmarkOpacityAnim,
                    transform: [{scale: scaleAnim}],
                    position: 'absolute',
                  }}>
                  <View style={styles.checkmarkContainer}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                </Animated.View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.actionsLabel}>Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleOnrampPress}
            activeOpacity={0.7}>
            <View
              style={[
                styles.actionIconContainer,
                {backgroundColor: COLORS.brandBlue},
              ]}>
              <Icons.AddFundsIcon width={24} height={24} color={COLORS.white} />
              <View style={styles.plusOverlayContainer}>
                <Icons.PlusCircleIcon
                  width={16}
                  height={16}
                  color={COLORS.brandGreen}
                />
              </View>
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionText}>Add Funds</Text>
              <Text style={styles.actionSubtext}>
                Deposit SOL to your wallet
              </Text>
            </View>
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>MoonPay</Text>
            </View>
          </TouchableOpacity>

          {/* Send Funds Button */}
          <TouchableOpacity
            style={[styles.actionButton, {marginTop: 12}]}
            onPress={() => setSendModalVisible(true)}
            activeOpacity={0.7}>
            <View
              style={[
                styles.actionIconContainer,
                {backgroundColor: COLORS.brandGreen},
              ]}>
              <Icons.SendFundsIcon
                width={24}
                height={24}
                color={COLORS.white}
              />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionText}>Send Funds</Text>
              <Text style={styles.actionSubtext}>
                Transfer SOL to any wallet
              </Text>
            </View>
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>Solana</Text>
            </View>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.actionButton, {marginTop: 12}]}
            onPress={handleLogout}
            activeOpacity={0.7}>
            <View
              style={[
                styles.actionIconContainer,
                {backgroundColor: COLORS.errorRed},
              ]}>
              <Icons.LogoutIcon width={24} height={24} color={COLORS.white} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionText}>Logout</Text>
              <Text style={styles.actionSubtext}>Sign out of your wallet</Text>
            </View>
          </TouchableOpacity>

          {/* Add Transaction History Card */}
          {/* {nativeBalance !== null && nativeBalance > 0 && (
            <View style={styles.transactionHistoryCard}>
              <Text style={styles.transactionHistoryTitle}>Recent Activity</Text>
              <View style={styles.transactionHistoryContent}>
                <Text style={styles.transactionHistoryEmpty}>
                  Your recent transactions will appear here
                </Text>
              </View>
            </View>
          )} */}
        </View>

        {/* Legal Links Section */}
        <View style={styles.legalLinksContainer}>
          <TouchableOpacity
            style={styles.legalLinkButton}
            onPress={() =>
              navigation.navigate('WebViewScreen', {
                uri: 'https://www.solanaappkit.com/privacy',
                title: 'Privacy Policy',
              })
            }
            activeOpacity={0.7}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
            <Icons.arrowRIght width={16} height={16} color={COLORS.greyDark} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.legalLinkButton}
            onPress={() =>
              navigation.navigate('WebViewScreen', {
                uri: 'https://www.solanaappkit.com/tnc',
                title: 'Terms & Conditions',
              })
            }
            activeOpacity={0.7}>
            <Text style={styles.legalLinkText}>Terms & Conditions</Text>
            <Icons.arrowRIght width={16} height={16} color={COLORS.greyDark} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Transfer Balance Modal */}
      <TransferBalanceButton
        showCustomWalletInput={true}
        showOnlyTransferButton={false}
        buttonLabel="Send Funds"
        externalModalVisible={sendModalVisible}
        externalSetModalVisible={setSendModalVisible}
        hideAllButtons={true}
      />
    </View>
  );
}

export default WalletScreen;
