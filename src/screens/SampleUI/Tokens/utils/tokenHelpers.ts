// Helper functions for token-related operations

/**
 * Extracts the actual image URL from token metadata
 * @param metadataValue The token metadata URI string
 * @returns Promise resolving to the image URL or undefined
 */
export async function extractActualImageUrl(metadataValue?: string): Promise<string | undefined> {
    if (!metadataValue) return undefined;
    let contentToParse = metadataValue;
    if (metadataValue.startsWith('http')) {
        try {
            const response = await fetch(metadataValue);
            if (!response.ok) {
                console.error(`Failed to fetch metadata from URL ${metadataValue}: ${response.statusText}`);
                contentToParse = metadataValue;
            } else {
                contentToParse = await response.text();
            }
        } catch (fetchError) {
            console.error(`Network error fetching metadata from URL ${metadataValue}: ${fetchError}`);
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

/**
 * Gets the price from a token object, handling different token types
 */
export function getTokenPrice(token: any): number {
    if ('price' in token && token.price !== undefined) return token.price;
    if ('currentPrice' in token && token.currentPrice !== undefined) return token.currentPrice;
    if ('initialPrice' in token && token.initialPrice !== undefined) return token.initialPrice;
    return 0;
}

/**
 * Gets the price change percentage from a token object
 */
export function getTokenPriceChange(token: any): number {
    if ('priceChange24h' in token && token.priceChange24h !== undefined) return token.priceChange24h;
    if ('price24hChangePercent' in token && token.price24hChangePercent !== undefined) return token.price24hChangePercent;
    return 0;
}

/**
 * Formats a token price based on its value
 */
export function formatTokenPrice(price: number): string {
    return price < 0.01 ? price.toFixed(8) : price.toFixed(2);
}

/**
 * Formats a price change percentage with a + or - prefix
 */
export function formatPriceChange(priceChange: number): string {
    return `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
}

/**
 * Gets the color for price change display
 */
export function getPriceChangeColor(priceChange: number, colors: any): string {
    return priceChange === 0 ? colors.greyMid : (priceChange >= 0 ? '#4CAF50' : colors.errorRed);
} 