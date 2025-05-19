import React, { useCallback, memo, useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/shared/state/store';
import { fetchTrendingTokens, TrendingTokenData } from '@/shared/state/tokens';
import styles from '../TokenFeedScreenStyles';
import { TabComponentProps } from '../utils/types';
import SearchBar from './SearchBar';
import StableTrendingFlatList from './StableTrendingFlatList';
import TokenSkeletonLoader from '../TokenSkeletonLoader';
import { searchTokens } from '@/modules/dataModule/services/tokenService';
import { TokenInfo } from '@/modules/dataModule/types/tokenTypes';
import { TokenDisplay } from '../utils/types';

interface TrendingTokensTabProps extends TabComponentProps {
    renderItem: any;
    keyExtractor: any;
    getItemLayout: any;
    handleLoadMore: () => void;
    handleScroll: (event: any) => void;
    handleScrollEnd: () => void;
    renderFooter: () => JSX.Element | null;
    renderSkeletons: () => JSX.Element[];
    pulseAnim: any;
}

// Memoize SearchBar to prevent unnecessary re-renders
const MemoizedSearchBar = memo(SearchBar);

// Memoize the loading skeleton component
const LoadingSkeletons = memo(({ renderSkeletons }: { renderSkeletons: () => JSX.Element[] }) => (
    <View style={styles.listContainer}>
        {renderSkeletons()}
    </View>
));

// Memoize the error component
const ErrorComponent = memo(({ error, onRetry }: { error: string, onRetry: () => void }) => (
    <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
        >
            <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
    </View>
));

// Convert TokenInfo from API to match TrendingTokenData format for UI compatibility
function convertTokenInfoToTrendingFormat(tokens: TokenInfo[]): TrendingTokenData[] {
    return tokens.map((token, index) => ({
        id: `search-${token.address}-${index}`,
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        logoURI: token.logoURI,
        price: token.price || 0,
        price24hChangePercent: token.priceChange24h,
        rank: index + 1
    }));
}

const TrendingTokensTab: React.FC<TrendingTokensTabProps> = ({
    searchQuery = '',
    setSearchQuery = () => { },
    renderItem,
    keyExtractor,
    getItemLayout,
    handleLoadMore,
    handleScroll,
    handleScrollEnd,
    renderFooter,
    renderSkeletons,
    pulseAnim
}) => {
    console.log('[TrendingTokensTab] Rendering component');
    const dispatch = useDispatch();

    // State for API search results
    const [searchResults, setSearchResults] = useState<TrendingTokenData[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Memoize the search query setter to maintain referential equality
    const handleSearchQueryChange = useCallback((query: string) => {
        setSearchQuery(query);
    }, [setSearchQuery]);

    const {
        trendingTokens,
        trendingTokensLoading,
        trendingTokensError,
        loadingMoreTrendingTokens
    } = useSelector((state: RootState) => state.tokens);

    // Effect to perform API search when searchQuery changes
    useEffect(() => {
        // Clear search results when query is empty
        if (!searchQuery || searchQuery.trim() === '') {
            setSearchResults([]);
            setIsSearching(false);
            setSearchError(null);
            return;
        }

        // Set searching state
        setIsSearching(true);
        setSearchError(null);

        // Perform API search
        const performSearch = async () => {
            try {
                const results = await searchTokens({
                    keyword: searchQuery.trim(),
                    limit: 20 // Maximum allowed by Birdeye API (1-20 range)
                });

                // Convert results to compatible format
                const formattedResults = convertTokenInfoToTrendingFormat(results);
                setSearchResults(formattedResults);
            } catch (error) {
                console.error('[TrendingTokensTab] Search error:', error);
                setSearchError('Failed to search tokens. Please try again.');
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        performSearch();
    }, [searchQuery]);

    const handleRetry = useCallback(() => {
        if (searchQuery) {
            // Retry search
            setSearchQuery(searchQuery);
        } else {
            // Retry trending tokens fetch
            dispatch(fetchTrendingTokens(0) as any);
        }
    }, [dispatch, searchQuery, setSearchQuery]);

    // Determine which data to display: search results or trending tokens
    const displayData = useMemo(() => {
        return searchQuery ? searchResults : trendingTokens;
    }, [searchQuery, searchResults, trendingTokens]);

    // Memoize the content based on the current state
    const content = useMemo(() => {
        // Show loading state when either trending tokens are loading (with no data) or search is in progress
        if ((trendingTokensLoading && trendingTokens.length === 0) ||
            (isSearching && searchResults.length === 0)) {
            return <LoadingSkeletons renderSkeletons={renderSkeletons} />;
        }
        // Show error state
        else if ((trendingTokensError && !searchQuery) || (searchError && searchQuery)) {
            const errorMessage = searchQuery && searchError
                ? searchError
                : trendingTokensError || 'An error occurred';

            return <ErrorComponent
                error={errorMessage}
                onRetry={handleRetry}
            />;
        }
        // Show no results state for search
        else if (searchQuery && searchResults.length === 0 && !isSearching) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>No tokens found for "{searchQuery}"</Text>
                </View>
            );
        }
        // Show content
        else {
            return (
                <StableTrendingFlatList
                    data={displayData}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    getItemLayout={getItemLayout}
                    handleLoadMore={!searchQuery ? handleLoadMore : undefined} // Only load more for trending, not search
                    handleScroll={handleScroll}
                    handleScrollEnd={handleScrollEnd}
                    renderFooter={!searchQuery ? renderFooter : () => null} // Only show footer for trending, not search
                    loadingMoreTrendingTokens={!searchQuery && loadingMoreTrendingTokens}
                    searchQuery={searchQuery}
                    keyboardShouldPersistTaps="always"
                />
            );
        }
    }, [
        trendingTokensLoading,
        trendingTokens.length,
        trendingTokensError,
        isSearching,
        searchResults.length,
        searchError,
        searchQuery,
        displayData,
        renderItem,
        keyExtractor,
        getItemLayout,
        handleLoadMore,
        handleScroll,
        handleScrollEnd,
        renderFooter,
        loadingMoreTrendingTokens,
        renderSkeletons,
        handleRetry
    ]);

    return (
        <View style={styles.tabContent}>
            {/* Search Bar for Trending tab - use memoized version */}
            <MemoizedSearchBar
                searchQuery={searchQuery}
                setSearchQuery={handleSearchQueryChange}
            />

            {/* Memoized content */}
            {content}
        </View>
    );
};

// Custom equality check to minimize re-renders
export default memo(TrendingTokensTab, (prevProps, nextProps) => {
    // Only re-render when these critical props change
    return (
        prevProps.searchQuery === nextProps.searchQuery &&
        prevProps.renderItem === nextProps.renderItem &&
        prevProps.pulseAnim === nextProps.pulseAnim
    );
}); 