import React from 'react';
import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/shared/state/store';
import { TokenData } from '@/shared/state/tokens';
import styles from '../TokenFeedScreenStyles';
import { TabComponentProps } from '../utils/types';
import StableCommunityFlatList from './StableCommunityFlatList';

interface CommunityTokensTabProps extends TabComponentProps {
    renderItem: any;
    keyExtractor: any;
    getItemLayout: any;
    renderSkeletons: () => JSX.Element[];
}

const CommunityTokensTab: React.FC<CommunityTokensTabProps> = ({
    renderItem,
    keyExtractor,
    getItemLayout,
    renderSkeletons
}) => {
    console.log('[CommunityTokensTab] Rendering component');
    
    const {
        allTokens,
        loading: loadingAllTokens,
        error: errorAllTokens
    } = useSelector((state: RootState) => state.tokens);

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
                <StableCommunityFlatList
                    data={allTokens as TokenData[]}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    getItemLayout={getItemLayout}
                />
            )}
        </View>
    );
};

export default React.memo(CommunityTokensTab); 