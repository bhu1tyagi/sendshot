import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Switch
} from 'react-native';
import { useWallet } from '../../../walletProviders/hooks/useWallet';
import { Connection, PublicKey } from '@solana/web3.js';
import { createPool } from '../../services/pumpSwapService';
import { createPoolAndBuy, createTokenWithCurve } from '../../../meteora/services/meteoraService'; // Import createTokenWithCurve
import { TokenInfo } from '@/modules/dataModule';
import SelectTokenModal from '@/screens/SampleUI/Swap/SelectTokenModal';

// Default index for pool creation
const DEFAULT_INDEX = 1; // Index used by the server/SDK

// Token address examples as placeholders
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Token metadata for common tokens
const KNOWN_TOKENS: Record<string, { symbol: string, name: string, decimals: number }> = {
    [SOL_MINT]: { symbol: 'SOL', name: 'Solana', decimals: 9 },
    [USDC_MINT]: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade Staked SOL', decimals: 9 },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'USDT', decimals: 6 },
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk', decimals: 5 },
};

interface PoolCreationSectionProps {
    connection: Connection;
    solanaWallet: any;
}

/**
 * PoolCreationSection allows a user to create a brand new pool
 */
export function PoolCreationSection({
    connection,
    solanaWallet,
}: PoolCreationSectionProps) {
    const { address, connected } = useWallet();

    // UI States
    const [baseMint, setBaseMint] = useState(SOL_MINT);
    const [quoteMint, setQuoteMint] = useState(USDC_MINT);
    const [baseToken, setBaseToken] = useState<TokenInfo>({
        address: SOL_MINT,
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: '',
    });
    const [quoteToken, setQuoteToken] = useState<TokenInfo>({
        address: USDC_MINT,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoURI: '',
    });
    const [baseAmount, setBaseAmount] = useState('');
    const [quoteAmount, setQuoteAmount] = useState('');
    const [initialPrice, setInitialPrice] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [buyOnCreate, setBuyOnCreate] = useState(false); // New state for the toggle
    const [buyAmount, setBuyAmount] = useState(''); // New state for the buy amount
    const [configAddress, setConfigAddress] = useState('');  // New state for storing config address
    const [tokenName, setTokenName] = useState(''); // New state for token name
    const [tokenSymbol, setTokenSymbol] = useState(''); // New state for token symbol
    const [useBondingCurve, setUseBondingCurve] = useState(false); // New state for bonding curve toggle
    const [initialMarketCap, setInitialMarketCap] = useState('10'); // Initial market cap in USD
    const [targetMarketCap, setTargetMarketCap] = useState('1000'); // Target market cap in USD
    const [tokenSupply, setTokenSupply] = useState('1000000000'); // Total token supply

    // Token selection modal states
    const [showBaseTokenModal, setShowBaseTokenModal] = useState(false);
    const [showQuoteTokenModal, setShowQuoteTokenModal] = useState(false);

    // Recalculate initial pool price whenever amounts change
    const recalcPrice = useCallback((baseVal: string, quoteVal: string) => {
        const b = parseFloat(baseVal) || 0;
        const q = parseFloat(quoteVal) || 0;

        if (b > 0 && q > 0) {
            setInitialPrice(q / b);
        } else {
            setInitialPrice(null);
        }
    }, []);

    const handleBaseAmountChange = useCallback((val: string) => {
        setBaseAmount(val);
        recalcPrice(val, quoteAmount);
    }, [quoteAmount, recalcPrice]);

    const handleQuoteAmountChange = useCallback((val: string) => {
        setQuoteAmount(val);
        recalcPrice(baseAmount, val);
    }, [baseAmount, recalcPrice]);

    // Handle token selection from modal
    const handleBaseTokenSelected = useCallback((token: TokenInfo) => {
        setBaseToken(token);
        setBaseMint(token.address);
        setShowBaseTokenModal(false);
        setError(null);
    }, []);

    const handleQuoteTokenSelected = useCallback((token: TokenInfo) => {
        setQuoteToken(token);
        setQuoteMint(token.address);
        setShowQuoteTokenModal(false);
        setError(null);
    }, []);

    // Validate Solana public key format (simple check)
    const isValidPublicKey = useCallback((key: string): boolean => {
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(key);
    }, []);

    // Check if base/quote are the same token
    useEffect(() => {
        if (baseMint && quoteMint && baseMint === quoteMint) {
            setError('Base and quote tokens cannot be the same');
        } else if (error === 'Base and quote tokens cannot be the same') {
            setError(null);
        }
    }, [baseMint, quoteMint, error]);

    // Toggle handler for buyOnCreate
    const toggleBuyOnCreate = useCallback(() => {
        setBuyOnCreate(!buyOnCreate);
    }, [buyOnCreate]);

    // Toggle handler for useBondingCurve
    const toggleUseBondingCurve = useCallback(() => {
        setUseBondingCurve(!useBondingCurve);
        // If turning on bonding curve, set quote token to SOL
        if (!useBondingCurve) {
            setQuoteMint(SOL_MINT);
            setQuoteToken({
                address: SOL_MINT,
                symbol: 'SOL',
                name: 'Solana',
                decimals: 9,
                logoURI: '',
            });
        }
    }, [useBondingCurve]);

    // Perform create token with bonding curve
    const handleCreateTokenWithCurve = useCallback(async () => {
        if (!connected || !solanaWallet) return;

        const userAddress = address || '';
        if (!userAddress) {
            setError('No wallet address found');
            return;
        }

        // Validate inputs
        if (!tokenName || tokenName.trim() === '') {
            setError('Please enter a token name');
            return;
        }

        if (!tokenSymbol || tokenSymbol.trim() === '') {
            setError('Please enter a token symbol');
            return;
        }

        const initialMarketCapValue = parseFloat(initialMarketCap);
        if (isNaN(initialMarketCapValue) || initialMarketCapValue <= 0) {
            setError('Please enter a valid initial market cap');
            return;
        }

        const targetMarketCapValue = parseFloat(targetMarketCap);
        if (isNaN(targetMarketCapValue) || targetMarketCapValue <= initialMarketCapValue) {
            setError('Target market cap must be greater than initial market cap');
            return;
        }

        const tokenSupplyValue = parseInt(tokenSupply);
        if (isNaN(tokenSupplyValue) || tokenSupplyValue <= 0) {
            setError('Please enter a valid token supply');
            return;
        }

        const buyAmountValue = buyOnCreate ? parseFloat(buyAmount) : 0;
        if (buyOnCreate && (isNaN(buyAmountValue) || buyAmountValue <= 0)) {
            setError('Please enter a valid buy amount');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Check if the user likely has enough SOL balance
            let warningMessage = '';
            try {
                const solBalance = await connection.getBalance(new PublicKey(userAddress));
                const solBalanceInSol = solBalance / 1_000_000_000;

                // Creating a pool requires at least ~0.03 SOL for account rent
                if (solBalanceInSol < 0.05) {
                    warningMessage = `\n\nWARNING: Your wallet has only ${solBalanceInSol.toFixed(6)} SOL, which may not be enough to cover the network fees required to create a pool. The transaction might fail.`;
                }
            } catch (balanceError) {
                console.log('Could not check SOL balance:', balanceError);
            }

            // Confirm with user before proceeding
            Alert.alert(
                'Create Token with Bonding Curve',
                `You are about to create a new token:\n\n` +
                `Name: ${tokenName}\n` +
                `Symbol: ${tokenSymbol}\n` +
                `Supply: ${parseInt(tokenSupply).toLocaleString()}\n` +
                `Initial Market Cap: $${initialMarketCapValue}\n` +
                `Target Market Cap: $${targetMarketCapValue}` +
                (buyOnCreate ? `\n\nYou will also buy tokens with ${buyAmountValue} SOL` : '') +
                warningMessage +
                `\n\nContinue?`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => {
                            setIsLoading(false);
                        }
                    },
                    {
                        text: 'Create Token',
                        onPress: async () => {
                            try {
                                setStatusMessage('Creating token with bonding curve...');

                                const result = await createTokenWithCurve(
                                    {
                                        tokenName,
                                        tokenSymbol,
                                        initialMarketCap: initialMarketCapValue,
                                        targetMarketCap: targetMarketCapValue,
                                        tokenSupply: tokenSupplyValue,
                                        buyAmount: buyOnCreate ? buyAmountValue : undefined
                                    },
                                    connection,
                                    solanaWallet,
                                    (msg) => setStatusMessage(msg)
                                );

                                setStatusMessage(`Token created! Mint address: ${result.baseMintAddress}, TX: ${result.txId}`);
                                // Reset form fields
                                setTokenName('');
                                setTokenSymbol('');
                                setBuyAmount('');
                            } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to create token');
                                setStatusMessage(null);
                            } finally {
                                setIsLoading(false);
                            }
                        }
                    }
                ]
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create token');
            setStatusMessage(null);
            setIsLoading(false);
        }
    }, [
        connected,
        solanaWallet,
        address,
        tokenName,
        tokenSymbol,
        initialMarketCap,
        targetMarketCap,
        tokenSupply,
        buyOnCreate,
        buyAmount,
        connection
    ]);

    // Perform create pool transaction
    const handleCreatePool = useCallback(async () => {
        if (!connected || !solanaWallet) return;

        const userAddress = address || '';
        if (!userAddress) {
            setError('No wallet address found');
            return;
        }

        // Validate inputs
        if (!isValidPublicKey(baseMint)) {
            setError('Invalid base token mint address');
            return;
        }

        if (!isValidPublicKey(quoteMint)) {
            setError('Invalid quote token mint address');
            return;
        }

        if (baseMint === quoteMint) {
            setError('Base and quote tokens cannot be the same');
            return;
        }

        if (buyOnCreate && (!buyAmount || parseFloat(buyAmount) <= 0)) {
            setError('Please enter a valid buy amount');
            return;
        }

        if (!tokenName || tokenName.trim() === '') {
            setError('Please enter a token name');
            return;
        }

        if (!tokenSymbol || tokenSymbol.trim() === '') {
            setError('Please enter a token symbol');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Parse values as floating point with sufficient precision
            const b = parseFloat(baseAmount);
            const q = parseFloat(quoteAmount);
            if (isNaN(b) || isNaN(q) || b <= 0 || q <= 0) {
                throw new Error('Invalid token amounts');
            }

            // Define minimum amount thresholds
            const minBaseAmount = 0.01; // Minimum amount for any token
            const minQuoteAmount = 0.01; // Minimum amount for any token

            // Calculate final amounts, ensuring minimums
            const finalBaseAmount = Math.max(Number(b.toFixed(9)), minBaseAmount);
            const finalQuoteAmount = Math.max(Number(q.toFixed(9)), minQuoteAmount);

            // Calculate price for display
            const displayPrice = (finalQuoteAmount / finalBaseAmount).toFixed(6);

            // Check if the user likely has enough SOL balance
            let warningMessage = '';
            try {
                const solBalance = await connection.getBalance(new PublicKey(userAddress));
                const solBalanceInSol = solBalance / 1_000_000_000;

                // Creating a pool requires at least ~0.03 SOL for account rent
                if (solBalanceInSol < 0.03) {
                    warningMessage = `\n\nWARNING: Your wallet has only ${solBalanceInSol.toFixed(6)} SOL, which may not be enough to cover the network fees required to create a pool. The transaction might fail.`;
                }
            } catch (balanceError) {
                console.log('Could not check SOL balance:', balanceError);
            }

            // Determine message based on whether we're buying on create
            const actionMessage = buyOnCreate
                ? `You are about to create a new pool with:\n\n` +
                `${finalBaseAmount} ${baseToken.symbol} and ${finalQuoteAmount} ${quoteToken.symbol}\n\n` +
                `Initial price: 1 ${baseToken.symbol} = ${displayPrice} ${quoteToken.symbol}\n\n` +
                `AND immediately buy tokens with ${buyAmount} ${quoteToken.symbol}`
                : `You are about to create a new pool with:\n\n` +
                `${finalBaseAmount} ${baseToken.symbol} and ${finalQuoteAmount} ${quoteToken.symbol}\n\n` +
                `Initial price: 1 ${baseToken.symbol} = ${displayPrice} ${quoteToken.symbol}`;

            // Confirm with user before proceeding
            Alert.alert(
                'Create Pool',
                actionMessage + warningMessage + `\n\nContinue?`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => {
                            setIsLoading(false);
                        }
                    },
                    {
                        text: 'Create Pool',
                        onPress: async () => {
                            try {
                                setStatusMessage('Preparing transaction...');

                                if (buyOnCreate) {
                                    // Use createPoolAndBuy function
                                    const buyAmountFloat = parseFloat(buyAmount);
                                    if (isNaN(buyAmountFloat) || buyAmountFloat <= 0) {
                                        throw new Error('Invalid buy amount');
                                    }

                                    // Need to first ensure we have a config address, this is a placeholder
                                    // In a real implementation, you would either:
                                    // 1. First create a config and then use that address
                                    // 2. Or use an existing config address
                                    if (!configAddress || !isValidPublicKey(configAddress)) {
                                        setError('No valid config address. Please create a config first.');
                                        setIsLoading(false);
                                        return;
                                    }

                                    const result = await createPoolAndBuy(
                                        {
                                            createPoolParam: {
                                                quoteMint: quoteMint,
                                                config: configAddress,
                                                baseTokenType: 0, // SPL token
                                                quoteTokenType: 0, // SPL token
                                                name: tokenName,
                                                symbol: tokenSymbol,
                                                uri: ""
                                            },
                                            buyAmount: buyAmountFloat.toString(),
                                            minimumAmountOut: "0", // No slippage protection for initial buy
                                            referralTokenAccount: null
                                        },
                                        connection,
                                        solanaWallet,
                                        (msg) => setStatusMessage(msg)
                                    );

                                    setStatusMessage(`Pool created and tokens purchased! Tx signature: ${result.txId}`);
                                } else {
                                    // Use the original createPool function
                                    const signature = await createPool({
                                        index: DEFAULT_INDEX,
                                        baseMint: baseMint,
                                        quoteMint: quoteMint,
                                        baseAmount: finalBaseAmount,
                                        quoteAmount: finalQuoteAmount,
                                        userPublicKey: new PublicKey(userAddress),
                                        connection,
                                        solanaWallet,
                                        onStatusUpdate: (msg) => setStatusMessage(msg),
                                    });

                                    setStatusMessage(`Pool created! Tx signature: ${signature}`);
                                }

                                // Reset amounts but keep mint addresses
                                setBaseAmount('');
                                setQuoteAmount('');
                                setBuyAmount('');
                                setInitialPrice(null);
                            } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to create pool');
                                setStatusMessage(null);
                            } finally {
                                setIsLoading(false);
                            }
                        }
                    }
                ]
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create pool');
            setStatusMessage(null);
            setIsLoading(false);
        }
    }, [
        connected,
        solanaWallet,
        address,
        baseMint,
        quoteMint,
        baseAmount,
        quoteAmount,
        baseToken.symbol,
        quoteToken.symbol,
        isValidPublicKey,
        connection,
        buyOnCreate,
        buyAmount,
        configAddress,
        tokenName,
        tokenSymbol
    ]);

    if (!connected) {
        return (
            <View style={styles.container}>
                <Text style={styles.infoText}>
                    Please connect your wallet to create a pool
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Create a New Pool</Text>

            {/* Creation Mode Toggle */}
            <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Use Bonding Curve (Meteora DBC)</Text>
                <Switch
                    value={useBondingCurve}
                    onValueChange={toggleUseBondingCurve}
                    disabled={isLoading}
                    trackColor={{ false: '#767577', true: '#6E56CF' }}
                    thumbColor={useBondingCurve ? '#4C3D9F' : '#f4f3f4'}
                />
            </View>

            {/* Token Name and Symbol */}
            <Text style={styles.inputLabel}>Token Name</Text>
            <TextInput
                style={styles.input}
                value={tokenName}
                onChangeText={setTokenName}
                placeholder="Enter token name (e.g. My Token)"
                editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Token Symbol</Text>
            <TextInput
                style={styles.input}
                value={tokenSymbol}
                onChangeText={setTokenSymbol}
                placeholder="Enter token symbol (e.g. MYTKN)"
                editable={!isLoading}
            />

            {useBondingCurve ? (
                // Bonding Curve Parameters
                <>
                    <Text style={styles.inputLabel}>Initial Market Cap (USD)</Text>
                    <TextInput
                        style={styles.input}
                        value={initialMarketCap}
                        onChangeText={setInitialMarketCap}
                        placeholder="Initial market cap in USD (e.g. 10)"
                        keyboardType="numeric"
                        editable={!isLoading}
                    />

                    <Text style={styles.inputLabel}>Target Market Cap (USD)</Text>
                    <TextInput
                        style={styles.input}
                        value={targetMarketCap}
                        onChangeText={setTargetMarketCap}
                        placeholder="Target market cap in USD (e.g. 1000)"
                        keyboardType="numeric"
                        editable={!isLoading}
                    />

                    <Text style={styles.inputLabel}>Token Supply</Text>
                    <TextInput
                        style={styles.input}
                        value={tokenSupply}
                        onChangeText={setTokenSupply}
                        placeholder="Total token supply (e.g. 1000000000)"
                        keyboardType="numeric"
                        editable={!isLoading}
                    />
                </>
            ) : (
                // Standard Pool Parameters
                <>
                    {/* Config Address */}
                    <Text style={styles.inputLabel}>Config Address</Text>
                    <TextInput
                        style={styles.input}
                        value={configAddress}
                        onChangeText={setConfigAddress}
                        placeholder="Enter Meteora DBC config address"
                        editable={!isLoading}
                    />

                    {/* Base Token Selection */}
                    <Text style={styles.inputLabel}>Base Token</Text>
                    <TouchableOpacity
                        style={styles.tokenSelector}
                        onPress={() => setShowBaseTokenModal(true)}
                        disabled={isLoading}
                    >
                        <View style={styles.tokenInfo}>
                            <Text style={styles.tokenSymbol}>{baseToken.symbol}</Text>
                            <Text style={styles.tokenName}>{baseToken.name}</Text>
                        </View>
                        <Text style={styles.tokenAddress}>{baseToken.address.slice(0, 4)}...{baseToken.address.slice(-4)}</Text>
                    </TouchableOpacity>

                    {/* Quote Token Selection */}
                    <Text style={styles.inputLabel}>Quote Token</Text>
                    <TouchableOpacity
                        style={styles.tokenSelector}
                        onPress={() => setShowQuoteTokenModal(true)}
                        disabled={isLoading}
                    >
                        <View style={styles.tokenInfo}>
                            <Text style={styles.tokenSymbol}>{quoteToken.symbol}</Text>
                            <Text style={styles.tokenName}>{quoteToken.name}</Text>
                        </View>
                        <Text style={styles.tokenAddress}>{quoteToken.address.slice(0, 4)}...{quoteToken.address.slice(-4)}</Text>
                    </TouchableOpacity>

                    {/* Base Amount */}
                    <Text style={styles.inputLabel}>Base Token Amount ({baseToken.symbol})</Text>
                    <TextInput
                        style={styles.input}
                        value={baseAmount}
                        onChangeText={handleBaseAmountChange}
                        placeholder={`Enter ${baseToken.symbol} amount`}
                        keyboardType="numeric"
                        editable={!isLoading}
                    />

                    {/* Quote Amount */}
                    <Text style={styles.inputLabel}>Quote Token Amount ({quoteToken.symbol})</Text>
                    <TextInput
                        style={styles.input}
                        value={quoteAmount}
                        onChangeText={handleQuoteAmountChange}
                        placeholder={`Enter ${quoteToken.symbol} amount`}
                        keyboardType="numeric"
                        editable={!isLoading}
                    />

                    {/* Show initial price if both amounts > 0 */}
                    {initialPrice !== null && (
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>Initial Price:</Text>
                            <Text style={styles.priceValue}>
                                1 {baseToken.symbol} = {initialPrice.toFixed(6)} {quoteToken.symbol}
                            </Text>
                        </View>
                    )}
                </>
            )}

            {/* Buy on create toggle */}
            <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Buy tokens when creating pool</Text>
                <Switch
                    value={buyOnCreate}
                    onValueChange={toggleBuyOnCreate}
                    disabled={isLoading}
                    trackColor={{ false: '#767577', true: '#6E56CF' }}
                    thumbColor={buyOnCreate ? '#4C3D9F' : '#f4f3f4'}
                />
            </View>

            {/* Buy amount (only shown when toggle is on) */}
            {buyOnCreate && (
                <>
                    <Text style={styles.inputLabel}>Amount to Buy ({useBondingCurve ? 'SOL' : quoteToken.symbol})</Text>
                    <TextInput
                        style={styles.input}
                        value={buyAmount}
                        onChangeText={setBuyAmount}
                        placeholder={`Enter amount of ${useBondingCurve ? 'SOL' : quoteToken.symbol} to spend`}
                        keyboardType="numeric"
                        editable={!isLoading}
                    />
                </>
            )}

            {/* Pool creation info */}
            <View style={styles.infoContainer}>
                {useBondingCurve ? (
                    <>
                        <Text style={styles.infoTextDetail}>
                            <Text style={{ fontWeight: 'bold' }}>Bonding Curve Tokens</Text> allow token prices
                            to increase automatically as more tokens are bought, based on a mathematical curve.
                        </Text>
                        <Text style={styles.infoTextDetail}>
                            - Initial Market Cap: The starting value of all tokens
                        </Text>
                        <Text style={styles.infoTextDetail}>
                            - Target Market Cap: The value when all tokens are bought
                        </Text>
                        <Text style={styles.infoTextDetail}>
                            - Token Supply: Total number of tokens that can exist
                        </Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.infoTextDetail}>
                            Creating a pool allows you to provide liquidity between two tokens and earn fees from trades.
                        </Text>
                        <Text style={styles.infoTextDetail}>
                            Note: You must have both tokens in your wallet to create a pool.
                        </Text>
                        <Text style={styles.infoTextDetail}>
                            <Text style={{ fontWeight: 'bold' }}>Important:</Text> The minimum
                            amount required for each token is 0.01 tokens.
                        </Text>
                    </>
                )}
                <Text style={[styles.infoTextDetail, { marginTop: 8, color: '#c75e16' }]}>
                    <Text style={{ fontWeight: 'bold' }}>Mainnet Notice:</Text> Creating a pool on mainnet requires enough SOL
                    to cover rent for new accounts. You need approximately 0.03-0.05 SOL (~$4-6) in your wallet to successfully
                    create a pool, in addition to the tokens you're providing as liquidity.
                </Text>
            </View>

            {/* Create pool/token button */}
            <TouchableOpacity
                style={[styles.button, isLoading ? styles.disabledButton : null]}
                onPress={useBondingCurve ? handleCreateTokenWithCurve : handleCreatePool}
                disabled={isLoading}
            >
                <Text style={styles.buttonText}>
                    {isLoading ? 'Processing...' :
                        useBondingCurve ?
                            (buyOnCreate ? 'Create Token & Buy' : 'Create Token') :
                            (buyOnCreate ? 'Create Pool & Buy' : 'Create Pool')}
                </Text>
            </TouchableOpacity>

            {/* Loading */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#6E56CF" />
                </View>
            )}

            {/* Status Message */}
            {statusMessage && (
                <View style={
                    statusMessage.includes('failed') || statusMessage.includes('Failed')
                        ? styles.errorContainer
                        : styles.statusContainer
                }>
                    <Text style={
                        statusMessage.includes('failed') || statusMessage.includes('Failed')
                            ? styles.errorText
                            : styles.statusText
                    }>
                        {statusMessage}
                    </Text>
                </View>
            )}

            {/* Error display */}
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    {error.includes('Invalid account discriminator') && (
                        <Text style={styles.errorHint}>
                            The PumpSwap SDK couldn't find a valid pool. This can happen if the pool doesn't exist or the SDK is trying to use the wrong program ID.
                        </Text>
                    )}
                </View>
            )}

            {/* Token Selection Modals */}
            <SelectTokenModal
                visible={showBaseTokenModal}
                onClose={() => setShowBaseTokenModal(false)}
                onTokenSelected={handleBaseTokenSelected}
            />

            <SelectTokenModal
                visible={showQuoteTokenModal}
                onClose={() => setShowQuoteTokenModal(false)}
                onTokenSelected={handleQuoteTokenSelected}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    infoText: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
        color: '#1E293B',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748B',
        marginBottom: 4,
    },
    tokenSelector: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tokenInfo: {
        flexDirection: 'column',
    },
    tokenSymbol: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    tokenName: {
        fontSize: 12,
        color: '#64748B',
    },
    tokenAddress: {
        fontSize: 12,
        color: '#94A3B8',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 12,
    },
    priceContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 16,
        marginVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priceLabel: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    priceValue: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '600',
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 12,
        paddingHorizontal: 4,
    },
    toggleLabel: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#6E56CF',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
    loadingContainer: {
        marginTop: 12,
        alignItems: 'center',
    },
    statusContainer: {
        marginTop: 10,
        backgroundColor: '#EFF6FF',
        borderRadius: 6,
        padding: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6',
    },
    statusText: {
        fontSize: 14,
        color: '#64748B',
    },
    errorContainer: {
        marginTop: 10,
        backgroundColor: '#ffeef0',
        borderRadius: 6,
        padding: 8,
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 14,
    },
    infoContainer: {
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        padding: 12,
        marginVertical: 12,
    },
    infoTextDetail: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8,
    },
    errorHint: {
        marginTop: 4,
        fontSize: 12,
        color: '#64748B',
        fontStyle: 'italic',
    },
});
