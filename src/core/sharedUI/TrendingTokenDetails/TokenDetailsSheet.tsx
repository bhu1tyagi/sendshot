import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Image,
    Dimensions,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { styles } from './TokenDetailsSheet.styles';
import { TokenDetailsSheetProps } from '@/modules/dataModule/types/tokenDetails.types';
import { useTokenDetails } from '@/modules/dataModule/hooks/useTokenDetails';
import {
    formatDollarChange,
    formatNumber,
    formatPrice,
    formatPriceChange,
    getGraphData
} from '@/modules/dataModule/utils/tokenDetailsFormatters';
import RiskAnalysisSection from './RiskAnalysisSection';
import LineGraph from '@/core/sharedUI/TradeCard/LineGraph';
import COLORS from '@/assets/colors';

const { width } = Dimensions.get('window');

// Async helper function (copied and adapted)
async function extractActualImageUrl(metadataValue?: string): Promise<string | undefined> {
    if (!metadataValue) return undefined;
    let contentToParse = metadataValue;
    if (metadataValue.startsWith('http')) {
        try {
            const response = await fetch(metadataValue);
            if (!response.ok) {
                console.error(`Failed to fetch: ${response.statusText}`);
                contentToParse = metadataValue;
            } else {
                contentToParse = await response.text();
            }
        } catch (fetchError) {
            console.error(`Fetch error: ${fetchError}`);
            contentToParse = metadataValue;
        }
    }
    try {
        const jsonData = JSON.parse(contentToParse);
        if (jsonData && typeof jsonData.image === 'string' && jsonData.image.startsWith('http')) {
            return jsonData.image;
        }
    } catch (jsonError) {
        const imageMatch = contentToParse.match(/"image"\s*:\s*"([^"]+)"/);
        if (imageMatch && imageMatch[1] && imageMatch[1].startsWith('http')) {
            return imageMatch[1];
        }
    }
    if (metadataValue.startsWith('http') && /\.(jpeg|jpg|gif|png|webp)$/i.test(metadataValue)) {
        return metadataValue;
    }
    return undefined;
}

const TokenDetailsSheet: React.FC<TokenDetailsSheetProps> = ({
    visible,
    onClose,
    token,
}) => {
    const {
        priceHistory,
        metadata,
        tokenOverview,
        tokenSecurity,
        marketData,
        tradeData,
        loading: detailsLoading,
        selectedTimeframe,
        handleTimeframeChange,
        getTimestamps
    } = useTokenDetails({
        tokenAddress: token.address,
        visible
    });

    const [resolvedImageUrl, setResolvedImageUrl] = useState<string | undefined>(undefined);
    const [isImageLoading, setIsImageLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        let isActive = true;
        setIsImageLoading(true);

        async function loadImage() {
            let imageUrl = await extractActualImageUrl(token.metadataURI);
            if (!imageUrl && token.logoURI?.startsWith('http')) {
                imageUrl = token.logoURI;
            }
            if (isActive) {
                setResolvedImageUrl(imageUrl);
                setIsImageLoading(false);
            }
        }

        if (visible) { // Only load image if sheet is visible
            loadImage();
        }

        return () => { isActive = false; };
    }, [token, visible]); // Rerun if token or visibility changes

    // Combine detailsLoading (from useTokenDetails) and isImageLoading
    const isLoading = detailsLoading || isImageLoading;

    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>

            <View style={styles.container}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>

                <ScrollView style={styles.content}>
                    {/* Token Header */}
                    <View style={styles.header}>
                        {isImageLoading ? (
                            <View style={[styles.tokenLogo, styles.logoPlaceholder]}><ActivityIndicator size="small" color={COLORS.brandPrimary} /></View>
                        ) : resolvedImageUrl ? (
                            <Image
                                source={{ uri: resolvedImageUrl }}
                                style={styles.tokenLogo}
                                defaultSource={require('@/assets/images/SENDlogo.png')}
                            />
                        ) : (
                            <View style={[styles.tokenLogo, styles.logoPlaceholder]}><Text style={styles.logoPlaceholderText}>{token.symbol[0] || '?'}</Text></View>
                        )}
                        <View style={styles.tokenInfo}>
                            <Text style={styles.tokenName}>{token.name}</Text>
                            <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                        </View>
                    </View>

                    {/* Price Information */}
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>${formatPrice(token.price ?? 0)}</Text>
                        <View style={styles.priceChangeContainer}>
                            <Text style={[
                                styles.priceChangeAmount,
                                { color: (token.priceChange24h ?? 0) >= 0 ? COLORS.brandPrimary : COLORS.errorRed }
                            ]}>
                                {formatDollarChange(token.price ?? 0, token.priceChange24h)}
                            </Text>
                            <View style={[
                                styles.percentageBox,
                                { backgroundColor: (token.priceChange24h ?? 0) >= 0 ? COLORS.brandPrimary : COLORS.errorRed }
                            ]}>
                                <Text style={styles.percentageText}>
                                    {formatPriceChange(token.priceChange24h)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Chart Section */}
                    <View style={styles.chartContainer}>
                        <View style={styles.timeframeContainer}>
                            {['1H', '1D', '1W', '1M', 'YTD', 'ALL'].map((tf) => (
                                <TouchableOpacity
                                    key={tf}
                                    style={[
                                        styles.timeframeButton,
                                        selectedTimeframe === tf && styles.selectedTimeframe,
                                        detailsLoading && styles.disabledButton // Use detailsLoading for chart controls
                                    ]}
                                    onPress={() => !detailsLoading && handleTimeframeChange(tf as any)}
                                    disabled={detailsLoading}
                                >
                                    <Text style={[
                                        styles.timeframeText,
                                        selectedTimeframe === tf && styles.selectedTimeframeText,
                                        detailsLoading && styles.disabledText
                                    ]}>
                                        {tf}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {detailsLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={COLORS.brandPrimary} />
                                <Text style={styles.loadingText}>Loading price data...</Text>
                            </View>
                        ) : priceHistory.length > 0 ? (
                            <View style={styles.graphWrapper}>
                                <LineGraph
                                    data={getGraphData(priceHistory.map(item => item.value))}
                                    width={width - 72} // Adjust width based on padding
                                    timestamps={getTimestamps()}
                                />
                            </View>
                        ) : (
                            <View style={styles.noDataContainer}>
                                <Text style={styles.noDataText}>No price data available</Text>
                            </View>
                        )}
                    </View>

                    {/* Risk Analysis Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Security Analysis</Text>
                        <RiskAnalysisSection tokenAddress={token.address} />
                    </View>

                    {/* Info Section (ensure fallbacks for tokenOverview fields) */}
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>Info</Text>
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Created On</Text>
                                <Text style={styles.infoValue}>
                                    {tokenOverview?.created_on ||
                                        (tokenOverview?.created_at ? new Date(tokenOverview.created_at * 1000).toLocaleDateString() : 'N/A')}
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Status</Text>
                                <Text style={styles.infoValue}>{metadata?.extensions?.coingecko_id ? 'Listed' : 'Unlisted'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Mint</Text>
                                <Text style={styles.infoValue} numberOfLines={1}>
                                    {token.address ? `${token.address.substring(0, 6)}...${token.address.substring(token.address.length - 6)}` : 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Market Cap</Text>
                                <Text style={styles.infoValue}>
                                    ${formatNumber(tokenOverview?.market_cap ?? tokenOverview?.marketCap)}
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Circulating Supply</Text>
                                <Text style={styles.infoValue}>
                                    {formatNumber(tokenOverview?.supply?.circulating ?? tokenOverview?.circulatingSupply)}
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Holders</Text>
                                <Text style={styles.infoValue}>
                                    {(() => {
                                        const count = tokenOverview?.holder_count ?? tokenOverview?.holderCount;
                                        return count !== undefined ? count.toLocaleString() : 'N/A';
                                    })()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* 24h Performance Section (ensure fallbacks for tradeData fields) */}
                    <View style={styles.performanceSection}>
                        <Text style={styles.sectionTitle}>24h Performance</Text>
                        <View style={styles.performanceGrid}>
                            <View style={styles.performanceItem}>
                                <Text style={styles.performanceLabel}>Volume</Text>
                                <Text style={styles.performanceValue}>${formatNumber(tradeData?.volume_24h_usd)}</Text>
                            </View>
                            <View style={styles.performanceItem}>
                                <Text style={styles.performanceLabel}>Trades</Text>
                                <Text style={styles.performanceValue}>{tradeData?.trade_24h?.toLocaleString() ?? 'N/A'}</Text>
                            </View>
                            <View style={styles.performanceItem}>
                                <Text style={styles.performanceLabel}>Buy Volume</Text>
                                <Text style={styles.performanceValue}>${formatNumber(tradeData?.volume_buy_24h_usd)}</Text>
                            </View>
                            <View style={styles.performanceItem}>
                                <Text style={styles.performanceLabel}>Sell Volume</Text>
                                <Text style={styles.performanceValue}>${formatNumber(tradeData?.volume_sell_24h_usd)}</Text>
                            </View>
                            <View style={styles.performanceItem}>
                                <Text style={styles.performanceLabel}>Unique Wallets</Text>
                                <Text style={styles.performanceValue}>{tradeData?.unique_wallet_24h?.toLocaleString() ?? 'N/A'}</Text>
                            </View>
                            <View style={styles.performanceItem}>
                                <Text style={styles.performanceLabel}>Wallet Change</Text>
                                <Text style={[
                                    styles.performanceValue,
                                    { color: (tradeData?.unique_wallet_24h_change_percent ?? 0) >= 0 ? COLORS.brandPrimary : COLORS.errorRed }
                                ]}>
                                    {tradeData?.unique_wallet_24h_change_percent !== undefined
                                        ? `${(tradeData.unique_wallet_24h_change_percent ?? 0) >= 0 ? '+' : ''}${(tradeData.unique_wallet_24h_change_percent ?? 0).toFixed(2)}%`
                                        : 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

export default TokenDetailsSheet; 