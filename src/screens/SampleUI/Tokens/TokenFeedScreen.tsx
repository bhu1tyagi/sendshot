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
    TextInput,
} from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '@/core/sharedUI/AppHeader';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import { BIRDEYE_API_KEY } from '@env';
import TokenDetailsSheet from '@/core/sharedUI/TrendingTokenDetails/TokenDetailsSheet';
import SwapDrawer from '@/core/sharedUI/SwapDrawer/SwapDrawer';
import { RootState } from '@/shared/state/store';
import { fetchAllTokens } from '@/shared/state/tokens';
import { TokenData } from '@/shared/state/tokens/reducer';
import Icons from '@/assets/svgs';

const { width } = Dimensions.get('window');

// Async helper function to extract the actual image URL (copied from HoldingsScreen)
async function extractActualImageUrl(metadataValue?: string): Promise<string | undefined> {
    if (!metadataValue) return undefined;
    let contentToParse = metadataValue;
    if (metadataValue.startsWith('http')) {
        try {
            const response = await fetch(metadataValue);
            if (!response.ok) {
                console.error(`Failed to fetch metadata from URL ${metadataValue}: ${response.statusText}`);
                contentToParse = metadataValue;
            } else {
                contentToParse = await response.text();
            }
        } catch (fetchError) {
            console.error(`Network error fetching metadata from URL ${metadataValue}: ${fetchError}`);
            contentToParse = metadataValue;
        }
    }
    try {
        const jsonData = JSON.parse(contentToParse);
        if (jsonData && typeof jsonData.image === 'string' && jsonData.image.startsWith('http')) {
            return jsonData.image;
        }
    } catch (jsonError) {
        const imageMatch = contentToParse.match(/"image"\s*:\s*"([^"]+)"/);
        if (imageMatch && imageMatch[1] && imageMatch[1].startsWith('http')) {
            return imageMatch[1];
        }
    }
    if (metadataValue.startsWith('http') && /\.(jpeg|jpg|gif|png|webp)$/i.test(metadataValue)) {
        return metadataValue;
    }
    return undefined;
}

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

// Updated TokenDisplay to match TokenData more closely for consistency, plus local state image
interface TokenDisplayFromDB extends TokenData {
    // Inherits fields from TokenData, including metadataURI
}
interface TokenDisplayFromBirdeye extends BirdeyeToken {
    id: string; // Birdeye uses address as id
}

type TokenDisplay = TokenDisplayFromDB | TokenDisplayFromBirdeye;

// New TokenFeedListItem Component
interface TokenFeedListItemProps {
    item: TokenDisplay;
    onPress: (token: TokenDisplay) => void;
    isCommunityToken?: boolean;
    onBuyPress: (token: TokenDisplay) => void;
}

const TokenFeedListItem: React.FC<TokenFeedListItemProps> = ({
    item,
    onPress,
    isCommunityToken = false,
    onBuyPress
}) => {
    const [resolvedImageUrl, setResolvedImageUrl] = useState<string | undefined>(undefined);
    const [isLoadingImage, setIsLoadingImage] = useState(true);

    // Protocol logos mapping (only shown for community tokens)
    const getProtocolLogo = () => {
        if (!isCommunityToken || !('protocolType' in item) || !item.protocolType) return null;

        switch (item.protocolType) {
            case 'pumpfun':
                return <Image source={require('@/assets/images/Pumpfun_logo.png')} style={styles.protocolLogo} />;
            case 'raydium':
                return <Icons.RadyuimIcom width={18} height={18} color="#F5C05E" />;
            case 'tokenmill':
                return <Icons.TokenMillIcon width={18} height={18} color={COLORS.white} />;
            case 'meteora':
                return <Image source={require('@/assets/images/meteora.jpg')} style={styles.protocolLogo} />;
            default:
                return null;
        }
    };

    useEffect(() => {
        let isActive = true;
        setIsLoadingImage(true);

        async function loadImage() {
            let imageUrl: string | undefined;
            if ('metadataURI' in item && item.metadataURI) {
                imageUrl = await extractActualImageUrl(item.metadataURI);
            }

            if (!imageUrl && item.logoURI?.startsWith('http')) {
                imageUrl = item.logoURI;
            }

            if (isActive) {
                setResolvedImageUrl(imageUrl);
                setIsLoadingImage(false);
            }
        }
        loadImage();
        return () => { isActive = false; };
    }, [item]);

    const price = 'price' in item ? (item.price ?? 0) : ('currentPrice' in item ? (item.currentPrice ?? item.initialPrice ?? 0) : 0);
    const priceChange24h = 'priceChange24h' in item ? (item.priceChange24h ?? 0) : ('price24hChangePercent' in item ? (item.price24hChangePercent ?? 0) : 0);

    const priceChangeColor = priceChange24h === 0 ? COLORS.greyMid : (priceChange24h >= 0 ? '#4CAF50' : COLORS.errorRed);
    const formattedPrice = price < 0.01 ? price.toFixed(8) : price.toFixed(2);
    const formattedPriceChange = `${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`;

    // Get rank medal for trending tokens - now will be displayed to the left of token logo
    const getRankDisplay = () => {
        if (!('rank' in item) || !item.rank) return null;

        switch (item.rank) {
            case 1:
                return (
                    <View style={styles.rankContainer}>
                        <Text style={styles.medalEmoji}>🥇</Text>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.rankContainer}>
                        <Text style={styles.medalEmoji}>🥈</Text>
                    </View>
                );
            case 3:
                return (
                    <View style={styles.rankContainer}>
                        <Text style={styles.medalEmoji}>🥉</Text>
                    </View>
                );
            default:
                return (
                    <View style={styles.rankContainer}>
                        <Text style={styles.rankNumber}>{item.rank}</Text>
                    </View>
                );
        }
    };

    return (
        <View style={styles.tokenCard}>
            {/* Left section with rank and token logo */}
            <View style={styles.leftSection}>
                {/* Rank medal - now outside and to the left of the logo */}
                {getRankDisplay()}

                {/* Token logo */}
                <View style={styles.tokenLogoContainer}>
                    {isLoadingImage ? (
                        <ActivityIndicator size="small" color={COLORS.brandPrimary} />
                    ) : resolvedImageUrl ? (
                        <Image
                            source={{ uri: resolvedImageUrl }}
                            style={styles.tokenLogo}
                            defaultSource={require('@/assets/images/SENDlogo.png')}
                        />
                    ) : (
                        <View style={styles.tokenLogoPlaceholder}>
                            <Text style={styles.tokenLogoText}>{item.symbol[0] || '?'}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Middle content */}
            <TouchableOpacity
                style={styles.cardContent}
                onPress={() => onPress(item)}
            >
                <View style={styles.tokenNameSection}>
                    <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                    <Text style={styles.tokenName}>{item.name}</Text>
                </View>

                {/* Protocol badge (below name) */}
                {isCommunityToken && 'protocolType' in item && item.protocolType && (
                    <View style={styles.protocolContainer}>
                        <View style={styles.protocolIconContainer}>
                            {getProtocolLogo()}
                        </View>
                        <Text style={styles.protocolText}>
                            {item.protocolType.charAt(0).toUpperCase() + item.protocolType.slice(1)}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Price and Buy Button */}
            <View style={styles.rightSection}>
                <View style={styles.priceContainer}>
                    <Text style={styles.tokenPrice}>${formattedPrice}</Text>
                    <Text style={[styles.tokenPriceChange, { color: priceChangeColor }]}>
                        {formattedPriceChange}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => onBuyPress(item)}
                >
                    <Text style={styles.buyButtonText}>Buy</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const TokenFeedScreen = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'trending', title: 'Trending' },
        { key: 'community', title: 'Community' },
    ]);

    const { allTokens, loading: loadingAllTokens, error: errorAllTokens } = useSelector((state: RootState) => state.tokens);

    const [trendingTokens, setTrendingTokens] = useState<TokenDisplayFromBirdeye[]>([]);
    const [filteredTrendingTokens, setFilteredTrendingTokens] = useState<TokenDisplayFromBirdeye[]>([]);
    const [loadingTrending, setLoadingTrending] = useState(true);
    const [trendingError, setTrendingError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedToken, setSelectedToken] = useState<TokenDisplay | null>(null);
    const [isTokenDetailsVisible, setIsTokenDetailsVisible] = useState(false);

    // Swap drawer state
    const [isSwapDrawerVisible, setIsSwapDrawerVisible] = useState(false);
    const [selectedTokenForSwap, setSelectedTokenForSwap] = useState<TokenDisplay | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        dispatch(fetchAllTokens() as any);
    }, [dispatch]);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        fetchTrendingBirdeyeTokens();
    }, []);

    // Filter trending tokens when search query changes
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredTrendingTokens(trendingTokens);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = trendingTokens.filter(token =>
                token.name.toLowerCase().includes(query) ||
                token.symbol.toLowerCase().includes(query) ||
                token.address.toLowerCase().includes(query)
            );
            setFilteredTrendingTokens(filtered);
        }
    }, [searchQuery, trendingTokens]);

    const fetchTrendingBirdeyeTokens = async () => {
        setLoadingTrending(true);
        setTrendingError(null);
        try {
            const response = await fetch(
                'https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20',
                { headers: { 'accept': 'application/json', 'x-chain': 'solana', 'X-API-KEY': BIRDEYE_API_KEY } }
            );
            if (!response.ok) throw new Error('Failed to fetch trending tokens from Birdeye');
            const data = await response.json();
            if (data.success && data.data?.tokens) {
                const formattedTokens: TokenDisplayFromBirdeye[] = data.data.tokens.map((token: BirdeyeToken) => ({
                    ...token,
                    id: token.address,
                }));
                setTrendingTokens(formattedTokens);
                setFilteredTrendingTokens(formattedTokens);
            } else {
                setTrendingError('Invalid response from Birdeye API');
            }
        } catch (error: any) {
            console.error('Error fetching trending tokens:', error);
            setTrendingError(error.message || 'Error fetching trending tokens');
        } finally {
            setLoadingTrending(false);
        }
    };

    const handleTokenPress = (token: TokenDisplay) => {
        const getPrice = () => {
            if ('price' in token && token.price !== undefined) return token.price;
            if ('currentPrice' in token && token.currentPrice !== undefined) return token.currentPrice;
            if ('initialPrice' in token && token.initialPrice !== undefined) return token.initialPrice; // Ensure this check is valid for the type
            return 0;
        };

        const getPriceChange = () => {
            if ('priceChange24h' in token && token.priceChange24h !== undefined) return token.priceChange24h;
            if ('price24hChangePercent' in token && token.price24hChangePercent !== undefined) return token.price24hChangePercent;
            return 0;
        };

        const sheetTokenData = {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            logoURI: token.logoURI,
            price: getPrice(),
            priceChange24h: getPriceChange(),
            metadataURI: 'metadataURI' in token ? token.metadataURI : undefined,
        };
        setSelectedToken(sheetTokenData as any);
        setIsTokenDetailsVisible(true);
    };

    // Handler for Buy button press
    const handleBuyPress = (token: TokenDisplay) => {
        console.log('Buy pressed for token:', token.symbol);
        setSelectedTokenForSwap(token);
        setIsSwapDrawerVisible(true);
    };

    // Handle successful swap
    const handleSwapComplete = () => {
        console.log('Swap completed successfully');
        // You could refetch token data or user balances here
    };

    // Search handler
    const handleSearch = (text: string) => {
        setSearchQuery(text);
    };

    // renderFlatListItem now passes onBuyPress callback
    const renderFlatListItem = ({ item }: { item: TokenDisplay }) => {
        // Check if this is a community token (from allTokens) or trending token
        const isCommunityToken = index === 1; // index 1 is the community tab
        return (
            <TokenFeedListItem
                item={item}
                onPress={handleTokenPress}
                isCommunityToken={isCommunityToken}
                onBuyPress={handleBuyPress}
            />
        );
    };

    // Search bar component
    const SearchBar = () => (
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.greyMid} style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="Search tokens..."
                placeholderTextColor={COLORS.greyMid}
                value={searchQuery}
                onChangeText={handleSearch}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={COLORS.greyMid} />
                </TouchableOpacity>
            )}
        </View>
    );

    const TrendingTokensTab = () => (
        <View style={styles.tabContent}>
            {/* Search Bar for Trending tab */}
            <SearchBar />

            {loadingTrending ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={COLORS.brandPrimary} />
                    <Text style={styles.loaderText}>Loading trending tokens...</Text>
                </View>
            ) : trendingError ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{trendingError}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchTrendingBirdeyeTokens}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filteredTrendingTokens}
                    renderItem={renderFlatListItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {searchQuery ? "No tokens match your search" : "No trending tokens available"}
                            </Text>
                            <Text style={styles.emptySubText}>
                                {searchQuery ? "Try a different search term" : "Check back later"}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );

    // Community Tokens Tab (previously UserCreatedTokensTab)
    const CommunityTokensTab = () => (
        <View style={styles.tabContent}>
            {loadingAllTokens ? (
                <View style={styles.loaderContainer}><ActivityIndicator size="large" color={COLORS.brandPrimary} /><Text style={styles.loaderText}>Loading community tokens...</Text></View>
            ) : errorAllTokens ? (
                <View style={styles.errorContainer}><Text style={styles.errorText}>{errorAllTokens}</Text></View>
            ) : (
                <FlatList
                    data={allTokens as TokenDisplayFromDB[]} // Cast allTokens to ensure metadataURI is available for TokenFeedListItem
                    renderItem={renderFlatListItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No community tokens available</Text><Text style={styles.emptySubText}>Check back later</Text></View>}
                />
            )}
        </View>
    );

    const CustomTabBar = () => (
        <View style={styles.tabBarContainer}>
            <TouchableOpacity style={[styles.tab, index === 0 && styles.activeTab]} onPress={() => setIndex(0)}>
                <Text style={[styles.tabText, index === 0 && styles.activeTabText]}>Trending</Text>
                {index === 0 && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, index === 1 && styles.activeTab]} onPress={() => setIndex(1)}>
                <Text style={[styles.tabText, index === 1 && styles.activeTabText]}>Community</Text>
                {index === 1 && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
        </View>
    );

    const renderScene = SceneMap({
        trending: TrendingTokensTab,
        community: CommunityTokensTab,
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <AppHeader title="Token Feed" showDefaultRightIcons={true} />
            <Animated.View style={[{ opacity: fadeAnim }, { flex: 1 }]}>
                <CustomTabBar />
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
                        token={selectedToken as any}
                    />
                )}

                {/* Swap Drawer */}
                {selectedTokenForSwap && (
                    <SwapDrawer
                        visible={isSwapDrawerVisible}
                        onClose={() => setIsSwapDrawerVisible(false)}
                        targetToken={selectedTokenForSwap as any}
                        onSwapComplete={handleSwapComplete}
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
        // backgroundColor: 'transparent', // Already default or handled by no specific style
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
        paddingBottom: 100,
    },
    tokenCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.lighterBackground,
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rankContainer: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    medalEmoji: {
        fontSize: 18,
    },
    rankNumber: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: '600',
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
        fontWeight: '700',
        color: COLORS.greyMid,
    },
    cardContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    tokenNameSection: {
        justifyContent: 'center',
    },
    tokenSymbol: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenName: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.greyMid,
        marginTop: 2,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    rightSection: {
        alignItems: 'flex-end',
    },
    priceContainer: {
        alignItems: 'flex-end',
        marginBottom: 8,
    },
    tokenPrice: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: '600',
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenPriceChange: {
        fontSize: TYPOGRAPHY.size.xs,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.darkerBackground,
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.sm,
        padding: 0,
    },
    buyButton: {
        backgroundColor: COLORS.brandPrimary,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buyButtonText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: '600',
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
        marginTop: 10,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        // paddingTop: 80, // Removed fixed padding, let flexbox handle centering
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
        paddingVertical: 10, // Increased padding
        paddingHorizontal: 20, // Increased padding
        borderRadius: 8,
    },
    retryButtonText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
    },
    emptyContainer: {
        flex: 1, // Ensure it takes space to center content
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80, // Keep some top padding
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
    protocolContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    protocolIconContainer: {
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    protocolLogo: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    protocolText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
        fontWeight: '500',
    },
});

export default TokenFeedScreen;