import React from 'react';
import { FlatList, View, Text } from 'react-native';
import styles from '../TokenFeedScreenStyles';
import { StableFlatListProps } from '../utils/types';

const StableCommunityFlatList: React.FC<StableFlatListProps> = ({
    data,
    renderItem,
    keyExtractor,
    getItemLayout
}) => {
    console.log('[StableCommunityFlatList] Rendering component');
    
    return (
        <FlatList
            data={data}
            renderItem={renderItem}
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
};

export default React.memo(StableCommunityFlatList); 