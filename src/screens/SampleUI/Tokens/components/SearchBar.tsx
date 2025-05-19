import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@/assets/colors';
import styles from '../TokenFeedScreenStyles';
import { SearchBarProps } from '../utils/types';

// A properly controlled TextInput component that maintains focus and debounces updates
const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery }) => {
    // Local state for immediate feedback
    const [localQuery, setLocalQuery] = useState(searchQuery);
    const inputRef = useRef<TextInput>(null);
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
    const isFocused = useRef(false);

    // Handle text changes with debouncing
    const handleChangeText = useCallback((text: string) => {
        // Update local state immediately for responsive UI
        setLocalQuery(text);

        // Clear any pending debounce
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        // Set a new debounce
        debounceTimeout.current = setTimeout(() => {
            setSearchQuery(text);
        }, 300);
    }, [setSearchQuery]);

    // Clear search with proper cleanup
    const handleClear = useCallback(() => {
        setLocalQuery('');
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        setSearchQuery('');
        inputRef.current?.focus();
        isFocused.current = true;
    }, [setSearchQuery]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    // Sync when searchQuery prop changes externally
    useEffect(() => {
        if (searchQuery !== localQuery) {
            setLocalQuery(searchQuery);
        }
    }, [searchQuery]);

    // Track focus state
    const handleFocus = useCallback(() => {
        isFocused.current = true;
    }, []);

    const handleBlur = useCallback(() => {
        isFocused.current = false;
    }, []);

    // Force focus on the input field after every render if it was focused before
    useEffect(() => {
        // Use a small delay to ensure the UI has stabilized
        const focusTimeout = setTimeout(() => {
            if (isFocused.current && inputRef.current) {
                inputRef.current.focus();
            }
        }, 50);

        return () => clearTimeout(focusTimeout);
    });

    // Also immediately focus on mount
    useEffect(() => {
        inputRef.current?.focus();
        isFocused.current = true;
    }, []);

    return (
        <View
            style={styles.searchContainer}
            onTouchStart={() => {
                inputRef.current?.focus();
                isFocused.current = true;
            }}
        >
            <Ionicons name="search" size={18} color={COLORS.greyMid} style={styles.searchIcon} />
            <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search tokens..."
                placeholderTextColor={COLORS.greyMid}
                value={localQuery}
                onChangeText={handleChangeText}
                onFocus={handleFocus}
                onBlur={handleBlur}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
            />
            {localQuery.length > 0 && (
                <TouchableOpacity
                    onPress={handleClear}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Ionicons name="close-circle" size={18} color={COLORS.greyMid} />
                </TouchableOpacity>
            )}
        </View>
    );
};

export default React.memo(SearchBar); 