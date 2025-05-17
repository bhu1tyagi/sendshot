import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AppHeader from '@/core/sharedUI/AppHeader';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import { RootState } from '@/shared/state/store';
import { fetchUserTokens } from '@/shared/state/tokens';
import { TokenData } from '@/shared/state/tokens/reducer';

const HoldingsScreen = () => {
    const dispatch = useDispatch();
    const { address } = useSelector((state: RootState) => state.auth);
    const { userTokens, loading, error } = useSelector((state: RootState) => state.tokens);
    
    // Get the current user's tokens
    const userTokensList: TokenData[] = address && userTokens[address] ? userTokens[address] : [];

    useEffect(() => {
        if (address) {
            dispatch(fetchUserTokens(address) as any);
        }
    }, [dispatch, address]);

    const renderTokenItem = ({ item }: { item: TokenData }) => {
        // Format date
        const createdDate = new Date(item.createdAt);
        const formattedDate = `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        // Set color based on price change
        const changeColor = (item.priceChange24h ?? 0) >= 0 ? '#4CAF50' : COLORS.errorRed;
        const changeValue = item.priceChange24h !== undefined ? item.priceChange24h : 0;

        return (
            <View style={styles.tokenCard}>
                <View style={styles.tokenHeader}>
                    <View style={styles.tokenLogoContainer}>
                        <Image
                            source={{ uri: item.logoURI }}
                            style={styles.tokenLogo}
                            defaultSource={require('@/assets/images/SENDlogo.png')}
                        />
                    </View>
                    <View style={styles.tokenTitleContainer}>
                        <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                        <Text style={styles.tokenName}>{item.name}</Text>
                    </View>
                    <View style={styles.tokenMetrics}>
                        <Text style={styles.tokenPrice}>${(item.currentPrice || item.initialPrice).toFixed(4)}</Text>
                        <Text style={[styles.tokenChange, { color: changeColor }]}>
                            {changeValue >= 0 ? '+' : ''}{changeValue.toFixed(2)}%
                        </Text>
                    </View>
                </View>

                <View style={styles.tokenDetails}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Created On:</Text>
                        <Text style={styles.detailValue}>{formattedDate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Initial Price:</Text>
                        <Text style={styles.detailValue}>${item.initialPrice.toFixed(4)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total Supply:</Text>
                        <Text style={styles.detailValue}>{item.totalSupply}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Holders:</Text>
                        <Text style={styles.detailValue}>{item.holders || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.tokenActions}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>View Details</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={COLORS.brandPrimary} />
                    <Text style={styles.loaderText}>Loading your tokens...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Error loading tokens</Text>
                    <Text style={styles.errorSubText}>{error}</Text>
                </View>
            );
        }

        return (
            <FlatList
                data={userTokensList}
                renderItem={renderTokenItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>You haven't created any tokens yet</Text>
                        <Text style={styles.emptySubText}>Your launched tokens will appear here</Text>
                    </View>
                }
            />
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <AppHeader title="Your Tokens" showDefaultRightIcons={true} />

            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Launch History</Text>
                <Text style={styles.headerSubtitle}>Tokens you've created</Text>
            </View>

            {renderContent()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: String(TYPOGRAPHY.bold) as any,
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    headerSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.greyMid,
        marginTop: 4,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 100, // Extra padding for bottom tab bar
    },
    tokenCard: {
        backgroundColor: COLORS.lighterBackground,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    tokenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    tokenLogoContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.darkerBackground,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
    },
    tokenLogo: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    tokenTitleContainer: {
        flex: 1,
        marginLeft: 12,
    },
    tokenSymbol: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: String(TYPOGRAPHY.bold) as any,
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenName: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.greyMid,
        marginTop: 2,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenMetrics: {
        alignItems: 'flex-end',
    },
    tokenPrice: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenChange: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: String(TYPOGRAPHY.medium) as any,
        marginTop: 2,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenDetails: {
        marginBottom: 16,
        backgroundColor: COLORS.darkerBackground,
        borderRadius: 12,
        padding: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.greyMid,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    detailValue: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.white,
        fontWeight: String(TYPOGRAPHY.medium) as any,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionButton: {
        backgroundColor: COLORS.brandPrimary,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 30,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        color: COLORS.white,
        textAlign: 'center',
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    emptySubText: {
        marginTop: 8,
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.greyMid,
        textAlign: 'center',
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loaderText: {
        marginTop: 16,
        fontSize: TYPOGRAPHY.size.md,
        color: COLORS.greyLight,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: String(TYPOGRAPHY.semiBold) as any,
        color: COLORS.errorRed,
        marginBottom: 8,
    },
    errorSubText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.greyMid,
        textAlign: 'center',
    },
});

export default HoldingsScreen; 