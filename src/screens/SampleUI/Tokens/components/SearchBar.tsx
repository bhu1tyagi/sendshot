import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/assets/colors';
import styles from '../TokenFeedScreenStyles';
import { SearchBarProps } from '../utils/types';

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery }) => {
    const handleSearch = (text: string) => {
        setSearchQuery(text);
    };

    return (
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
    );
};

export default React.memo(SearchBar); 