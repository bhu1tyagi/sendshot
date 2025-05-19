import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Animated,
    Dimensions,
    TextInput,
    InteractionManager,
    NativeSyntheticEvent,
    NativeScrollEvent,
    LogBox,
} from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '@/core/sharedUI/AppHeader';
import COLORS from '@/assets/colors';
import { BIRDEYE_API_KEY } from '@env';
import TokenDetailsSheet from '@/core/sharedUI/TrendingTokenDetails/TokenDetailsSheet';
import SwapDrawer from '@/core/sharedUI/SwapDrawer/SwapDrawer';
import { RootState } from '@/shared/state/store';
import { 
    fetchAllTokens, 
    fetchTrendingTokens,
    setTrendingTokensFilter,
    resetTrendingTokensState,
    TokenData,
    TrendingTokenData,
    TOKENS_PER_PAGE
} from '@/shared/state/tokens';
import Icons from '@/assets/svgs';
import styles from './TokenFeedScreenStyles';
import TokenSkeletonLoader from './TokenSkeletonLoader';

// Disable specific warning about VirtualizedLists inside Lists
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews',
  'Sending `onEndReached` with no velocity'
]);

const { width } = Dimensions.get('window');

// Number of skeleton loaders to display
const SKELETON_COUNT = 5;

// Calculate item height for getItemLayout (helps prevent jumping)
const ITEM_HEIGHT = 88; // Approximate height of each token card

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

// Type definition for display tokens (combines community and trending tokens)
type TokenDisplay = TokenData | TrendingTokenData;

// TokenFeedListItem Component
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

    // Get the price based on token type (community or trending)
    const price = 'price' in item ? (item.price ?? 0) : ('currentPrice' in item ? (item.currentPrice ?? item.initialPrice ?? 0) : 0);
    
    // Get the price change based on token type
    const priceChange24h = 'priceChange24h' in item ? (item.priceChange24h ?? 0) : ('price24hChangePercent' in item ? (item.price24hChangePercent ?? 0) : 0);

    const priceChangeColor = priceChange24h === 0 ? COLORS.greyMid : (priceChange24h >= 0 ? '#4CAF50' : COLORS.errorRed);
    const formattedPrice = price < 0.01 ? price.toFixed(8) : price.toFixed(2);
    const formattedPriceChange = `${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`;

    // Get rank medal for trending tokens
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
        <View style={[styles.tokenCard, { height: ITEM_HEIGHT }]}>
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
    console.log('[TokenFeedScreen] Rendering component');
    
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'trending', title: 'Trending' },
        { key: 'community', title: 'Community' },
    ]);

    // FlatList reference to manually control scroll
    const trendingListRef = useRef<FlatList>(null);
    const isLoadingMore = useRef(false);
    const currentScrollY = useRef(0);
    
    // Add flag to track initial mount
    const isInitialMount = useRef(true);
    const renderCount = useRef(0);

    // Get tokens state from Redux
    const { 
        allTokens, 
        loading: loadingAllTokens, 
        error: errorAllTokens,
        trendingTokens,
        filteredTrendingTokens,
        trendingTokensLoading,
        trendingTokensError,
        trendingTokensPage,
        hasMoreTrendingTokens,
        loadingMoreTrendingTokens,
        filterOptions
    } = useSelector((state: RootState) => state.tokens);

    // Track component renders
    renderCount.current += 1;
    console.log(`[TokenFeedScreen] Render #${renderCount.current}, tab index: ${index}, tokens count: ${filteredTrendingTokens.length}`);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedToken, setSelectedToken] = useState<TokenDisplay | null>(null);
    const [isTokenDetailsVisible, setIsTokenDetailsVisible] = useState(false);

    // Swap drawer state
    const [isSwapDrawerVisible, setIsSwapDrawerVisible] = useState(false);
    const [selectedTokenForSwap, setSelectedTokenForSwap] = useState<TokenDisplay | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;

    // Keep a snapshot of the tokens count for scroll position reference
    const prevTokenCount = useRef(0);
    const prevScrollPosition = useRef(0);
    const isScrolling = useRef(false);

    // Add this at the component level, not inside the StableTrendingFlatList
    const [scrollOffset, setScrollOffset] = useState(0);
    
    useEffect(() => {
        console.log('[TokenFeedScreen] Component mounted');
        
        // Fetch community tokens when component mounts
        dispatch(fetchAllTokens() as any);
        
        // Reset trending tokens state when component mounts
        dispatch(resetTrendingTokensState());

        // Start animations
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        startPulseAnimation();
        
        // Fetch first page of trending tokens
        dispatch(fetchTrendingTokens(0) as any);
        
        // Cleanup function to reset trending tokens state when component unmounts
        return () => {
            console.log('[TokenFeedScreen] Component unmounting');
            dispatch(resetTrendingTokensState());
        };
    }, [dispatch]);
    
    // Track changes in token count
    useEffect(() => {
        if (trendingTokens.length > prevTokenCount.current && prevTokenCount.current > 0) {
            // Just received more tokens, mark loading as complete
            console.log(`[TokenFeedScreen] New tokens received: ${trendingTokens.length - prevTokenCount.current}`);
            isLoadingMore.current = false;
            
            // Force the FlatList to update
            InteractionManager.runAfterInteractions(() => {
                if (trendingListRef.current) {
                    console.log('[TokenFeedScreen] Forcing FlatList update');
                }
            });
        }
        prevTokenCount.current = trendingTokens.length;
    }, [trendingTokens.length]);
    
    // Log when loading status changes
    useEffect(() => {
        console.log(`[TokenFeedScreen] loadingMoreTrendingTokens: ${loadingMoreTrendingTokens}`);
    }, [loadingMoreTrendingTokens]);
    
    useEffect(() => {
        console.log(`[TokenFeedScreen] trendingTokensLoading: ${trendingTokensLoading}`);
    }, [trendingTokensLoading]);
    
    // Start pulse animation for skeleton loaders
    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    // Update filter when search query changes
    useEffect(() => {
        dispatch(setTrendingTokensFilter({ query: searchQuery }));
    }, [searchQuery, dispatch]);

    // Handle tab change
    useEffect(() => {
        console.log(`[TokenFeedScreen] Tab changed to: ${index}`);
        // If switching to trending tab and no trending tokens loaded, fetch them
        if (index === 0 && trendingTokens.length === 0 && !trendingTokensLoading) {
            dispatch(fetchTrendingTokens(0) as any);
        }
    }, [index, dispatch, trendingTokens.length, trendingTokensLoading]);

    // Don't create a new array reference - use direct reference to Redux state
    const trendingTokensForDisplay = filteredTrendingTokens;

    // Get item layout for FlatList to prevent jumps
    const getItemLayout = useCallback((data: any, index: number) => {
        const layout = {
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
        };
        return layout;
    }, []);

    const handleLoadMore = useCallback(() => {
        console.log('[TokenFeedScreen] onEndReached called');
        console.log('  - loadingMoreTrendingTokens:', loadingMoreTrendingTokens);
        console.log('  - hasMoreTrendingTokens:', hasMoreTrendingTokens);
        console.log('  - searchQuery:', searchQuery);
        console.log('  - trendingTokensPage:', trendingTokensPage);
        console.log('  - isLoadingMore.current:', isLoadingMore.current);
        console.log('  - currentScrollY:', currentScrollY.current);
        
        // Only load more if not currently loading, more tokens exist, and no active search
        if (!loadingMoreTrendingTokens && !isLoadingMore.current && hasMoreTrendingTokens && searchQuery.trim() === '') {
            console.log(`[TokenFeedScreen] Loading more trending tokens, current page: ${trendingTokensPage}`);
            
            // Mark as loading to prevent multiple requests
            isLoadingMore.current = true;
            
            // Capture current scroll position before loading more
            prevScrollPosition.current = currentScrollY.current;
            
            // Reset loading state after a delay if it somehow gets stuck
            setTimeout(() => {
                if (isLoadingMore.current) {
                    console.log('[TokenFeedScreen] Timeout: Resetting isLoadingMore flag');
                isLoadingMore.current = false;
                }
            }, 5000);
            
            // Dispatch fetch action
            dispatch(fetchTrendingTokens(trendingTokensPage + 1) as any);
        } else {
            console.log('[TokenFeedScreen] Skipped loading more tokens');
        }
    }, [dispatch, loadingMoreTrendingTokens, hasMoreTrendingTokens, searchQuery, trendingTokensPage]);

    // Update the handleScroll function to track scroll position more reliably
    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        currentScrollY.current = y;
        setScrollOffset(y);
        isScrolling.current = true;
        
        // If big jumps in scroll position, log them
        if (Math.abs(y - prevScrollPosition.current) > 100) {
            console.log(`[TokenFeedScreen] Large scroll position change: ${prevScrollPosition.current} -> ${y}`);
            prevScrollPosition.current = y;
        }
    }, []);

    const handleScrollEnd = useCallback(() => {
        isScrolling.current = false;
        console.log(`[TokenFeedScreen] Scroll ended at position: ${currentScrollY.current}`);
    }, []);

    const handleTokenPress = (token: TokenDisplay) => {
        const getPrice = () => {
            if ('price' in token && token.price !== undefined) return token.price;
            if ('currentPrice' in token && token.currentPrice !== undefined) return token.currentPrice;
            if ('initialPrice' in token && token.initialPrice !== undefined) return token.initialPrice;
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
    };

    // Search handler
    const handleSearch = (text: string) => {
        setSearchQuery(text);
    };

    // Fix key extractor to not depend on index for more stable keys
    const keyExtractor = useCallback((item: TokenDisplay) => {
        // Ensure absolutely stable keys by using only address
        return `token-${item.address}`;
    }, []);

    // Add a dedicated memo component for list items to prevent unnecessary re-renders
    const MemoizedTokenFeedListItem = React.memo(TokenFeedListItem);

    // Modify renderFlatListItem to use the memoized component without depending on tab index
    const renderFlatListItem = useCallback(({ item }: { item: TokenDisplay, index: number }) => {
        // Check if this is a community token based on data type, not tab index
        const isCommunityToken = 'protocolType' in item;
        return (
            <MemoizedTokenFeedListItem
                item={item}
                onPress={handleTokenPress}
                isCommunityToken={isCommunityToken}
                onBuyPress={handleBuyPress}
            />
        );
    }, [handleTokenPress, handleBuyPress]);
    
    // Render loading footer for infinite scroll
    const renderFooter = useCallback(() => {
        if (!loadingMoreTrendingTokens && !isLoadingMore.current) return null;
        
        console.log('[TokenFeedScreen] Rendering footer loader');
        // Show a couple of skeleton loaders in the footer
        return (
            <View> 
                {Array.from({ length: 2 }).map((_, idx) => (
                    <TokenSkeletonLoader key={`footer-skeleton-${idx}`} pulseAnim={pulseAnim} />
                ))}
            </View>
        );
    }, [loadingMoreTrendingTokens, isLoadingMore.current, pulseAnim]);

    // Search bar component - memoized to prevent re-creation
    const SearchBar = useCallback(() => (
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
    ), [searchQuery, handleSearch]);
    
    // Render skeleton loaders
    const renderSkeletons = useCallback(() => {
        return Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <TokenSkeletonLoader key={`skeleton-${index}`} pulseAnim={pulseAnim} />
        ));
    }, [pulseAnim]);

    // Inside StableTrendingFlatList function, update the FlatList
    const StableTrendingFlatList = useCallback(() => {
        console.log('[TokenFeedScreen] Rendering StableTrendingFlatList');
        
        return (
            <FlatList
                ref={trendingListRef}
                data={trendingTokensForDisplay}
                renderItem={renderFlatListItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                windowSize={21}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={false}
                initialNumToRender={10}
                disableVirtualization={false}
                // Remove dependence on loadingMoreTrendingTokens which causes re-renders
                extraData={scrollOffset}
                onScroll={handleScroll}
                onScrollEndDrag={handleScrollEnd}
                onMomentumScrollEnd={handleScrollEnd}
                // This is critical - it helps maintain scroll position when data changes
                maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: null
                }}
                onScrollToIndexFailed={(info) => {
                    console.log('[TokenFeedScreen] Failed to scroll to index:', info);
                }}
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
        );
    }, [
        trendingTokensForDisplay,
        renderFlatListItem,
        keyExtractor,
        getItemLayout,
        handleLoadMore,
        renderFooter,
        // Remove loadingMoreTrendingTokens from dependencies
        // Add scrollOffset instead
        scrollOffset,
        handleScroll,
        handleScrollEnd,
        searchQuery
    ]);

    // Memoized TrendingTokensTab with useCallback to prevent recreation on every render
    const TrendingTokensTab = useCallback(() => {
        console.log('[TokenFeedScreen] Rendering TrendingTokensTab');
        return (
            <View style={styles.tabContent}>
                {/* Search Bar for Trending tab */}
                <SearchBar />

                {trendingTokensLoading && trendingTokens.length === 0 ? (
                    <View style={styles.listContainer}>
                        {renderSkeletons()}
                    </View>
                ) : trendingTokensError ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{trendingTokensError}</Text>
                        <TouchableOpacity 
                            style={styles.retryButton} 
                            onPress={() => {
                                dispatch(fetchTrendingTokens(0) as any);
                            }}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <StableTrendingFlatList />
                )}
            </View>
        );
    }, [
        trendingTokensLoading, 
        trendingTokens.length, 
        trendingTokensError, 
        dispatch,
        SearchBar,
        renderSkeletons,
        StableTrendingFlatList
    ]);

    const StableCommunityFlatList = useCallback(() => {
        console.log('[TokenFeedScreen] Rendering StableCommunityFlatList');
        return (
                <FlatList
                    data={allTokens as TokenData[]}
                    renderItem={renderFlatListItem}
                    keyExtractor={keyExtractor}
                    getItemLayout={getItemLayout}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No community tokens available</Text>
                            <Text style={styles.emptySubText}>Check back later</Text>
                        </View>
                    }
                />
        );
    }, [
        allTokens,
        renderFlatListItem,
        keyExtractor,
        getItemLayout
    ]);

    // Memoized CommunityTokensTab with useCallback to prevent recreation on every render
    const CommunityTokensTab = useCallback(() => {
        console.log('[TokenFeedScreen] Rendering CommunityTokensTab');
        return (
            <View style={styles.tabContent}>
                {loadingAllTokens ? (
                    <View style={styles.listContainer}>
                        {renderSkeletons()} 
                    </View>
                ) : errorAllTokens ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorAllTokens}</Text>
                    </View>
                ) : (
                    <StableCommunityFlatList />
            )}
        </View>
    );
    }, [
        loadingAllTokens, 
        errorAllTokens, 
        renderSkeletons,
        StableCommunityFlatList
    ]);

    // Memoized CustomTabBar
    const CustomTabBar = useCallback(() => (
        <View style={styles.tabBarContainer}>
            <TouchableOpacity 
                style={[styles.tab, index === 0 && styles.activeTab]} 
                onPress={() => setIndex(0)}
            >
                <Text style={[styles.tabText, index === 0 && styles.activeTabText]}>Trending</Text>
                {index === 0 && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tab, index === 1 && styles.activeTab]} 
                onPress={() => setIndex(1)}
            >
                <Text style={[styles.tabText, index === 1 && styles.activeTabText]}>Community</Text>
                {index === 1 && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
        </View>
    ), [index, setIndex]);

    // Memoized renderScene to prevent TabView from getting new scene functions on every render
    const renderScene = useMemo(
        () => SceneMap({
            trending: TrendingTokensTab,
            community: CommunityTokensTab,
        }),
        [TrendingTokensTab, CommunityTokensTab]
    );
    
    // Track when component fully renders
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            console.log('[TokenFeedScreen] Initial mount complete');
        }
    });

    // Clean up logs in development after 60s to prevent console overflow
    useEffect(() => {
        const timer = setTimeout(() => {
            console.log('[TokenFeedScreen] Clearing console logs');
            console.clear();
        }, 60000);
        
        return () => clearTimeout(timer);
    }, []);

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

export default TokenFeedScreen;