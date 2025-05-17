import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AppHeader from '@/core/sharedUI/AppHeader';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import { BIRDEYE_API_KEY } from '@env';
import TokenDetailsSheet from '@/core/sharedUI/TrendingTokenDetails/TokenDetailsSheet';
import { RootState } from '@/shared/state/store';
import { fetchAllTokens, fetchUserTokens } from '@/shared/state/tokens';
import { TokenData } from '@/shared/state/tokens/reducer';

const { width } = Dimensions.get('window');

// Type definition for birdeye trending tokens
interface BirdeyeToken {
    address: string;
    name: string;
    symbol: string;
    logoURI?: string;
    price: number;
    price24hChangePercent?: number;
    rank?: number;
}

// Type for the Token display
interface TokenDisplay {
    id: string;
    address: string;
    name: string;
    symbol: string;
    logoURI?: string;
    price: number;
    priceChange24h?: number;
    rank?: number;
}

const TokenFeedScreen = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'trending', title: 'Trending' },
        { key: 'userCreated', title: 'User Created' },
    ]);

    // Get state from Redux
    const { address } = useSelector((state: RootState) => state.auth);
    const { allTokens, userTokens, loading, error } = useSelector((state: RootState) => state.tokens);
    
    // State for trending tokens from Birdeye
    const [trendingTokens, setTrendingTokens] = useState<TokenDisplay[]>([]);
    const [loadingTrending, setLoadingTrending] = useState(true);
    const [trendingError, setTrendingError] = useState<string | null>(null);

    // Selected token state
    const [selectedToken, setSelectedToken] = useState<TokenDisplay | null>(null);
    const [isTokenDetailsVisible, setIsTokenDetailsVisible] = useState(false);

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Fade in animation on component mount
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        // Fetch trending tokens
        fetchTrendingTokens();
        
        // Fetch all tokens from our database
        dispatch(fetchAllTokens() as any);
        
        // If user is logged in, fetch their tokens
        if (address) {
            dispatch(fetchUserTokens(address) as any);
        }
    }, [dispatch, address]);

    // Convert database tokens to display format
    const getUserTokensForDisplay = (): TokenDisplay[] => {
        if (!address || !userTokens[address]) return [];
        
        return userTokens[address].map(token => ({
            id: token.id,
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            logoURI: token.logoURI,
            price: token.currentPrice || token.initialPrice,
            priceChange24h: token.priceChange24h || 0,
        }));
    };

    const fetchTrendingTokens = async () => {
        setLoadingTrending(true);
        setTrendingError(null);
        try {
            // Using BirdEye API to get trending tokens
            const response = await fetch(
                'https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20',
                {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'x-chain': 'solana',
                        'X-API-KEY': BIRDEYE_API_KEY
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to fetch trending tokens');

            const data = await response.json();

            if (data.success && data.data?.tokens) {
                // Map to the TokenDisplay type
                const formattedTokens: TokenDisplay[] = data.data.tokens.map((token: BirdeyeToken) => ({
                    id: token.address, // Use address as ID for birdeye tokens
                    address: token.address,
                    name: token.name,
                    symbol: token.symbol,
                    logoURI: token.logoURI,
                    price: token.price,
                    priceChange24h: token.price24hChangePercent,
                    rank: token.rank,
                }));

                setTrendingTokens(formattedTokens);
            } else {
                console.error('Invalid token response format:', data);
                setTrendingError('Invalid response from Birdeye API');
            }
        } catch (error) {
            console.error('Error fetching trending tokens:', error);
            setTrendingError('Error fetching trending tokens');
            
            // Use sample tokens from our database as fallback
            if (allTokens.length > 0) {
                const fallbackTokens = allTokens.slice(0, 5).map(token => ({
                    id: token.id,
                    address: token.address,
                    name: token.name,
                    symbol: token.symbol,
                    logoURI: token.logoURI,
                    price: token.currentPrice || token.initialPrice,
                    priceChange24h: token.priceChange24h || 0,
                }));
                setTrendingTokens(fallbackTokens);
            }
        } finally {
            setLoadingTrending(false);
        }
    };

    const handleTokenPress = (token: TokenDisplay) => {
        setSelectedToken(token);
        setIsTokenDetailsVisible(true);
    };

    // Token item component with buy/swap options
    const renderTokenItem = ({ item }: { item: TokenDisplay }) => {
        const priceChangeColor =
            !item.priceChange24h ? COLORS.greyMid :
                item.priceChange24h >= 0 ? '#4CAF50' : COLORS.errorRed;

        const formattedPrice = item.price < 0.01
            ? item.price.toFixed(8)
            : item.price.toFixed(2);

        const formattedPriceChange = item.priceChange24h
            ? `${item.priceChange24h >= 0 ? '+' : ''}${item.priceChange24h.toFixed(2)}%`
            : 'N/A';

        // Get rank display (medal or number)
        const getRankDisplay = (rank: number) => {
            switch (rank) {
                case 1:
                    return <Text style={styles.medalEmoji}>🥇</Text>;
                case 2:
                    return <Text style={styles.medalEmoji}>🥈</Text>;
                case 3:
                    return <Text style={styles.medalEmoji}>🥉</Text>;
                default:
                    return <Text style={styles.rankNumber}>{rank}</Text>;
            }
        };

        return (
            <View style={styles.tokenCard}>
                <TouchableOpacity
                    style={styles.tokenHeader}
                    onPress={() => handleTokenPress(item)}
                    activeOpacity={0.7}
                >
                    {/* Rank */}
                    <View style={styles.rankContainer}>
                        {item.rank ? getRankDisplay(item.rank) : <View style={styles.rankPlaceholder} />}
                    </View>

                    {/* Token Logo */}
                    <View style={styles.tokenLogoContainer}>
                        {item.logoURI ? (
                            <Image
                                source={{ uri: item.logoURI }}
                                style={styles.tokenLogo}
                                defaultSource={require('@/assets/images/SENDlogo.png')}
                            />
                        ) : (
                            <View style={styles.tokenLogoPlaceholder}>
                                <Text style={styles.tokenLogoText}>
                                    {item.symbol[0] || '?'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Token Info */}
                    <View style={styles.tokenInfo}>
                        <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                        <Text style={styles.tokenName} numberOfLines={1}>{item.name}</Text>
                    </View>

                    {/* Token Price Info */}
                    <View style={styles.tokenPriceContainer}>
                        <Text style={styles.tokenPrice}>${formattedPrice}</Text>
                        <Text style={[styles.tokenPriceChange, { color: priceChangeColor }]}>
                            {formattedPriceChange}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity style={styles.buyButton}>
                        <Text style={styles.buyButtonText}>Buy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.swapButton}>
                        <Text style={styles.swapButtonText}>Swap</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Tab scenes
    const TrendingTokensTab = () => (
        <View style={styles.tabContent}>
            {loadingTrending ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={COLORS.brandPrimary} style={styles.loader} />
                    <Text style={styles.loaderText}>Loading trending tokens...</Text>
                </View>
            ) : trendingError ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{trendingError}</Text>
                    <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={fetchTrendingTokens}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={trendingTokens}
                    renderItem={renderTokenItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No trending tokens available</Text>
                            <Text style={styles.emptySubText}>Check back later</Text>
                        </View>
                    }
                />
            )}
        </View>
    );

    const UserCreatedTokensTab = () => (
        <View style={styles.tabContent}>
            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={COLORS.brandPrimary} style={styles.loader} />
                    <Text style={styles.loaderText}>Loading user tokens...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={getUserTokensForDisplay()}
                    renderItem={renderTokenItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {address ? "You haven't created any tokens yet" : "Please log in to see your tokens"}
                            </Text>
                            <Text style={styles.emptySubText}>
                                {address ? "Launch your first token to get started" : "Log in to view and manage your tokens"}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );

    // Custom tab bar
    const CustomTabBar = () => {
        return (
            <View style={styles.tabBarContainer}>
                <TouchableOpacity
                    style={[styles.tab, index === 0 && styles.activeTab]}
                    onPress={() => setIndex(0)}
                >
                    <Text style={[styles.tabText, index === 0 && styles.activeTabText]}>
                        Trending
                    </Text>
                    {index === 0 && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, index === 1 && styles.activeTab]}
                    onPress={() => setIndex(1)}
                >
                    <Text style={[styles.tabText, index === 1 && styles.activeTabText]}>
                        User Created
                    </Text>
                    {index === 1 && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
            </View>
        );
    };

    const renderScene = SceneMap({
        trending: TrendingTokensTab,
        userCreated: UserCreatedTokensTab,
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <AppHeader title="Token Feed" showDefaultRightIcons={true} />

            <Animated.View style={[{ opacity: fadeAnim }, { flex: 1 }]}>
                {/* Custom Tab Bar */}
                <CustomTabBar />

                {/* Tab View */}
                <TabView
                    navigationState={{ index, routes }}
                    renderScene={renderScene}
                    onIndexChange={setIndex}
                    initialLayout={{ width }}
                    swipeEnabled={true}
                    renderTabBar={() => null}
                    lazy
                />

                {/* Token Details Sheet */}
                {selectedToken && (
                    <TokenDetailsSheet
                        visible={isTokenDetailsVisible}
                        onClose={() => setIsTokenDetailsVisible(false)}
                        token={selectedToken}
                    />
                )}
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    tabBarContainer: {
        flexDirection: 'row',
        height: 48,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderDarkColor,
        backgroundColor: COLORS.background,
    },
    tab: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    activeTab: {
        backgroundColor: 'transparent',
    },
    tabText: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: String(TYPOGRAPHY.medium) as any,
        color: COLORS.greyDark,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    activeTabText: {
        color: COLORS.white,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        width: '35%',
        backgroundColor: COLORS.brandPrimary,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },
    tabContent: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 100, // Extra padding for bottom tab bar
    },
    tokenCard: {
        backgroundColor: COLORS.lighterBackground,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    tokenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    rankContainer: {
        width: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    rankPlaceholder: {
        width: 20,
        height: 20,
    },
    medalEmoji: {
        fontSize: 20,
    },
    rankNumber: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        color: COLORS.accessoryDarkColor,
    },
    tokenLogoContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.darkerBackground,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
    },
    tokenLogo: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    tokenLogoPlaceholder: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: COLORS.darkerBackground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tokenLogoText: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: String(TYPOGRAPHY.bold) as any,
        color: COLORS.greyMid,
    },
    tokenInfo: {
        marginLeft: 16,
        flex: 1,
    },
    tokenSymbol: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenName: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.accessoryDarkColor,
        marginTop: 2,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenPriceContainer: {
        alignItems: 'flex-end',
        marginRight: 8,
    },
    tokenPrice: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenPriceChange: {
        fontSize: TYPOGRAPHY.size.xs,
        marginTop: 2,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    buyButton: {
        flex: 1,
        backgroundColor: COLORS.brandPrimary,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    buyButtonText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    swapButton: {
        flex: 1,
        backgroundColor: COLORS.darkerBackground,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        borderWidth: 1,
        borderColor: COLORS.brandPrimary,
    },
    swapButtonText: {
        color: COLORS.brandPrimary,
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loader: {
        marginBottom: 10,
    },
    loaderText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.greyMid,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 30,
    },
    errorText: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        color: COLORS.errorRed,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: COLORS.brandPrimary,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    retryButtonText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 30,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        color: COLORS.white,
        textAlign: 'center',
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    emptySubText: {
        marginTop: 8,
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.greyMid,
        textAlign: 'center',
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
});

export default TokenFeedScreen;