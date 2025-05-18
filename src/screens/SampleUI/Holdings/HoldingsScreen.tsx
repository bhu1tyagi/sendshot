import React, { useEffect, useState } from 'react';
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
import TokenDetailsSheet from '@/core/sharedUI/TrendingTokenDetails/TokenDetailsSheet';
import Icons from '@/assets/svgs';

// New asynchronous helper function to extract the actual image URL
async function extractActualImageUrl(metadataValue?: string): Promise<string | undefined> {
    if (!metadataValue) return undefined;

    let contentToParse = metadataValue;

    // If metadataValue is a URL, fetch its content.
    if (metadataValue.startsWith('http')) {
        try {
            console.log(`Fetching metadata from URL: ${metadataValue}`);
            const response = await fetch(metadataValue);
            if (!response.ok) {
                console.error(`Failed to fetch metadata from URL ${metadataValue}: ${response.statusText}`);
                // If fetching fails, maybe the URL itself was an image (less likely for this case)
                // or we fallback to trying to parse the original metadataValue string if it wasn't a URL.
                // For now, if fetch fails, we can't get the JSON, so we might return undefined or try parsing original string later.
                contentToParse = metadataValue; // Keep original value for further attempts if it's not http or for regex
            } else {
                contentToParse = await response.text();
                console.log(`Fetched content to parse: ${contentToParse.substring(0, 100)}...`);
            }
        } catch (fetchError) {
            console.error(`Network error fetching metadata from URL ${metadataValue}: ${fetchError}`);
            // If network error, fallback to trying to parse original string or direct use if it's an image URL
            contentToParse = metadataValue; // Keep original value
        }
    }

    // Try to parse contentToParse (which is either fetched text or original metadataValue) as JSON
    try {
        const jsonData = JSON.parse(contentToParse);
        if (jsonData && typeof jsonData.image === 'string' && jsonData.image.startsWith('http')) {
            console.log('Extracted image from parsed JSON:', jsonData.image);
            return jsonData.image;
        } else {
            console.warn('Parsed JSON, but "image" field is missing, not a string, or not a URL:', jsonData);
        }
    } catch (jsonError) {
        // This means contentToParse was not valid JSON.
        // It could be the original metadataValue if it wasn't a URL, or if fetching a URL returned non-JSON.
        console.warn(`Failed to parse content as JSON. Content: "${contentToParse.substring(0, 100)}..." Error: ${jsonError}`);

        // Fallback: Try regex on contentToParse (original string or fetched content)
        const imageMatch = contentToParse.match(/"image"\s*:\s*"([^"]+)"/);
        if (imageMatch && imageMatch[1] && imageMatch[1].startsWith('http')) {
            console.log("Found image via regex fallback on content:", imageMatch[1]);
            return imageMatch[1];
        }
    }

    // Final fallback: if the original metadataValue was an http link and didn't yield an image through JSON,
    // but it *looks* like an image URL itself (e.g. ends with .png).
    if (metadataValue.startsWith('http') && /\.(jpeg|jpg|gif|png|webp)$/i.test(metadataValue)) {
        console.log('Using original metadataValue as direct image URL:', metadataValue);
        return metadataValue;
    }

    console.log('Could not extract a valid image URL from:', metadataValue);
    return undefined;
}


// New Token Item Component
interface TokenListItemProps {
    item: TokenData;
    onPress: (token: TokenData) => void;
}

const TokenListItem: React.FC<TokenListItemProps> = ({ item, onPress }) => {
    const [resolvedImageUrl, setResolvedImageUrl] = useState<string | undefined>(undefined);
    const [isLoadingImage, setIsLoadingImage] = useState(true);

    // Protocol logos mapping
    const getProtocolLogo = () => {
        if (!item.protocolType) return null;

        switch (item.protocolType) {
            case 'pumpfun':
                return <Image source={require('@/assets/images/Pumpfun_logo.png')} style={styles.protocolLogo} />;
            case 'raydium':
                return <Icons.RadyuimIcom width={18} height={18} color="#F5C05E" />;
            case 'tokenmill':
                return <Icons.TokenMillIcon width={18} height={18} color={COLORS.white} />;
            case 'meteora':
                return <Image source={require('@/assets/images/meteora.jpg')} style={styles.protocolLogo} />;
            default:
                return null;
        }
    };

    useEffect(() => {
        let isActive = true;
        setIsLoadingImage(true);

        async function loadImage() {
            let imageUrl = await extractActualImageUrl(item.metadataURI);

            if (!imageUrl && item.logoURI?.startsWith('http')) {
                imageUrl = item.logoURI;
            }

            if (isActive) {
                setResolvedImageUrl(imageUrl);
                setIsLoadingImage(false);
            }
        }

        loadImage();

        return () => {
            isActive = false;
        };
    }, [item.metadataURI, item.logoURI, item.name]);

    const changeValue = (item.priceChange24h !== undefined && item.priceChange24h !== null) ? item.priceChange24h : 0;
    const changeColor = changeValue >= 0 ? '#4CAF50' : COLORS.errorRed;
    const currentPriceVal = item.currentPrice ?? 0;
    const initialPriceVal = item.initialPrice ?? 0;
    const displayPrice = currentPriceVal || initialPriceVal;

    return (
        <TouchableOpacity
            style={styles.tokenCard}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            {/* Token logo */}
            <View style={styles.tokenLogoContainer}>
                {isLoadingImage ? (
                    <ActivityIndicator size="small" color={COLORS.brandPrimary} />
                ) : (
                    <Image
                        source={{ uri: resolvedImageUrl }}
                        style={styles.tokenLogo}
                        defaultSource={require('@/assets/images/SENDlogo.png')}
                    />
                )}
            </View>

            {/* Middle content */}
            <View style={styles.cardContent}>
                <View style={styles.tokenNameSection}>
                    <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                    <Text style={styles.tokenName}>{item.name}</Text>
                </View>

                {/* Protocol badge */}
                {item.protocolType && (
                    <View style={styles.protocolContainer}>
                        <View style={styles.protocolIconContainer}>
                            {getProtocolLogo()}
                        </View>
                        <Text style={styles.protocolText}>
                            {item.protocolType.charAt(0).toUpperCase() + item.protocolType.slice(1)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Price section */}
            <View style={styles.priceSection}>
                <Text style={styles.tokenPrice}>${displayPrice.toFixed(4)}</Text>
                <Text style={[styles.tokenChange, { color: changeColor }]}>
                    {changeValue >= 0 ? '+' : ''}{changeValue.toFixed(2)}%
                </Text>
            </View>
        </TouchableOpacity>
    );
};


const HoldingsScreen = () => {
    const dispatch = useDispatch();
    const { address } = useSelector((state: RootState) => state.auth);
    const { userTokens, loading, error } = useSelector((state: RootState) => state.tokens);

    const userTokensList: TokenData[] = address && userTokens[address] ? userTokens[address] : [];

    const [selectedToken, setSelectedToken] = useState<any>(null);
    const [isTokenDetailsVisible, setIsTokenDetailsVisible] = useState(false);

    useEffect(() => {
        if (address) {
            dispatch(fetchUserTokens(address) as any);
        }
    }, [dispatch, address]);

    const handleTokenPress = (token: TokenData) => {
        setSelectedToken({
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            logoURI: token.logoURI, // Will be replaced by resolved image in TokenDetailsSheet
            metadataURI: token.metadataURI,
            price: token.currentPrice || token.initialPrice,
            priceChange24h: token.priceChange24h || 0,
        });
        setIsTokenDetailsVisible(true);
    };

    // Use the new TokenListItem in the FlatList
    const renderTokenItemFlatList = ({ item }: { item: TokenData }) => {
        return <TokenListItem item={item} onPress={handleTokenPress} />;
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
                renderItem={renderTokenItemFlatList} // Updated here
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

            {selectedToken && (
                <TokenDetailsSheet
                    visible={isTokenDetailsVisible}
                    onClose={() => setIsTokenDetailsVisible(false)}
                    token={selectedToken} // TokenDetailsSheet will need its own async image logic
                />
            )}
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.lighterBackground,
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    tokenLogoContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.darkerBackground,
        overflow: 'hidden',
        position: 'relative',
    },
    tokenLogo: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    cardContent: {
        flex: 1,
        marginLeft: 12,
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
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    protocolIconContainer: {
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    protocolLogo: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    protocolText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
        fontWeight: '500',
    },
    priceSection: {
        alignItems: 'flex-end',
    },
    tokenPrice: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: '600',
        color: COLORS.white,
        letterSpacing: TYPOGRAPHY.letterSpacing,
    },
    tokenChange: {
        fontSize: TYPOGRAPHY.size.xs,
        marginTop: 2,
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