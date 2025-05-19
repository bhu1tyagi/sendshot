import React, { useRef, useState, useCallback } from 'react';
import { FlatList, View, Text } from 'react-native';
import styles from '../TokenFeedScreenStyles';
import { StableFlatListProps } from '../utils/types';

const StableTrendingFlatList: React.FC<StableFlatListProps> = ({
    data,
    renderItem,
    keyExtractor,
    getItemLayout,
    handleLoadMore,
    handleScroll,
    handleScrollEnd,
    renderFooter,
    loadingMoreTrendingTokens,
    searchQuery,
    keyboardShouldPersistTaps = 'always'
}) => {
    console.log('[StableTrendingFlatList] Rendering component');
    // Track if onEndReached was called during momentum scroll
    const onEndReachedCalledDuringMomentum = useRef(false);

    // Track if we're already loading more
    const isLoadingMore = useRef(loadingMoreTrendingTokens === true);

    // Update the ref when the prop changes
    React.useEffect(() => {
        isLoadingMore.current = loadingMoreTrendingTokens === true;
    }, [loadingMoreTrendingTokens]);

    // Log when FlatList would become empty
    if (data.length === 0) {
        console.log('[StableTrendingFlatList] Warning: FlatList data is empty');
    }

    // Wrapper for onEndReached to prevent multiple calls during momentum scrolling
    const handleOnEndReached = useCallback(() => {
        if (!onEndReachedCalledDuringMomentum.current && !isLoadingMore.current) {
            if (handleLoadMore) {
                handleLoadMore();
            }
            onEndReachedCalledDuringMomentum.current = true;
        }
    }, [handleLoadMore]);

    // Reset the flag when scrolling ends
    const handleMomentumScrollEnd = useCallback(() => {
        onEndReachedCalledDuringMomentum.current = false;
        if (handleScrollEnd) {
            handleScrollEnd();
        }
    }, [handleScrollEnd]);

    // Reset the flag when user lifts finger
    const handleScrollEndDrag = useCallback(() => {
        onEndReachedCalledDuringMomentum.current = false;
        if (handleScrollEnd) {
            handleScrollEnd();
        }
    }, [handleScrollEnd]);

    return (
        <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={handleOnEndReached}
            onEndReachedThreshold={0.2} // Lower threshold to reduce false triggers
            ListFooterComponent={renderFooter}
            windowSize={21}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={false}
            initialNumToRender={10}
            disableVirtualization={false}
            extraData={loadingMoreTrendingTokens}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            onScrollToIndexFailed={(info) => {
                console.log('[StableTrendingFlatList] Failed to scroll to index:', info);
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
};

export default React.memo(StableTrendingFlatList); 