import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ActivityIndicator,
    TextInput,
    Image,
    StyleSheet,
    Dimensions,
    Alert,
    Keyboard,
    Platform,
} from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '@/modules/walletProviders/hooks/useWallet';
import {
    TokenInfo,
    fetchTokenBalance,
    fetchTokenPrice,
    fetchTokenMetadata
} from '@/modules/dataModule';
import {
    TradeService,
    SwapProvider
} from '@/modules/dataModule/services/tradeService';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import SelectTokenModal from '@/screens/SampleUI/Swap/SelectTokenModal';

const { width, height } = Dimensions.get('window');

interface SwapDrawerProps {
    visible: boolean;
    onClose: () => void;
    targetToken: TokenInfo;
    onSwapComplete?: (tradeInfo: {
        success: boolean;
        signature?: string;
        inputToken: TokenInfo;
        outputToken: TokenInfo;
        inputAmount: number;
        outputAmount: number;
        isSell: boolean;
    }) => void;
    isSell?: boolean;
}

const SwapDrawer: React.FC<SwapDrawerProps> = ({
    visible,
    onClose,
    targetToken,
    onSwapComplete,
    isSell = false
}) => {
    const { publicKey: userPublicKey, connected, sendTransaction } = useWallet();

    // Input token state (SOL by default for buy, targetToken for sell)
    const [inputToken, setInputToken] = useState<TokenInfo | null>(null);
    const [outputToken, setOutputToken] = useState<TokenInfo | null>(null);
    const [inputValue, setInputValue] = useState('1');
    const [estimatedOutputAmount, setEstimatedOutputAmount] = useState('0');

    // UI states
    const [currentBalance, setCurrentBalance] = useState<number | null>(null);
    const [inputTokenPrice, setInputTokenPrice] = useState<number | null>(null);
    const [outputTokenPrice, setOutputTokenPrice] = useState<number | null>(null);
    const [showSelectTokenModal, setShowSelectTokenModal] = useState(false);

    // Transaction states
    const [loading, setLoading] = useState(false);
    const [swapping, setSwapping] = useState(false);
    const [resultMsg, setResultMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [txSignature, setTxSignature] = useState('');

    // Refs to track component mount state
    const isMounted = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Initialize tokens when drawer becomes visible
    useEffect(() => {
        if (visible) {
            initializeTokens();
        }
    }, [visible]);

    // Initialize tokens based on buy/sell mode
    const initializeTokens = useCallback(async () => {
        setLoading(true);
        setResultMsg('Loading tokens...');

        try {
            // Get SOL token 
            const solToken = await fetchTokenMetadata('So11111111111111111111111111111111111111112');

            if (isMounted.current) {
                if (isSell) {
                    // For sell: targetToken is input, SOL is output
                    setInputToken(targetToken);
                    setOutputToken(solToken);
                } else {
                    // For buy: SOL is input, targetToken is output
                    setInputToken(solToken);
                    setOutputToken(targetToken);
                }

                // Reset input value
                setInputValue('1');

                // Fetch balance and price for input token
                if (userPublicKey) {
                    // Fetch balance of the appropriate token based on operation
                    const tokenToCheckBalance = isSell ? targetToken : solToken;
                    const balance = await fetchTokenBalance(userPublicKey, tokenToCheckBalance);

                    if (isMounted.current) {
                        setCurrentBalance(balance);

                        // Fetch prices for input and output tokens
                        const inToken = isSell ? targetToken : solToken;
                        const outToken = isSell ? solToken : targetToken;

                        const inPrice = await fetchTokenPrice(inToken);
                        const outPrice = await fetchTokenPrice(outToken);

                        if (isMounted.current) {
                            setInputTokenPrice(inPrice);
                            setOutputTokenPrice(outPrice);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error initializing tokens:', error);
            if (isMounted.current) {
                setErrorMsg('Failed to load token information');
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setResultMsg('');
            }
        }
    }, [targetToken, userPublicKey, isSell]);

    // Update the header title to show Buy or Sell
    const headerTitle = isSell ? `Sell ${targetToken.symbol}` : `Buy ${targetToken.symbol}`;

    // Estimate swap output amount
    const estimateSwap = useCallback(async () => {
        if (!connected || parseFloat(inputValue) <= 0 || !inputToken || !outputToken) {
            return;
        }

        try {
            // Get prices for both tokens
            const inPrice = inputTokenPrice ?? await fetchTokenPrice(inputToken);
            const outPrice = outputTokenPrice ?? await fetchTokenPrice(outputToken);

            if (inPrice && outPrice && isMounted.current) {
                const inputValueNum = parseFloat(inputValue);

                // Calculate USD value
                const inputValueUsd = inputValueNum * inPrice;

                // Calculate output amount based on equivalent USD value (minus simulated 0.3% fee)
                const estimatedOutput = (inputValueUsd / outPrice) * 0.997;

                // Format the number properly based on token decimals
                setEstimatedOutputAmount(estimatedOutput.toFixed(outputToken.decimals <= 6 ? outputToken.decimals : 6));
            }
        } catch (error) {
            console.error('Error estimating swap:', error);
        }
    }, [connected, inputValue, inputToken, outputToken, inputTokenPrice, outputTokenPrice]);

    // Calculate USD value for a given token amount
    const calculateUsdValue = useCallback((amount: string, tokenPrice: number | null) => {
        if (!tokenPrice || tokenPrice <= 0 || !amount || isNaN(parseFloat(amount))) {
            return '$0.00';
        }

        const numericAmount = parseFloat(amount);
        const usdValue = numericAmount * tokenPrice;

        // Format based on value size
        if (usdValue < 0.01) return '$<0.01';
        if (usdValue < 1) return `$${usdValue.toFixed(3)}`;
        if (usdValue < 1000) return `$${usdValue.toFixed(2)}`;
        return `$${(usdValue / 1000).toFixed(2)}K`;
    }, []);

    // Update estimates when input changes
    useEffect(() => {
        estimateSwap();
    }, [inputValue, inputToken, outputToken, estimateSwap]);

    // Handle token selection
    const handleTokenSelected = useCallback(async (token: TokenInfo) => {
        if (!isMounted.current) return;

        try {
            // In sell mode, we should only allow changing the output token (what we're selling for)
            // In buy mode, we should only allow changing the input token (what we're buying with)
            if (isSell) {
                // In sell mode, we're always selling the target token, so we can only change the output (destination)
                setOutputToken(token);
            } else {
                // In buy mode, we're always buying the target token, so we can only change the input (source)
                setInputToken(token);
            }

            setShowSelectTokenModal(false);

            // Reset input value and fetch new balance
            setInputValue('1');
            setCurrentBalance(null);

            // Fetch balance and price for new token
            if (userPublicKey) {
                // Only need to fetch balance for input token (what we're spending)
                const tokenToCheckBalance = isSell ? inputToken : token;
                if (tokenToCheckBalance) {
                    const balance = await fetchTokenBalance(userPublicKey, tokenToCheckBalance);
                    if (isMounted.current) {
                        setCurrentBalance(balance);

                        // Update prices for both tokens
                        const inTokenPrice = isSell ?
                            await fetchTokenPrice(inputToken!) :
                            await fetchTokenPrice(token);

                        const outTokenPrice = isSell ?
                            await fetchTokenPrice(token) :
                            await fetchTokenPrice(outputToken!);

                        if (isMounted.current) {
                            setInputTokenPrice(inTokenPrice);
                            setOutputTokenPrice(outTokenPrice);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error selecting token:', error);
            if (isMounted.current) {
                setErrorMsg('Failed to load token information');
                setTimeout(() => isMounted.current && setErrorMsg(''), 3000);
            }
        }
    }, [userPublicKey, isSell, inputToken, outputToken]);

    // Handle MAX button click
    const handleMaxButtonClick = useCallback(async () => {
        if (!connected || !userPublicKey || !inputToken) {
            Alert.alert(
                "Wallet Not Connected",
                "Please connect your wallet to view your balance."
            );
            return;
        }

        if (currentBalance !== null && currentBalance > 0) {
            setInputValue(String(currentBalance));
            return;
        }

        setLoading(true);
        setResultMsg("Fetching your balance...");

        try {
            const balance = await fetchTokenBalance(userPublicKey, inputToken);

            if (isMounted.current) {
                setLoading(false);
                setResultMsg("");

                if (balance !== null && balance > 0) {
                    setInputValue(String(balance));
                } else {
                    Alert.alert(
                        "Balance Unavailable",
                        `Could not get your ${inputToken.symbol} balance. Please check your wallet connection.`
                    );
                }
            }
        } catch (error) {
            console.error("Error in MAX button handler:", error);
            if (isMounted.current) {
                setLoading(false);
                setResultMsg("");
                setErrorMsg(`Failed to fetch your ${inputToken?.symbol || 'token'} balance`);
                setTimeout(() => isMounted.current && setErrorMsg(''), 3000);
            }
        }
    }, [currentBalance, inputToken, userPublicKey, connected]);

    // Execute the swap
    const executeSwap = useCallback(async () => {
        if (!connected || !userPublicKey) {
            Alert.alert("Connect Wallet", "Please connect your wallet to swap tokens.");
            return;
        }

        if (!inputToken || !outputToken) {
            setErrorMsg("Please select tokens for the swap.");
            return;
        }

        const numericInputValue = parseFloat(inputValue);
        if (isNaN(numericInputValue) || numericInputValue <= 0) {
            setErrorMsg("Please enter a valid amount.");
            return;
        }

        if (numericInputValue > (currentBalance || 0)) {
            setErrorMsg(`Insufficient ${inputToken.symbol} balance.`);
            return;
        }

        setSwapping(true);
        setErrorMsg("");
        setResultMsg("Preparing swap...");

        try {
            // Only using Jupiter as the provider
            const provider: SwapProvider = 'Jupiter';

            // Execute the swap through the TradeService
            const result = await TradeService.executeSwap(
                inputToken,
                outputToken,
                inputValue,
                userPublicKey,
                sendTransaction,
                {
                    statusCallback: (status) => {
                        if (isMounted.current) {
                            setResultMsg(status);
                        }
                    },
                    isComponentMounted: () => isMounted.current
                },
                provider
            );

            if (isMounted.current) {
                if (result.success) {
                    setTxSignature(result.signature || '');
                    setResultMsg(`Swap successful! ${inputValue} ${inputToken.symbol} → ${parseFloat(estimatedOutputAmount).toFixed(4)} ${outputToken.symbol}`);

                    // Reset input field
                    setInputValue('1');

                    // Provide detailed trade info to parent component
                    if (onSwapComplete) {
                        onSwapComplete({
                            success: true,
                            signature: result.signature,
                            inputToken,
                            outputToken,
                            inputAmount: parseFloat(inputValue),
                            outputAmount: parseFloat(estimatedOutputAmount),
                            isSell
                        });
                    }

                    // Auto-close the drawer after successful swap (with a delay)
                    setTimeout(() => {
                        if (isMounted.current) {
                            onClose();
                        }
                    }, 3000);
                } else {
                    setErrorMsg(result.error?.toString() || "Swap failed due to an unknown error.");
                }
            }
        } catch (error) {
            console.error("Swap execution error:", error);
            if (isMounted.current) {
                setErrorMsg(error instanceof Error ? error.message : "Failed to execute swap.");
            }
        } finally {
            if (isMounted.current) {
                setSwapping(false);
            }
        }
    }, [connected, userPublicKey, inputToken, outputToken, inputValue, currentBalance, estimatedOutputAmount, sendTransaction, onSwapComplete, onClose, isSell]);

    // Update the swap button text to say "Buy" or "Sell" instead of "Swap"
    const getSwapButtonText = useCallback(() => {
        if (!connected) return 'Connect Wallet';
        if (isSell) return `Sell ${inputToken?.symbol || ''}`;
        return `Buy ${outputToken?.symbol || ''}`;
    }, [connected, isSell, inputToken?.symbol, outputToken?.symbol]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>

            <View style={styles.drawerContainer}>
                {/* Drag Handle */}
                <View style={styles.dragHandle} />

                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>{headerTitle}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close-circle" size={28} color={COLORS.greyLight} />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    {/* From (Input) Token Section */}
                    <View style={styles.swapSection}>
                        <Text style={styles.swapSectionLabel}>From</Text>
                        <View style={styles.tokenInputContainer}>
                            <TouchableOpacity
                                style={styles.tokenSelector}
                                onPress={() => isSell ? null : setShowSelectTokenModal(true)}
                                disabled={isSell}
                            >
                                {inputToken ? (
                                    <>
                                        <View style={styles.tokenLogoWrapper}>
                                            <Image
                                                source={{ uri: inputToken.logoURI }}
                                                style={styles.tokenLogo}
                                                defaultSource={require('@/assets/images/SENDlogo.png')}
                                            />
                                        </View>
                                        <Text style={styles.tokenSymbol}>{inputToken.symbol}</Text>
                                        {!isSell && <View style={styles.chevronContainer}>
                                            <Ionicons name="chevron-down" size={16} color={COLORS.greyLight} />
                                        </View>}
                                    </>
                                ) : (
                                    <Text style={styles.selectTokenText}>Select token</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.amountInput}
                                    value={inputValue}
                                    onChangeText={setInputValue}
                                    keyboardType="decimal-pad"
                                    placeholderTextColor={COLORS.greyLight}
                                    placeholder="0.0"
                                />

                                <TouchableOpacity style={styles.maxButton} onPress={handleMaxButtonClick}>
                                    <Text style={styles.maxButtonText}>MAX</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* {inputToken && inputTokenPrice && (
                            <Text style={styles.tokenInfo}>
                                Balance: {currentBalance !== null ? currentBalance.toFixed(4) : '...'} •
                                {' '}{calculateUsdValue(inputValue, inputTokenPrice)}
                            </Text>
                        )} */}
                    </View>

                    {/* Swap Direction Indicator */}
                    <View style={styles.swapDirectionContainer}>
                        <View style={styles.swapDirectionIcon}>
                            <Ionicons name="arrow-down" size={18} color={COLORS.white} />
                        </View>
                    </View>

                    {/* To (Output) Token Section */}
                    <View style={styles.swapSection}>
                        <Text style={styles.swapSectionLabel}>To (Estimated)</Text>
                        <View style={styles.tokenInputContainer}>
                            <TouchableOpacity
                                style={styles.tokenSelector}
                                onPress={() => isSell ? setShowSelectTokenModal(true) : null}
                                disabled={!isSell}
                            >
                                {outputToken ? (
                                    <>
                                        <View style={styles.tokenLogoWrapper}>
                                            <Image
                                                source={{ uri: outputToken.logoURI }}
                                                style={styles.tokenLogo}
                                                defaultSource={require('@/assets/images/SENDlogo.png')}
                                            />
                                        </View>
                                        <Text style={styles.tokenSymbol}>{outputToken.symbol}</Text>
                                        {isSell && <View style={styles.chevronContainer}>
                                            <Ionicons name="chevron-down" size={16} color={COLORS.greyLight} />
                                        </View>}
                                    </>
                                ) : (
                                    <Text style={styles.selectTokenText}>Select token</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.outputContainer}>
                                <Text style={styles.outputAmount}>{estimatedOutputAmount}</Text>
                            </View>
                        </View>

                        {/* {outputToken && outputTokenPrice && (
                            <Text style={styles.tokenInfo}>
                                {calculateUsdValue(estimatedOutputAmount, outputTokenPrice)}
                            </Text>
                        )} */}
                    </View>

                    {/* Status Messages */}
                    {errorMsg ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={18} color={COLORS.errorRed} style={styles.statusIcon} />
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    ) : resultMsg ? (
                        <View style={styles.resultContainer}>
                            <Ionicons name="information-circle" size={18} color="#47D18C" style={styles.statusIcon} />
                            <Text style={styles.resultText}>{resultMsg}</Text>
                        </View>
                    ) : null}

                    {/* Rate Information */}
                    <View style={styles.rateInfoContainer}>
                        <Text style={styles.rateInfoLabel}>Rate</Text>
                        <Text style={styles.rateInfoValue}>
                            1 {inputToken?.symbol || '--'} ≈ {(parseFloat(estimatedOutputAmount) / parseFloat(inputValue || '1')).toFixed(6)} {outputToken?.symbol || '--'}
                        </Text>
                    </View>

                    {/* Swap Button */}
                    <TouchableOpacity
                        style={[
                            styles.swapButton,
                            (!connected || swapping || loading) && styles.disabledButton
                        ]}
                        onPress={executeSwap}
                        disabled={!connected || swapping || loading}
                    >
                        {swapping || loading ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <Text style={styles.swapButtonText}>
                                {getSwapButtonText()}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Powered By */}
                    <View style={styles.poweredByContainer}>
                        <Text style={styles.poweredByText}>Powered by</Text>
                        <Text style={styles.jupiterText}>Jupiter</Text>
                    </View>
                </View>
            </View>

            {/* Token Selection Modal */}
            <SelectTokenModal
                visible={showSelectTokenModal}
                onClose={() => setShowSelectTokenModal(false)}
                onTokenSelected={handleTokenSelected}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    drawerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.darkerBackground,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        maxHeight: height * 0.9,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
        borderBottomWidth: 0,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.borderDarkColor,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 6,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderDarkColor,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: '700',
        color: COLORS.white,
    },
    closeButton: {
        padding: 2,
    },
    contentContainer: {
        padding: 16,
    },
    swapSection: {
        marginBottom: 12,
    },
    swapSectionLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.greyLight,
        marginBottom: 6,
        fontWeight: '600',
    },
    tokenInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.background,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
    },
    tokenSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 10,
        borderRightWidth: 1,
        borderRightColor: COLORS.borderDarkColor,
        height: 36,
    },
    tokenLogoWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.lighterBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
        padding: 1,
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
    },
    tokenLogo: {
        width: 22,
        height: 22,
        borderRadius: 11,
    },
    chevronContainer: {
        backgroundColor: COLORS.lighterBackground,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tokenSymbol: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: '600',
        color: COLORS.white,
        marginRight: 6,
    },
    selectTokenText: {
        fontSize: TYPOGRAPHY.size.md,
        color: COLORS.brandPrimary,
        marginRight: 6,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginLeft: 10,
    },
    amountInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: '700',
        color: COLORS.white,
        textAlign: 'right',
        padding: 0,
    },
    maxButton: {
        backgroundColor: COLORS.brandPrimary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 6,
    },
    maxButtonText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: '600',
        color: COLORS.white,
    },
    outputContainer: {
        flex: 1,
        alignItems: 'flex-end',
        marginLeft: 10,
    },
    outputAmount: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: '700',
        color: COLORS.white,
    },
    tokenInfo: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.greyMid,
        marginTop: 6,
        marginLeft: 2,
    },
    swapDirectionContainer: {
        alignItems: 'center',
        marginVertical: 4,
    },
    swapDirectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.brandPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.darkerBackground,
    },
    statusIcon: {
        marginRight: 6,
    },
    errorContainer: {
        backgroundColor: 'rgba(255, 87, 87, 0.15)',
        padding: 10,
        borderRadius: 10,
        marginVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    errorText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.errorRed,
        flex: 1,
    },
    resultContainer: {
        backgroundColor: 'rgba(71, 209, 140, 0.15)',
        padding: 10,
        borderRadius: 10,
        marginVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    resultText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: '#47D18C',
        flex: 1,
    },
    rateInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: COLORS.lighterBackground,
        borderRadius: 10,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
    },
    rateInfoLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.greyLight,
        fontWeight: '500',
    },
    rateInfoValue: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.white,
        fontWeight: '600',
    },
    swapButton: {
        backgroundColor: COLORS.brandPrimary,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        shadowColor: COLORS.brandPrimary,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledButton: {
        backgroundColor: `${COLORS.brandPrimary}80`,
        shadowOpacity: 0,
        elevation: 0,
    },
    swapButtonText: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: '700',
        color: COLORS.white,
    },
    poweredByContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
    },
    poweredByText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.greyMid,
        marginRight: 4,
    },
    jupiterText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: '600',
        color: '#FFA726',
    },
});

export default SwapDrawer; 