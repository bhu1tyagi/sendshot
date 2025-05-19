import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from '../TokenFeedScreenStyles';
import { CustomTabBarProps } from '../utils/types';

const CustomTabBar: React.FC<CustomTabBarProps> = ({ index, setIndex }) => {
    return (
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
    );
};

export default React.memo(CustomTabBar); 