import React from 'react';
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

const TrendingTokensTab: React.FC<TrendingTokensTabProps> = ({
    searchQuery = '',
    setSearchQuery = () => {},
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
    
    const {
        trendingTokens,
        filteredTrendingTokens,
        trendingTokensLoading,
        trendingTokensError,
        loadingMoreTrendingTokens
    } = useSelector((state: RootState) => state.tokens);

    return (
        <View style={styles.tabContent}>
            {/* Search Bar for Trending tab */}
            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

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
                />
            )}
        </View>
    );
};

export default React.memo(TrendingTokensTab); 