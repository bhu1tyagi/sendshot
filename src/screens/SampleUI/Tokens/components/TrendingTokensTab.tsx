import React, { useCallback, memo, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/shared/state/store';
import { fetchTrendingTokens } from '@/shared/state/tokens';
import styles from '../TokenFeedScreenStyles';
import { TabComponentProps } from '../utils/types';
import SearchBar from './SearchBar';
import StableTrendingFlatList from './StableTrendingFlatList';
import TokenSkeletonLoader from '../TokenSkeletonLoader';

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

    // Memoize the search query setter to maintain referential equality
    const handleSearchQueryChange = useCallback((query: string) => {
        setSearchQuery(query);
    }, [setSearchQuery]);

    const {
        trendingTokens,
        filteredTrendingTokens,
        trendingTokensLoading,
        trendingTokensError,
        loadingMoreTrendingTokens
    } = useSelector((state: RootState) => state.tokens);

    const handleRetry = useCallback(() => {
        dispatch(fetchTrendingTokens(0) as any);
    }, [dispatch]);

    // Memoize the content based on the current state
    const content = useMemo(() => {
        if (trendingTokensLoading && trendingTokens.length === 0) {
            return <LoadingSkeletons renderSkeletons={renderSkeletons} />;
        } else if (trendingTokensError) {
            return <ErrorComponent error={trendingTokensError} onRetry={handleRetry} />;
        } else {
            return (
                <StableTrendingFlatList
                    data={filteredTrendingTokens}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    getItemLayout={getItemLayout}
                    handleLoadMore={handleLoadMore}
                    handleScroll={handleScroll}
                    handleScrollEnd={handleScrollEnd}
                    renderFooter={renderFooter}
                    loadingMoreTrendingTokens={loadingMoreTrendingTokens}
                    searchQuery={searchQuery}
                    keyboardShouldPersistTaps="always"
                />
            );
        }
    }, [
        trendingTokensLoading,
        trendingTokens.length,
        trendingTokensError,
        filteredTrendingTokens,
        renderItem,
        keyExtractor,
        getItemLayout,
        handleLoadMore,
        handleScroll,
        handleScrollEnd,
        renderFooter,
        loadingMoreTrendingTokens,
        searchQuery,
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
export default memo(TrendingTokensTab); 