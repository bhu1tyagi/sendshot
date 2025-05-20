import { Platform } from 'react-native';
// Helper functions for token-related operations

/**
 * Extracts the actual image URL from token metadata
 * @param metadataValue The token metadata URI string
 * @returns Promise resolving to the image URL or undefined
 */
export async function extractActualImageUrl(metadataValue?: string): Promise<string | undefined> {
    const forAndroid = Platform.OS === 'android';
    if (!metadataValue) {
        if (forAndroid) console.log('[Android Img Debug TF] metadataValue is undefined or empty');
        return undefined;
    }

    if (forAndroid) console.log(`[Android Img Debug TF] Initial metadataValue: ${metadataValue}`);

    const imagePattern = /\.(jpeg|jpg|gif|png|webp)$/i;
    const ipfsHashPattern = /(?:\/ipfs\/|ipfs:\/\/)?(Qm[1-9A-HJ-NP-Za-km-z]{44})/i;
    const ipfsHashMatch = metadataValue.match(ipfsHashPattern);

    if (ipfsHashMatch && ipfsHashMatch[1]) {
        const hash = ipfsHashMatch[1];
        const primaryGateway = 'https://gateway.pinata.cloud/ipfs/';
        const directIpfsImageUrl = `${primaryGateway}${hash}`;
        if (forAndroid) console.log(`[Android Img Debug TF] Detected IPFS hash ${hash}, formed direct URL: ${directIpfsImageUrl}`);
    }

    if (metadataValue.startsWith('http') && imagePattern.test(metadataValue)) {
        if (forAndroid) console.log(`[Android Img Debug TF] Using metadataValue as direct image URL (http, known extension): ${metadataValue}`);
        return metadataValue;
    }

    let contentToParse = metadataValue;
    let fetchedSuccessfully = false;
    let isLikelyDirectImageFromFetch = false;

    let urlToFetchMetadata = metadataValue;
    if (forAndroid && metadataValue.startsWith('https://ipfs.io/ipfs/')) {
        const potentialPinataMetadataUrl = metadataValue.replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/');
        if (forAndroid) console.log(`[Android Img Debug TF] Original metadata URL is ipfs.io. Prioritizing Pinata for metadata fetch: ${potentialPinataMetadataUrl}`);
        urlToFetchMetadata = potentialPinataMetadataUrl;
    }

    if (urlToFetchMetadata.startsWith('http')) {
        if (forAndroid) console.log(`[Android Img Debug TF] metadataValue is HTTP URL, attempting to fetch: ${urlToFetchMetadata}`);
        try {
            const response = await fetch(urlToFetchMetadata, { headers: { 'Accept': 'application/json, text/plain, image/*' } });
            if (!response.ok) {
                if (forAndroid) console.error(`[Android Img Debug TF] Failed to fetch from URL ${urlToFetchMetadata}: ${response.status} ${response.statusText}`);
                if (forAndroid && urlToFetchMetadata.includes('gateway.pinata.cloud') && metadataValue.startsWith('https://ipfs.io/ipfs/')) {
                    if (forAndroid) console.log(`[Android Img Debug TF] Pinata metadata fetch failed. Retrying with original ipfs.io URL: ${metadataValue}`);
                    const fallbackResponse = await fetch(metadataValue, { headers: { 'Accept': 'application/json, text/plain, image/*' } });
                    if (!fallbackResponse.ok) {
                        if (forAndroid) console.error(`[Android Img Debug TF] Fallback fetch from original ipfs.io URL ${metadataValue} also failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
                    } else {
                        contentToParse = await fallbackResponse.text();
                        const contentType = fallbackResponse.headers.get('content-type');
                        if (forAndroid) console.log(`[Android Img Debug TF] Fallback fetched from ${metadataValue}. Content-Type: ${contentType}. Text (first 100): ${contentToParse.substring(0, 100)}...`);
                        fetchedSuccessfully = true;
                    }
                }
            } else {
                contentToParse = await response.text();
                const contentType = response.headers.get('content-type');
                if (forAndroid) console.log(`[Android Img Debug TF] Successfully fetched from ${urlToFetchMetadata}. Content-Type: ${contentType}. Text (first 100): ${contentToParse.substring(0, 100)}...`);
                fetchedSuccessfully = true;
            }
        } catch (fetchError: any) {
            if (forAndroid) console.error(`[Android Img Debug TF] Network error fetching from URL ${urlToFetchMetadata}: ${fetchError.message || fetchError}`);
        }
    } else if (ipfsHashMatch && ipfsHashMatch[1] && !urlToFetchMetadata.startsWith('http')) {
        const hash = ipfsHashMatch[1];
        const primaryGateway = 'https://gateway.pinata.cloud/ipfs/';
        const constructedImageUrl = `${primaryGateway}${hash}`;
        if (forAndroid) console.log(`[Android Img Debug TF] metadataValue was raw IPFS hash/URI '${urlToFetchMetadata}', constructed direct image URL: ${constructedImageUrl}`);
        return constructedImageUrl;
    }

    let tryParseJson = false;
    if (fetchedSuccessfully && urlToFetchMetadata.startsWith('http')) {
        tryParseJson = (typeof contentToParse === 'string' && contentToParse.trim().startsWith('{') && contentToParse.trim().endsWith('}'));
        if (forAndroid && !tryParseJson) {
            console.log(`[Android Img Debug TF] Fetched HTTP content, but it doesn't look like a simple JSON object. Content (first 100): ${contentToParse.substring(0,100)}`);
        }
    } else if (!urlToFetchMetadata.startsWith('http') && typeof contentToParse === 'string') {
        tryParseJson = (contentToParse.trim().startsWith('{') && contentToParse.trim().endsWith('}'));
         if (forAndroid && !tryParseJson) {
            console.log(`[Android Img Debug TF] Non-HTTP metadataValue, and it doesn't look like a simple JSON object. Content (first 100): ${contentToParse.substring(0,100)}`);
        }
    }

    if (tryParseJson) {
        if (forAndroid) {
            console.log(`[Android Img Debug TF] PRE-PARSE CHECK. Content being sent to JSON.parse (first 200 chars): ${contentToParse.substring(0,200)}...`);
        }
        try {
            const jsonData = JSON.parse(contentToParse);
            if (jsonData && typeof jsonData.image === 'string' && jsonData.image.startsWith('http')) {
                if (forAndroid) console.log(`[Android Img Debug TF] Extracted image from parsed JSON: ${jsonData.image}`);
                return jsonData.image;
            } else {
                if (forAndroid) console.warn('[Android Img Debug TF] Parsed JSON, but "image" field is missing, not a string, or not a valid http(s) URL:', jsonData.image || 'image field missing/invalid');
            }
        } catch (jsonError: any) {
            if (forAndroid) console.warn(`[Android Img Debug TF] JSON.parse FAILED. Error: ${jsonError.message || jsonError}. Content that failed (first 200 chars): "${contentToParse.substring(0, 200)}..."`);
        }
    } else if (fetchedSuccessfully && urlToFetchMetadata.startsWith('http')) {
        if (forAndroid) console.log(`[Android Img Debug TF] HTTP content fetched for ${urlToFetchMetadata} was not a direct image and not identified as JSON for parsing.`);
    }

    if (typeof urlToFetchMetadata === 'string') {
        const imageRegexMatch = urlToFetchMetadata.match(/"image"\s*:\s*"([^"]+)"/);
        if (imageRegexMatch && imageRegexMatch[1] && imageRegexMatch[1].startsWith('http')) {
            if (forAndroid) console.log(`[Android Img Debug TF] Found image via regex fallback on original metadataValue string: ${imageRegexMatch[1]}`);
            return imageRegexMatch[1];
        }
    }

    if (ipfsHashMatch && ipfsHashMatch[1]) {
        const hash = ipfsHashMatch[1];
        const primaryGateway = 'https://gateway.pinata.cloud/ipfs/';
        const fallbackImageUrl = `${primaryGateway}${hash}`;
        if (forAndroid) console.log(`[Android Img Debug TF] Fallback: Using IPFS hash ${hash} to form direct URL: ${fallbackImageUrl}`);
        return fallbackImageUrl;
    }

    if (forAndroid) console.log(`[Android Img Debug TF] Could not extract a valid image URL from: ${urlToFetchMetadata}`);
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