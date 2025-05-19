import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icons from '@/assets/svgs';
import COLORS from '@/assets/colors';
import styles from '../TokenFeedScreenStyles';
import { TokenFeedListItemProps } from '../utils/types';
import { extractActualImageUrl, formatTokenPrice, formatPriceChange, getPriceChangeColor } from '../utils/tokenHelpers';

const TokenFeedListItem: React.FC<TokenFeedListItemProps> = ({
    item,
    onPress,
    isCommunityToken = false,
    onBuyPress
}) => {
    const [resolvedImageUrl, setResolvedImageUrl] = useState<string | undefined>(undefined);
    const [isLoadingImage, setIsLoadingImage] = useState(true);

    // Protocol logos mapping (only shown for community tokens)
    const getProtocolLogo = () => {
        if (!isCommunityToken || !('protocolType' in item) || !item.protocolType) return null;

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
            let imageUrl: string | undefined;
            if ('metadataURI' in item && item.metadataURI) {
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
        return () => { isActive = false; };
    }, [item]);

    // Get the price based on token type (community or trending)
    const price = 'price' in item ? (item.price ?? 0) : ('currentPrice' in item ? (item.currentPrice ?? item.initialPrice ?? 0) : 0);
    
    // Get the price change based on token type
    const priceChange24h = 'priceChange24h' in item ? (item.priceChange24h ?? 0) : ('price24hChangePercent' in item ? (item.price24hChangePercent ?? 0) : 0);

    const priceChangeColor = getPriceChangeColor(priceChange24h, COLORS);
    const formattedPrice = formatTokenPrice(price);
    const formattedPriceChange = formatPriceChange(priceChange24h);

    // Get rank medal for trending tokens
    const getRankDisplay = () => {
        if (!('rank' in item) || !item.rank) return null;

        switch (item.rank) {
            case 1:
                return (
                    <View style={styles.rankContainer}>
                        <Text style={styles.medalEmoji}>🥇</Text>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.rankContainer}>
                        <Text style={styles.medalEmoji}>🥈</Text>
                    </View>
                );
            case 3:
                return (
                    <View style={styles.rankContainer}>
                        <Text style={styles.medalEmoji}>🥉</Text>
                    </View>
                );
            default:
                return (
                    <View style={styles.rankContainer}>
                        <Text style={styles.rankNumber}>{item.rank}</Text>
                    </View>
                );
        }
    };

    return (
        <View style={[styles.tokenCard, { height: 88 }]}>
            {/* Left section with rank and token logo */}
            <View style={styles.leftSection}>
                {/* Rank medal - now outside and to the left of the logo */}
                {getRankDisplay()}

                {/* Token logo */}
                <View style={styles.tokenLogoContainer}>
                    {isLoadingImage ? (
                        <ActivityIndicator size="small" color={COLORS.brandPrimary} />
                    ) : resolvedImageUrl ? (
                        <Image
                            source={{ uri: resolvedImageUrl }}
                            style={styles.tokenLogo}
                            defaultSource={require('@/assets/images/SENDlogo.png')}
                        />
                    ) : (
                        <View style={styles.tokenLogoPlaceholder}>
                            <Text style={styles.tokenLogoText}>{item.symbol[0] || '?'}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Middle content */}
            <TouchableOpacity
                style={styles.cardContent}
                onPress={() => onPress(item)}
            >
                <View style={styles.tokenNameSection}>
                    <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                    <Text style={styles.tokenName}>{item.name}</Text>
                </View>

                {/* Protocol badge (below name) */}
                {isCommunityToken && 'protocolType' in item && item.protocolType && (
                    <View style={styles.protocolContainer}>
                        <View style={styles.protocolIconContainer}>
                            {getProtocolLogo()}
                        </View>
                        <Text style={styles.protocolText}>
                            {item.protocolType.charAt(0).toUpperCase() + item.protocolType.slice(1)}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Price and Buy Button */}
            <View style={styles.rightSection}>
                <View style={styles.priceContainer}>
                    <Text style={styles.tokenPrice}>${formattedPrice}</Text>
                    <Text style={[styles.tokenPriceChange, { color: priceChangeColor }]}>
                        {formattedPriceChange}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => onBuyPress(item)}
                >
                    <Text style={styles.buyButtonText}>Buy</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default React.memo(TokenFeedListItem); 