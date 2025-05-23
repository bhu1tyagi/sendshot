import { StyleSheet, Dimensions, Platform } from 'react-native';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';

const { width } = Dimensions.get('window');
const TAB_WIDTH = (width - 32) / 2;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        height: 55,
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 16,
        backgroundColor: COLORS.lighterBackground,
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.07)',
        overflow: 'hidden',
    },
    tabIndicator: {
        position: 'absolute',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.brandPrimary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 5,
            },
            android: {
                shadowColor: 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
                elevation: 0,
            },
        }),
    },
    tabButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tabText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: '600',
        color: COLORS.greyMid,
        marginLeft: 6,
    },
    activeTabText: {
        color: COLORS.brandPrimary,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: '700',
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
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    tokenCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                elevation: 4,
                shadowColor: COLORS.brandPrimary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 0,
                shadowColor: 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
            },
        }),
        overflow: 'hidden',
    },
    cardGradient: {
        flexDirection: 'column',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    tokenLogoContainer: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.darkerBackground,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        ...Platform.select({
            ios: {
                shadowColor: COLORS.brandPrimary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
            },
            android: {
                shadowColor: 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
                elevation: 0,
            },
        }),
    },
    glowEffect: {
        position: 'absolute',
        top: -5,
        left: -5,
        right: -5,
        bottom: -5,
        borderRadius: 30,
        backgroundColor: 'transparent',
        ...Platform.select({
            ios: {
                shadowColor: COLORS.brandPrimary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 10,
            },
            android: {
                shadowColor: 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
                elevation: 0,
            },
        }),
    },
    tokenLogo: {
        width: 42,
        height: 42,
        borderRadius: 21,
    },
    cardContent: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    tokenNameSection: {
        justifyContent: 'center',
    },
    tokenSymbol: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenName: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.greyMid,
        marginTop: 2,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    protocolContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    protocolIconContainer: {
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    protocolLogo: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    protocolText: {
        fontSize: 10,
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
        fontWeight: '500',
    },
    priceSection: {
        width: 120,
        alignItems: 'flex-end',
    },
    priceContainer: {
        alignItems: 'flex-end',
        marginLeft: 12,
        minWidth: 80,
    },
    tokenPrice: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenChange: {
        fontSize: 10,
        marginTop: 2,
        letterSpacing: TYPOGRAPHY.letterSpacing,
        fontWeight: '600',
    },
    balanceContainer: {
        marginTop: 6,
        padding: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 8,
        alignItems: 'flex-end',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    balanceText: {
        fontSize: 10,
        color: COLORS.white,
        fontWeight: '500',
    },
    valueText: {
        fontSize: 10,
        color: COLORS.greyMid,
        marginTop: 2,
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
        fontWeight: '600',
        color: COLORS.errorRed,
        marginBottom: 8,
    },
    errorSubText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.greyMid,
        textAlign: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 30,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: '600',
        color: COLORS.white,
        textAlign: 'center',
        letterSpacing: TYPOGRAPHY.letterSpacing,
        marginTop: 16,
    },
    emptySubText: {
        marginTop: 8,
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.greyMid,
        textAlign: 'center',
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    // Holdings tab styles
    holdingsScrollView: {
        flex: 1,
    },
    holdingsContentContainer: {
        paddingBottom: 100,
    },
    statsContainer: {
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: COLORS.brandPrimary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 4,
            },
            android: {
                elevation: 0,
                shadowColor: 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
                borderWidth: 1,
                borderColor: 'rgba(80,120,180,0.12)', // subtle border for separation
            },
        }),
    },
    statsGradient: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    statSection: {
        flex: 1,
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        marginHorizontal: 15,
    },
    statLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.greyMid,
        marginBottom: 6,
        fontWeight: '500',
    },
    statValue: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: '700',
        color: COLORS.white,
    },
    statChange: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: '600',
    },
    viewAllButton: {
        marginTop: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    viewAllText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.brandPrimary,
        fontWeight: '600',
    },
    holdingsHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    holdingsHeaderTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: '700',
        color: COLORS.white,
    },
    emptyHoldingsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
        paddingHorizontal: 30,
    },
    getTokensButton: {
        marginTop: 16,
        backgroundColor: COLORS.brandPrimary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    getTokensText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.white,
        fontWeight: '600',
    },
    // Trading action button styles
    actionButtonsContainer: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
        width: '100%',
    },
    actionRow: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
        gap: 8,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        flexDirection: 'row',
        ...Platform.select({
            ios: {
                elevation: 2,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
            },
            android: {
                elevation: 0,
                shadowColor: 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0,
                shadowRadius: 0,
                borderWidth: 1,
                borderColor: 'rgba(80,120,180,0.12)', // subtle border for separation
            },
        }),
    },
    buyButton: {
        backgroundColor: 'rgba(50, 212, 222, 0.2)',
        borderColor: COLORS.brandPrimary,
        shadowColor: COLORS.brandPrimary,
    },
    sellButton: {
        backgroundColor: 'rgba(245, 57, 135, 0.2)',
        borderColor: COLORS.brandPink,
        shadowColor: COLORS.brandPink,
    },
    actionButtonText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.white,
    },
    // Enhanced token card layout
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    tokenInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    detailsContainer: {
        marginLeft: 10,
        flex: 1,
    },
});

export default styles; 