import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    SafeAreaView,
    StatusBar,
    Animated,
    Dimensions,
    InteractionManager,
    NativeSyntheticEvent,
    NativeScrollEvent,
    LogBox,
    FlatList,
    Platform,
} from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AppHeader from '@/core/sharedUI/AppHeader';
import COLORS from '@/assets/colors';
import TokenDetailsSheet from '@/core/sharedUI/TrendingTokenDetails/TokenDetailsSheet';
import SwapDrawer from '@/core/sharedUI/SwapDrawer/SwapDrawer';
import { RootState } from '@/shared/state/store';
import {
    fetchAllTokens,
    fetchTrendingTokens,
    setTrendingTokensFilter,
    resetTrendingTokensState
} from '@/shared/state/tokens';
import styles from './TokenFeedScreenStyles';

// Import components
import TokenFeedListItem from './components/TokenFeedListItem';
import CustomTabBar from './components/CustomTabBar';
import TrendingTokensTab from './components/TrendingTokensTab';
import CommunityTokensTab from './components/CommunityTokensTab';
import TokenSkeletonLoader from './TokenSkeletonLoader';

// Import types
import { TokenDisplay } from './utils/types';

// Import utils
import { getTokenPrice, getTokenPriceChange } from './utils/tokenHelpers';
import { IPFSAwareImage } from '@/shared/utils/IPFSImage';

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
    const onEndReachedCalledDuringMomentum = useRef(false);

    // Add flag to track initial mount
    const isInitialMount = useRef(true);
    const renderCount = useRef(0);

    // Track component renders
    renderCount.current += 1;
    console.log(`[TokenFeedScreen] Render #${renderCount.current}, tab index: ${index}`);

    const [searchQuery, setSearchQuery] = useState('');

    // Memoize the search query setter to maintain referential equality
    const handleSearchQueryChange = useCallback((query: string) => {
        // This function will maintain the same reference between renders
        setSearchQuery(query);
    }, []);

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
    const prevSearchQuery = useRef('');

    const {
        trendingTokens,
        trendingTokensLoading,
        trendingTokensPage,
        hasMoreTrendingTokens,
        loadingMoreTrendingTokens,
    } = useSelector((state: RootState) => state.tokens);

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

            // Log if FlatList reference exists (previously was inside InteractionManager)
            if (trendingListRef.current) {
                console.log('[TokenFeedScreen] FlatList reference exists after receiving new tokens.');
            }
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

    // Throttle search filter updates - add throttle time
    const lastFilterUpdateTime = useRef(0);

    // Update filter when search query changes - with throttling
    useEffect(() => {
        // Skip immediate initial render
        if (isInitialMount.current) return;

        // Get current time
        const now = Date.now();

        // Set a delay between filter dispatches (300ms minimum)
        if (now - lastFilterUpdateTime.current < 300) {
            console.log('[TokenFeedScreen] Throttling filter update');
            const throttleUpdateTimeout = setTimeout(() => {
                if (searchQuery.trim() !== prevSearchQuery.current.trim()) {
                    console.log('[TokenFeedScreen] Dispatching delayed filter update:', searchQuery);
                    dispatch(setTrendingTokensFilter({ query: searchQuery }));
                    prevSearchQuery.current = searchQuery;
                    lastFilterUpdateTime.current = Date.now();
                }
            }, 300);

            return () => clearTimeout(throttleUpdateTimeout);
        }

        // Update immediately if outside throttle window
        console.log('[TokenFeedScreen] Updating filter with query:', searchQuery);
        if (searchQuery.trim() !== prevSearchQuery.current.trim()) {
            dispatch(setTrendingTokensFilter({ query: searchQuery }));
            prevSearchQuery.current = searchQuery;
            lastFilterUpdateTime.current = now;
        }

    }, [searchQuery, dispatch]);

    // Handle tab change
    useEffect(() => {
        console.log(`[TokenFeedScreen] Tab changed to: ${index}`);
        // If switching to trending tab and no trending tokens loaded, fetch them
        if (index === 0 && trendingTokens.length === 0 && !trendingTokensLoading) {
            dispatch(fetchTrendingTokens(0) as any);
        }
    }, [index, dispatch, trendingTokens.length, trendingTokensLoading]);

    // Get item layout for FlatList to prevent jumps
    const getItemLayout = useCallback((data: any, index: number) => {
        const layout = {
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
        };
        return layout;
    }, []);

    // Fix the handleLoadMore function to handle momentum properly
    const handleLoadMore = useCallback(() => {
        console.log('[TokenFeedScreen] onEndReached called');
        console.log('  - loadingMoreTrendingTokens:', loadingMoreTrendingTokens);
        console.log('  - hasMoreTrendingTokens:', hasMoreTrendingTokens);
        console.log('  - searchQuery:', searchQuery);
        console.log('  - trendingTokensPage:', trendingTokensPage);
        console.log('  - isLoadingMore.current:', isLoadingMore.current);
        console.log('  - currentScrollY:', currentScrollY.current);
        // console.log('  - onEndReachedCalledDuringMomentum:', onEndReachedCalledDuringMomentum.current); // Removed for simplification

        // If already loading (either by Redux state or local ref), skip.
        if (loadingMoreTrendingTokens || isLoadingMore.current) {
            console.log('[TokenFeedScreen] Skipped: Already loading more tokens.');
            return;
        }

        // Only load more if more tokens exist and no active search
        if (hasMoreTrendingTokens && searchQuery.trim() === '') {
            console.log(`[TokenFeedScreen] Loading more trending tokens, current page: ${trendingTokensPage}`);

            // Mark as loading to prevent multiple requests
            isLoadingMore.current = true;
            // onEndReachedCalledDuringMomentum.current = true; // Removed for simplification

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
            console.log('[TokenFeedScreen] Skipped loading more tokens (conditions not met or search active).');
        }
    }, [dispatch, loadingMoreTrendingTokens, hasMoreTrendingTokens, searchQuery, trendingTokensPage]);

    // Reset momentum flags on scroll events
    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        currentScrollY.current = y;
        isScrolling.current = true;

        // If big jumps in scroll position, log them
        if (Math.abs(y - prevScrollPosition.current) > 100) {
            console.log(`[TokenFeedScreen] Large scroll position change: ${prevScrollPosition.current} -> ${y}`);
            prevScrollPosition.current = y;
        }
    }, []);

    // Reset momentum flag when scrolling ends
    const handleScrollEnd = useCallback(() => {
        isScrolling.current = false;
        console.log(`[TokenFeedScreen] Scroll ended at position: ${currentScrollY.current}`);

        // onEndReachedCalledDuringMomentum.current = false; // Removed for simplification
    }, []);

    const handleTokenPress = useCallback((token: TokenDisplay) => {
        const sheetTokenData = {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            logoURI: token.logoURI,
            price: getTokenPrice(token),
            priceChange24h: getTokenPriceChange(token),
            metadataURI: 'metadataURI' in token ? token.metadataURI : undefined,
        };
        setSelectedToken(sheetTokenData as any);
        setIsTokenDetailsVisible(true);
    }, []);

    // Handler for Buy button press
    const handleBuyPress = useCallback((token: TokenDisplay) => {
        console.log('Buy pressed for token:', token.symbol);
        setSelectedTokenForSwap(token);
        setIsSwapDrawerVisible(true);
    }, []);

    // Handle successful swap
    const handleSwapComplete = () => {
        console.log('Swap completed successfully');
    };

    // Fix key extractor to not depend on index for more stable keys
    const keyExtractor = useCallback((item: TokenDisplay) => {
        // Ensure unique keys by combining ID and symbol - index dependency removed
        const id = 'address' in item && item.address ? item.address : item.id;
        return `token-${id}-${item.symbol}`;
    }, []);

    // Modify renderFlatListItem to use the memoized component without depending on tab index
    const renderFlatListItem = useCallback(({ item }: { item: TokenDisplay, index: number }) => {
        // Check if this is a community token based on data type, not tab index
        const isCommunityToken = 'protocolType' in item;
        return (
            <TokenFeedListItem
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

    // Render skeleton loaders
    const renderSkeletons = useCallback(() => {
        return Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <TokenSkeletonLoader key={`skeleton-${index}`} pulseAnim={pulseAnim} />
        ));
    }, [pulseAnim]);

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

    // Memoized TrendingTokensTab
    const TrendingTokensTabComponent = (
        <TrendingTokensTab
            searchQuery={searchQuery}
            setSearchQuery={handleSearchQueryChange}
            renderItem={renderFlatListItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            handleLoadMore={handleLoadMore}
            handleScroll={handleScroll}
            handleScrollEnd={handleScrollEnd}
            renderFooter={renderFooter}
            renderSkeletons={renderSkeletons}
            pulseAnim={pulseAnim}
        />
    );

    // Memoized CommunityTokensTab
    const CommunityTokensTabComponent = (
        <CommunityTokensTab
            renderItem={renderFlatListItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            renderSkeletons={renderSkeletons}
        />
    );

    // Adjusted renderScene for TabView
    const renderScene = ({ route }: { route: { key: string } }) => {
        switch (route.key) {
            case 'trending':
                return TrendingTokensTabComponent;
            case 'community':
                return CommunityTokensTabComponent;
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: 46 }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <AppHeader title="Token Feed" showDefaultRightIcons={true} />
            <Animated.View style={[{ opacity: fadeAnim }, { flex: 1 }]}>
                <CustomTabBar index={index} setIndex={setIndex} />
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