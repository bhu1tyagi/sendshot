import React from 'react';
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
    searchQuery
}) => {
    console.log('[StableTrendingFlatList] Rendering component');
    
    // Log when FlatList would become empty
    if (data.length === 0) {
        console.log('[StableTrendingFlatList] Warning: FlatList data is empty');
    }
    
    return (
        <FlatList
            data={data}
            renderItem={renderItem}
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
            extraData={loadingMoreTrendingTokens}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
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