import React, { useEffect, useState, useRef, useMemo } from 'react';
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
    Animated,
    Dimensions,
    ScrollView,
    Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '@/core/sharedUI/AppHeader';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import { RootState } from '@/shared/state/store';
import { fetchUserTokens, fetchWalletTokens, TokenData, WalletTokenData, updateTokenBalance } from '@/shared/state/tokens';
import TokenDetailsSheet from '@/core/sharedUI/TrendingTokenDetails/TokenDetailsSheet';
import SwapDrawer from '@/core/sharedUI/SwapDrawer/SwapDrawer';
import Icons from '@/assets/svgs';
import styles from './HoldingsScreen.styles';
import { IPFSAwareImage } from '@/shared/utils/IPFSImage';

// Get TAB_WIDTH from Dimensions
const { width } = Dimensions.get('window');
const TAB_WIDTH = (width - 32) / 2;

// New asynchronous helper function to extract the actual image URL
async function extractActualImageUrl(metadataValue?: string): Promise<string | undefined> {
    const forAndroid = Platform.OS === 'android';
    if (!metadataValue) {
        if (forAndroid) console.log('[Android Img Debug H] metadataValue is undefined or empty');
        return undefined;
    }

    if (forAndroid) console.log(`[Android Img Debug H] Initial metadataValue: ${metadataValue}`);

    // Pattern to check for common image file extensions or IPFS direct links
    const imagePattern = /\.(jpeg|jpg|gif|png|webp)$/i;
    // Matches /ipfs/Qm..., ipfs://Qm..., or just Qm...
    const ipfsHashPattern = /(?:\/ipfs\/|ipfs:\/\/)?(Qm[1-9A-HJ-NP-Za-km-z]{44})/i;
    const ipfsHashMatch = metadataValue.match(ipfsHashPattern);

    // 1. If it's an IPFS hash (Qm...), construct URL with a reliable gateway.
    // This also handles ipfs://Qm... and /ipfs/Qm... by extracting the hash.
    if (ipfsHashMatch && ipfsHashMatch[1]) {
        const hash = ipfsHashMatch[1];
        const primaryGateway = 'https://gateway.pinata.cloud/ipfs/';
        const directIpfsImageUrl = `${primaryGateway}${hash}`;
        if (forAndroid) console.log(`[Android Img Debug H] Detected IPFS hash ${hash}, formed direct URL: ${directIpfsImageUrl}`);
        // Now check if this direct URL is what we should try to fetch metadata from, OR if it's the image itself.
        // For now, let's assume if we got a hash, it might be part of a metadata URL or a direct image.
        // We'll try to fetch if it's a full URL, otherwise, this becomes a candidate if it's just a hash.
        // If metadataValue itself IS the directIpfsImageUrl (or similar from another gateway but same hash)
        // OR if metadataValue was JUST ipfs://HASH or /ipfs/HASH or HASH.
        // We should check if it's a JSON metadata or direct image.
        // Let's try fetching it as metadata first if it's a full URL.
    }


    // 2. Check if metadataValue itself is a direct HTTP/S image URL
    if (metadataValue.startsWith('http') && imagePattern.test(metadataValue)) {
        if (forAndroid) console.log(`[Android Img Debug H] Using metadataValue as direct image URL (http, known extension): ${metadataValue}`);
        return metadataValue;
    }

    // 3. If metadataValue is an HTTP/S URL (could be JSON metadata or an image not caught by extension)
    let contentToParse = metadataValue;
    let fetchedSuccessfully = false;
    let isLikelyDirectImageFromFetch = false;

    // MODIFIED PART FOR ANDROID + IPFS.IO METADATA
    let urlToFetchMetadata = metadataValue;
    if (forAndroid && metadataValue.startsWith('https://ipfs.io/ipfs/')) {
        const potentialPinataMetadataUrl = metadataValue.replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/');
        if (forAndroid) console.log(`[Android Img Debug H] Original metadata URL is ipfs.io. Prioritizing Pinata for metadata fetch: ${potentialPinataMetadataUrl}`);
        urlToFetchMetadata = potentialPinataMetadataUrl;
    }
    // END MODIFIED PART

    if (urlToFetchMetadata.startsWith('http')) {
        if (forAndroid) console.log(`[Android Img Debug H] metadataValue is HTTP URL, attempting to fetch: ${urlToFetchMetadata}`);
        try {
            const response = await fetch(urlToFetchMetadata, { headers: { 'Accept': 'application/json, text/plain, image/*' } });
            if (!response.ok) {
                if (forAndroid) console.error(`[Android Img Debug H] Failed to fetch from URL ${urlToFetchMetadata}: ${response.status} ${response.statusText}`);
                // If Pinata metadata fetch failed, and original was ipfs.io, try original ipfs.io as a last resort for metadata
                if (forAndroid && urlToFetchMetadata.includes('gateway.pinata.cloud') && metadataValue.startsWith('https://ipfs.io/ipfs/')) {
                    if (forAndroid) console.log(`[Android Img Debug H] Pinata metadata fetch failed. Retrying with original ipfs.io URL: ${metadataValue}`);
                    const fallbackResponse = await fetch(metadataValue, { headers: { 'Accept': 'application/json, text/plain, image/*' } });
                    if (!fallbackResponse.ok) {
                        if (forAndroid) console.error(`[Android Img Debug H] Fallback fetch from original ipfs.io URL ${metadataValue} also failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
                    } else {
                        const contentType = fallbackResponse.headers.get('content-type');
                        if (contentType && contentType.startsWith('image/')) {
                            if (forAndroid) console.log(`[Android Img Debug H] Fallback Fetched content is an image (Content-Type: ${contentType}). Using URL directly: ${metadataValue}`);
                            return metadataValue;
                        }
                        contentToParse = await fallbackResponse.text();
                        if (forAndroid) console.log(`[Android Img Debug H] Fallback Fetched text content (first 100 chars): ${contentToParse.substring(0, 100)}...`);
                        fetchedSuccessfully = true;
                    }
                }
            } else {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.startsWith('image/')) {
                    if (forAndroid) console.log(`[Android Img Debug H] Fetched content is an image (Content-Type: ${contentType}). Using URL directly: ${urlToFetchMetadata}`);
                    isLikelyDirectImageFromFetch = true; // The URL itself is the image.
                    // No need to parse, return the original URL.
                    return urlToFetchMetadata;
                }
                // If not an image, try to get text for JSON parsing
                contentToParse = await response.text();
                if (forAndroid) console.log(`[Android Img Debug H] Fetched text content (first 100 chars): ${contentToParse.substring(0, 100)}...`);
                fetchedSuccessfully = true;
            }
        } catch (fetchError: any) {
            if (forAndroid) console.error(`[Android Img Debug H] Network error fetching from URL ${urlToFetchMetadata}: ${fetchError.message || fetchError}`);
        }
    } else if (ipfsHashMatch && ipfsHashMatch[1] && !urlToFetchMetadata.startsWith('http')) {
        // This case handles raw "Qm..." or "ipfs://Qm..."
        // Construct a URL with a primary gateway and assume it's a direct image link.
        const hash = ipfsHashMatch[1];
        const primaryGateway = 'https://gateway.pinata.cloud/ipfs/';
        const constructedImageUrl = `${primaryGateway}${hash}`;
        if (forAndroid) console.log(`[Android Img Debug H] metadataValue was raw IPFS hash/URI '${urlToFetchMetadata}', constructed direct image URL: ${constructedImageUrl}`);
        return constructedImageUrl;
    }

    let tryParseJson = false;
    if (fetchedSuccessfully && urlToFetchMetadata.startsWith('http')) {
        tryParseJson = (typeof contentToParse === 'string' && contentToParse.trim().startsWith('{') && contentToParse.trim().endsWith('}'));
        if (forAndroid && !tryParseJson) {
            console.log(`[Android Img Debug H] Fetched HTTP content, but it doesn't look like a simple JSON object. Content (first 100): ${contentToParse.substring(0, 100)}`);
        }
    } else if (!urlToFetchMetadata.startsWith('http') && typeof contentToParse === 'string') {
        tryParseJson = (contentToParse.trim().startsWith('{') && contentToParse.trim().endsWith('}'));
        if (forAndroid && !tryParseJson) {
            console.log(`[Android Img Debug H] Non-HTTP metadataValue, and it doesn't look like a simple JSON object. Content (first 100): ${contentToParse.substring(0, 100)}`);
        }
    }

    if (tryParseJson) {
        if (forAndroid) {
            console.log(`[Android Img Debug H] PRE-PARSE CHECK. Content being sent to JSON.parse (first 200 chars): ${contentToParse.substring(0, 200)}...`);
        }
        try {
            const jsonData = JSON.parse(contentToParse);
            if (jsonData && typeof jsonData.image === 'string' && jsonData.image.startsWith('http')) {
                if (forAndroid) console.log(`[Android Img Debug H] Extracted image from parsed JSON: ${jsonData.image}`);
                return jsonData.image;
            } else {
                if (forAndroid) console.warn('[Android Img Debug H] Parsed JSON, but "image" field is missing, not a string, or not a valid http(s) URL:', jsonData.image || 'image field missing/invalid');
            }
        } catch (jsonError: any) {
            if (forAndroid) console.warn(`[Android Img Debug H] JSON.parse FAILED. Error: ${jsonError.message || jsonError}. Content that failed (first 200 chars): "${contentToParse.substring(0, 200)}..."`);
        }
    } else if (fetchedSuccessfully && urlToFetchMetadata.startsWith('http')) {
        // This case means we fetched HTTP content, it wasn't a direct image, and it didn't look like parseable JSON.
        if (forAndroid) console.log(`[Android Img Debug H] HTTP content fetched for ${urlToFetchMetadata} was not a direct image and not identified as JSON for parsing.`);
    }

    // 5. Fallback: If original metadataValue was a string containing JSON-like "image" field (but not perfectly formatted JSON)
    // This is less reliable and should ideally be handled by proper JSON.
    if (typeof urlToFetchMetadata === 'string') {
        const imageRegexMatch = urlToFetchMetadata.match(/"image"\s*:\s*"([^"]+)"/);
        if (imageRegexMatch && imageRegexMatch[1] && imageRegexMatch[1].startsWith('http')) {
            if (forAndroid) console.log(`[Android Img Debug H] Found image via regex fallback on original metadataValue string: ${imageRegexMatch[1]}`);
            return imageRegexMatch[1];
        }
    }

    // 6. If we identified an IPFS hash earlier (ipfsHashMatch) and haven't returned an image yet,
    // it implies direct linking or JSON parsing from it failed.
    // Try constructing a direct image URL with the hash.
    if (ipfsHashMatch && ipfsHashMatch[1]) {
        const hash = ipfsHashMatch[1];
        const primaryGateway = 'https://gateway.pinata.cloud/ipfs/';
        const fallbackImageUrl = `${primaryGateway}${hash}`;
        if (forAndroid) console.log(`[Android Img Debug H] Fallback: Using IPFS hash ${hash} to form direct URL: ${fallbackImageUrl}`);
        return fallbackImageUrl;
    }

    if (forAndroid) console.log(`[Android Img Debug H] Could not extract a valid image URL from: ${urlToFetchMetadata}`);
    return undefined;
}

// Tab component
interface TabComponentProps {
    activeTab: number;
    setActiveTab: (tab: number) => void;
}

const TabComponent: React.FC<TabComponentProps> = ({ activeTab, setActiveTab }) => {
    const translateX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(translateX, {
            toValue: activeTab === 0 ? 0 : TAB_WIDTH,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    }, [activeTab]);

    return (
        <View style={styles.tabContainer}>
            <Animated.View
                style={[
                    styles.tabIndicator,
                    {
                        width: TAB_WIDTH,
                        transform: [{ translateX }],
                    },
                ]}
            />
            <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setActiveTab(0)}
                activeOpacity={0.7}
            >
                <View style={styles.tabContent}>
                    <Icons.ClockHistoryIcon width={18} height={18} color={activeTab === 0 ? COLORS.brandPrimary : COLORS.greyMid} />
                    <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>
                        Launch History
                    </Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setActiveTab(1)}
                activeOpacity={0.7}
            >
                <View style={styles.tabContent}>
                    <Icons.walletIcon width={18} height={18} color={activeTab === 1 ? COLORS.brandPrimary : COLORS.greyMid} />
                    <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>
                        Your Holdings
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

// New Token Item Component
interface TokenListItemProps {
    item: TokenData | WalletTokenData;
    onPress: (token: TokenData | WalletTokenData) => void;
    onTrade?: (token: TokenData | WalletTokenData, isBuy: boolean) => void;
    isHolding?: boolean;
}

const TokenListItem: React.FC<TokenListItemProps> = ({ item, onPress, onTrade, isHolding = false }) => {
    const [resolvedImageUrl, setResolvedImageUrl] = useState<string | undefined>(undefined);
    const [isLoadingImage, setIsLoadingImage] = useState(true);
    const scaleAnim = useRef(new Animated.Value(0.97)).current;

    // Protocol logos mapping
    const getProtocolLogo = () => {
        if (!('protocolType' in item)) return null;

        switch (item.protocolType) {
            case 'pumpfun':
                return <Icons.PumpFunIcon width={14} height={14} />;
            case 'raydium':
                return <Icons.RadyuimIcom width={14} height={14} />;
            case 'tokenmill':
                return <Icons.TokenMillIcon width={14} height={14} />;
            case 'meteora':
                return <IPFSAwareImage source={require('@/assets/images/meteora.jpg')} style={styles.protocolLogo} />;
            default:
                return null;
        }
    };

    useEffect(() => {
        let isActive = true;
        setIsLoadingImage(true);

        async function loadImage() {
            let imageUrl;
            if ('metadataURI' in item) {
                imageUrl = await extractActualImageUrl(item.metadataURI);
            }

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
    }, [item]);

    // Card press animation
    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    // Calculate price and change values based on item type
    const changeValue = 'priceChange24h' in item && item.priceChange24h !== undefined ?
        item.priceChange24h : 0;
    const changeColor = changeValue >= 0 ? COLORS.brandGreen : COLORS.errorRed;

    // Calculate token price
    let displayPrice = 0;
    if ('currentPrice' in item) {
        displayPrice = item.currentPrice || item.initialPrice || 0;
    } else if ('usdValue' in item && item.balance !== undefined && item.balance > 0) {
        // Calculate price per token from usdValue/balance
        displayPrice = (item.usdValue || 0) / item.balance;
    }

    // Check if the item is a wallet token with balance
    const isWalletToken = isHolding && 'balance' in item;
    const balance = isWalletToken && item.balance !== undefined ? item.balance : 0;

    // Get USD value directly
    let value = isWalletToken && 'usdValue' in item ? (item.usdValue || 0) : 0;

    // Format price for display
    const formatPrice = (price: number) => {
        if (price === 0) return '$0.00';
        if (price < 0.001) return '<$0.001';
        if (price < 1) return `$${price.toFixed(3)}`;
        if (price < 10) return `$${price.toFixed(2)}`;
        if (price < 1000) return `$${price.toFixed(2)}`;
        if (price < 1000000) return `$${(price / 1000).toFixed(1)}K`;
        return `$${(price / 1000000).toFixed(2)}M`;
    };

    return (
        <Animated.View
            style={{
                transform: [{ scale: scaleAnim }],
            }}
        >
            <TouchableOpacity
                style={styles.tokenCard}
                onPress={() => onPress(item)}
                activeOpacity={0.9}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <LinearGradient
                    colors={[COLORS.lighterBackground, COLORS.darkerBackground]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                >
                    {/* Main content row */}
                    <View style={styles.cardRow}>
                        {/* Token info section: logo + name */}
                        <View style={styles.tokenInfoContainer}>
                            {/* Token logo */}
                            <View style={styles.tokenLogoContainer}>
                                {isLoadingImage ? (
                                    <ActivityIndicator size="small" color={COLORS.brandPrimary} />
                                ) : (
                                    <IPFSAwareImage
                                        source={{ uri: resolvedImageUrl }}
                                        style={styles.tokenLogo}
                                        defaultSource={require('@/assets/images/SENDlogo.png')}
                                    />
                                )}
                                {/* Glow effect */}
                                <View style={styles.glowEffect} />
                            </View>

                            {/* Token details */}
                            <View style={styles.detailsContainer}>
                                <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                                <Text style={styles.tokenName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>

                                {/* Protocol badge */}
                                {'protocolType' in item && item.protocolType && (
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
                        </View>

                        {/* Price section */}
                        <View style={styles.priceContainer}>
                            <Text style={styles.tokenPrice}>{formatPrice(displayPrice)}</Text>
                            <Text style={[styles.tokenChange, { color: changeColor }]}>
                                {changeValue >= 0 ? '↑ ' : '↓ '}{Math.abs(changeValue).toFixed(1)}%
                            </Text>

                            {/* Show balance for "Your Holdings" */}
                            {isWalletToken && (
                                <View style={styles.balanceContainer}>
                                    <Text style={styles.balanceText}>
                                        {balance < 1000 ? balance.toFixed(2) : balance.toFixed(0)} {item.symbol}
                                    </Text>
                                    <Text style={styles.valueText}>
                                        {formatPrice(value)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Action buttons row */}
                    {onTrade && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.buyButton]}
                                onPress={() => onTrade(item, true)}
                            >
                                <Ionicons name="arrow-up-outline" size={12} color={COLORS.brandPrimary} style={{ marginRight: 4 }} />
                                <Text style={[styles.actionButtonText, { color: COLORS.brandPrimary }]}>Buy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.sellButton]}
                                onPress={() => onTrade(item, false)}
                            >
                                <Ionicons name="arrow-down-outline" size={12} color={COLORS.brandPink} style={{ marginRight: 4 }} />
                                <Text style={[styles.actionButtonText, { color: COLORS.brandPink }]}>Sell</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Holdings Stats Component for the "Your Holdings" tab
interface HoldingsStatsProps {
    tokens: WalletTokenData[];
}

const HoldingsStats: React.FC<HoldingsStatsProps> = ({ tokens }) => {
    // Calculate total value from token data
    const totalValue = useMemo(() => {
        return tokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);
    }, [tokens]);

    // Calculate today's change (weighted average of all tokens' changes)
    const todayChange = useMemo(() => {
        const totalWeight = tokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);
        if (totalWeight === 0) return 0;

        const weightedChange = tokens.reduce((sum, token) => {
            const weight = (token.usdValue || 0) / totalWeight;
            return sum + (token.priceChange24h || 0) * weight;
        }, 0);

        return weightedChange;
    }, [tokens]);

    // Format the total value for display
    const formatTotalValue = (value: number) => {
        if (value === 0) return '$0.00';
        if (value < 0.01) return '<$0.01';
        if (value < 1000) return `$${value.toFixed(2)}`;
        if (value < 1000000) return `$${(value / 1000).toFixed(1)}K`;
        return `$${(value / 1000000).toFixed(2)}M`;
    };

    return (
        <View style={styles.statsContainer}>
            <LinearGradient
                colors={['rgba(50, 212, 222, 0.15)', 'rgba(40, 50, 80, 0.4)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsGradient}
            >
                <View style={styles.statSection}>
                    <Text style={styles.statLabel}>Total Value</Text>
                    <Text style={styles.statValue}>{formatTotalValue(totalValue)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons
                            name={todayChange >= 0 ? "trending-up" : "trending-down"}
                            size={12}
                            color={todayChange >= 0 ? COLORS.brandGreen : COLORS.brandPink}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.statChange, { color: todayChange >= 0 ? COLORS.brandGreen : COLORS.brandPink }]}>
                            {todayChange >= 0 ? '+' : ''}{todayChange.toFixed(1)}% today
                        </Text>
                    </View>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statSection}>
                    <Text style={styles.statLabel}>Tokens Held</Text>
                    <Text style={styles.statValue}>{tokens.length}</Text>
                    {tokens.length > 0 && (
                        <TouchableOpacity style={styles.viewAllButton}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>
        </View>
    );
};

const HoldingsScreen = () => {
    const dispatch = useDispatch();
    const { address } = useSelector((state: RootState) => state.auth);

    // Launch History state
    const { userTokens, loading, error } = useSelector((state: RootState) => state.tokens);
    const userTokensList: TokenData[] = address && userTokens[address] ? userTokens[address] : [];

    // Wallet Holdings state
    const { walletTokens, walletTokensLoading, walletTokensError } = useSelector((state: RootState) => state.tokens);
    const walletTokensList: WalletTokenData[] = address && walletTokens[address] ? walletTokens[address] : [];

    const [selectedToken, setSelectedToken] = useState<any>(null);
    const [isTokenDetailsVisible, setIsTokenDetailsVisible] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    // Trade states
    const [isTradeVisible, setIsTradeVisible] = useState(false);
    const [tradeToken, setTradeToken] = useState<TokenData | WalletTokenData | null>(null);
    const [isSell, setIsSell] = useState(false);

    // Fetch user-created tokens for Launch History tab
    useEffect(() => {
        if (address) {
            dispatch(fetchUserTokens(address) as any);
        }
    }, [dispatch, address]);

    // Fetch wallet tokens for Holdings tab
    useEffect(() => {
        if (address && activeTab === 1) {
            dispatch(fetchWalletTokens(address) as any);
        }
    }, [dispatch, address, activeTab]);

    const handleTokenPress = (token: TokenData | WalletTokenData) => {
        const tokenDetails = {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            logoURI: token.logoURI,
            metadataURI: 'metadataURI' in token ? token.metadataURI : undefined,
            price: 'currentPrice' in token ? (token.currentPrice || token.initialPrice) :
                ('usdValue' in token && token.balance ? (token.usdValue || 0) / token.balance : 0),
            priceChange24h: 'priceChange24h' in token ? token.priceChange24h || 0 : 0,
            balance: 'balance' in token ? token.balance : undefined,
        };

        setSelectedToken(tokenDetails);
        setIsTokenDetailsVisible(true);
    };

    const handleTrade = (token: TokenData | WalletTokenData, isBuy: boolean) => {
        // Format token based on its type for the SwapDrawer
        const tokenForSwap = {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            logoURI: token.logoURI || "",
            // WalletTokenData has decimals, TokenData doesn't
            decimals: 'decimals' in token ? token.decimals : 9, // Default to 9 decimals (SOL)
        };

        setTradeToken(token);
        setIsSell(!isBuy); // Set isSell based on the operation type
        setIsTradeVisible(true);
    };

    const handleTradeComplete = (tradeInfo: {
        success: boolean;
        signature?: string;
        inputToken: any;
        outputToken: any;
        inputAmount: number;
        outputAmount: number;
        isSell: boolean;
    }) => {
        if (!address || !tradeToken) return;

        console.log('Trade completed:', tradeInfo);

        if (tradeInfo.success) {
            // For real-time UI updates:
            try {
                // 1. If selling a token, reduce its balance
                if (tradeInfo.isSell) {
                    // Calculate new balance for the token being sold
                    if ('balance' in tradeToken && tradeToken.balance !== undefined) {
                        const newBalance = tradeToken.balance - tradeInfo.inputAmount;

                        // Update the token balance in Redux (will remove if balance <= 0)
                        dispatch(updateTokenBalance({
                            walletAddress: address,
                            tokenAddress: tradeToken.address,
                            newBalance,
                            // Recalculate USD value based on new balance and current price per token
                            usdValue: newBalance > 0 && tradeToken.usdValue !== undefined && tradeToken.balance !== undefined ?
                                (tradeToken.usdValue / tradeToken.balance) * newBalance : 0
                        }));

                        console.log(`Updated ${tradeToken.symbol} balance: ${newBalance}`);
                    }
                }
                // 2. If buying a token, either update existing token or fetch all tokens again
                else {
                    // Check if the token exists in wallet
                    const existingTokenIndex = walletTokensList.findIndex(
                        t => t.address === tradeToken.address || t.mint === tradeToken.address
                    );

                    if (existingTokenIndex !== -1) {
                        // Token exists, update its balance
                        const existingToken = walletTokensList[existingTokenIndex];
                        if (existingToken.balance !== undefined) {
                            const newBalance = existingToken.balance + tradeInfo.outputAmount;

                            dispatch(updateTokenBalance({
                                walletAddress: address,
                                tokenAddress: tradeToken.address,
                                newBalance,
                                // Recalculate USD value
                                usdValue: existingToken.usdValue !== undefined && existingToken.balance !== undefined ?
                                    (existingToken.usdValue / existingToken.balance) * newBalance : undefined
                            }));

                            console.log(`Updated ${tradeToken.symbol} balance: ${newBalance}`);
                        }
                    } else {
                        // Token doesn't exist in wallet yet, fetch all tokens
                        dispatch(fetchWalletTokens(address) as any);
                    }
                }
            } catch (error) {
                console.error('Error updating token balances:', error);
                // If local updates fail, fall back to fetching all tokens
                dispatch(fetchWalletTokens(address) as any);
            }
        }
    };

    // Render Launch History tab
    const renderLaunchHistoryContent = () => {
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
                renderItem={({ item }) => (
                    <TokenListItem
                        item={item}
                        onPress={handleTokenPress}
                        onTrade={handleTrade}
                    />
                )}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icons.ClockHistoryIcon width={40} height={40} color={COLORS.greyMid} />
                        <Text style={styles.emptyText}>No launch history yet</Text>
                        <Text style={styles.emptySubText}>Tokens you've created will appear here</Text>
                    </View>
                }
            />
        );
    };

    // Render Your Holdings tab
    const renderHoldingsContent = () => {
        if (walletTokensLoading) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={COLORS.brandPrimary} />
                    <Text style={styles.loaderText}>Loading your wallet tokens...</Text>
                </View>
            );
        }

        if (walletTokensError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Error loading wallet tokens</Text>
                    <Text style={styles.errorSubText}>{walletTokensError}</Text>
                </View>
            );
        }

        return (
            <ScrollView
                style={styles.holdingsScrollView}
                contentContainerStyle={styles.holdingsContentContainer}
                showsVerticalScrollIndicator={false}
            >
                <HoldingsStats tokens={walletTokensList} />

                <View style={styles.holdingsHeaderContainer}>
                    <Text style={styles.holdingsHeaderTitle}>Your Tokens</Text>
                </View>

                {walletTokensList.length > 0 ? (
                    walletTokensList.map(token => (
                        <TokenListItem
                            key={token.mint}
                            item={token}
                            onPress={handleTokenPress}
                            onTrade={handleTrade}
                            isHolding={true}
                        />
                    ))
                ) : (
                    <View style={styles.emptyHoldingsContainer}>
                        <Icons.walletIcon width={40} height={40} color={COLORS.greyMid} />
                        <Text style={styles.emptyText}>No tokens in your wallet</Text>
                        <Text style={styles.emptySubText}>Your token holdings will appear here</Text>
                        <TouchableOpacity style={styles.getTokensButton}>
                            <Text style={styles.getTokensText}>Get Tokens</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: 46 }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            <AppHeader title="Token Manager" showDefaultRightIcons={true} />

            <View style={styles.contentContainer}>
                <TabComponent activeTab={activeTab} setActiveTab={setActiveTab} />

                {activeTab === 0 ? renderLaunchHistoryContent() : renderHoldingsContent()}
            </View>

            {selectedToken && (
                <TokenDetailsSheet
                    visible={isTokenDetailsVisible}
                    onClose={() => setIsTokenDetailsVisible(false)}
                    token={selectedToken}
                />
            )}

            {tradeToken && (
                <SwapDrawer
                    visible={isTradeVisible}
                    onClose={() => setIsTradeVisible(false)}
                    targetToken={{
                        address: tradeToken.address,
                        name: tradeToken.name,
                        symbol: tradeToken.symbol,
                        logoURI: tradeToken.logoURI || "",
                        // Use type guard to check if it's a WalletTokenData
                        decimals: 'decimals' in tradeToken ? tradeToken.decimals : 9,
                    }}
                    isSell={isSell}
                    onSwapComplete={handleTradeComplete}
                />
            )}
        </SafeAreaView>
    );
};

export default HoldingsScreen; 