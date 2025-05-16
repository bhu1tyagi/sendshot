import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
} from 'react-native';
import AppHeader from '@/core/sharedUI/AppHeader';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';

// Dummy data for user's created tokens
const dummyUserTokens = [
    {
        id: '1',
        name: 'LaunchPad Token',
        symbol: 'LPT',
        logoURI: 'https://cryptologos.cc/logos/solana-sol-logo.png',
        createdAt: '2023-11-15T10:30:00Z',
        initialPrice: 0.05,
        currentPrice: 0.12,
        change: 140,
        totalSupply: '1,000,000',
        holders: 145,
    },
    {
        id: '2',
        name: 'Community DAO',
        symbol: 'CDAO',
        logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        createdAt: '2023-12-10T14:20:00Z',
        initialPrice: 0.02,
        currentPrice: 0.015,
        change: -25,
        totalSupply: '10,000,000',
        holders: 78,
    },
    {
        id: '3',
        name: 'GameFi Project',
        symbol: 'GFP',
        logoURI: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
        createdAt: '2024-01-05T09:15:00Z',
        initialPrice: 0.008,
        currentPrice: 0.023,
        change: 187.5,
        totalSupply: '5,000,000',
        holders: 210,
    },
    {
        id: '4',
        name: 'Metaverse Token',
        symbol: 'META',
        logoURI: 'https://cryptologos.cc/logos/chainlink-link-logo.png',
        createdAt: '2024-02-20T16:45:00Z',
        initialPrice: 0.1,
        currentPrice: 0.095,
        change: -5,
        totalSupply: '2,000,000',
        holders: 56,
    },
    {
        id: '5',
        name: 'DeFi Protocol',
        symbol: 'DEFI',
        logoURI: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
        createdAt: '2024-03-15T11:30:00Z',
        initialPrice: 0.03,
        currentPrice: 0.075,
        change: 150,
        totalSupply: '8,000,000',
        holders: 123,
    },
];

const HoldingsScreen = () => {
    const renderTokenItem = ({ item }) => {
        // Format date
        const createdDate = new Date(item.createdAt);
        const formattedDate = `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        // Set color based on price change
        const changeColor = item.change >= 0 ? '#4CAF50' : COLORS.errorRed;

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
                        <Text style={styles.tokenPrice}>${item.currentPrice.toFixed(4)}</Text>
                        <Text style={[styles.tokenChange, { color: changeColor }]}>
                            {item.change >= 0 ? '+' : ''}{item.change}%
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
                        <Text style={styles.detailValue}>{item.holders}</Text>
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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <AppHeader title="Your Tokens" showDefaultRightIcons={true} />

            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Launch History</Text>
                <Text style={styles.headerSubtitle}>Tokens you've created</Text>
            </View>

            <FlatList
                data={dummyUserTokens}
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
});

export default HoldingsScreen; 