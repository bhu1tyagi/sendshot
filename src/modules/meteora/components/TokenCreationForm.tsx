import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import {
    TokenType,
    FeeSchedulerMode,
    ActivationType,
    CollectFeeMode,
    MigrationOption,
    MigrationFeeOption,
    BuildCurveByMarketCapParams,
} from '../types';
import { buildCurveByMarketCap, createPool, createTokenWithCurve } from '../services/meteoraService';
import BondingCurveVisualizer from './BondingCurveVisualizer';
import { Connection } from '@solana/web3.js';
import { useWallet } from '@/modules/walletProviders/hooks/useWallet';
import BN from 'bn.js';
import { HELIUS_STAKED_URL } from '@env';
import { useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { TokenService } from '@/shared/state/tokens';
import { useAppSelector } from '@/shared/hooks/useReduxHooks';

interface TokenCreationFormProps {
    walletAddress: string;
    onTokenCreated?: (tokenAddress: string, txId: string) => void;
}

export default function TokenCreationForm({
    walletAddress,
    onTokenCreated,
}: TokenCreationFormProps) {
    // Basic token info
    const [tokenName, setTokenName] = useState('');
    const [tokenSymbol, setTokenSymbol] = useState('');
    const [tokenSupply, setTokenSupply] = useState('1000000000');
    const [tokenDecimals, setTokenDecimals] = useState('9');
    const [tokenWebsite, setTokenWebsite] = useState('');

    // Market cap settings
    const [initialMarketCap, setInitialMarketCap] = useState('100');
    const [migrationMarketCap, setMigrationMarketCap] = useState('3000');

    // Token type
    const [isToken2022, setIsToken2022] = useState(false);

    // Buy on creation options
    const [buyOnCreate, setBuyOnCreate] = useState(false);
    const [buyAmount, setBuyAmount] = useState('1');

    // Advanced options
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [baseFeeBps, setBaseFeeBps] = useState('100'); // 1% fee
    const [dynamicFeeEnabled, setDynamicFeeEnabled] = useState(true);
    const [collectFeeBoth, setCollectFeeBoth] = useState(false);
    const [selectedMigrationFee, setSelectedMigrationFee] = useState(MigrationFeeOption.FixedBps25);

    // LP distribution
    const [partnerLpPercentage, setPartnerLpPercentage] = useState('25');
    const [creatorLpPercentage, setCreatorLpPercentage] = useState('25');
    const [partnerLockedLpPercentage, setPartnerLockedLpPercentage] = useState('25');
    const [creatorLockedLpPercentage, setCreatorLockedLpPercentage] = useState('25');

    // Form state
    const [error, setError] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [step, setStep] = useState(1);
    const [configAddress, setConfigAddress] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    // Get wallet and connection
    const wallet = useWallet();
    // Create a connection to the Solana network
    const connection = new Connection(HELIUS_STAKED_URL, 'confirmed');

    // Add new state variables for parsed numeric values
    const [parsedInitialMarketCap, setParsedInitialMarketCap] = useState(100);
    const [parsedMigrationMarketCap, setParsedMigrationMarketCap] = useState(3000);
    const [parsedTokenSupply, setParsedTokenSupply] = useState(1000000000);

    // Add a new state variable for logo URL
    const [tokenLogo, setTokenLogo] = useState('');

    // Update parsed values when inputs change
    useEffect(() => {
        const initCap = Number(initialMarketCap);
        if (!isNaN(initCap) && initCap > 0) {
            setParsedInitialMarketCap(initCap);
        }

        const migCap = Number(migrationMarketCap);
        if (!isNaN(migCap) && migCap > 0) {
            setParsedMigrationMarketCap(migCap);
        }

        const supply = Number(tokenSupply);
        if (!isNaN(supply) && supply > 0) {
            setParsedTokenSupply(supply);
        }
    }, [initialMarketCap, migrationMarketCap, tokenSupply]);

    const validateStep1 = () => {
        if (!tokenName.trim()) {
            setError('Token name is required');
            return false;
        }

        if (!tokenSymbol.trim()) {
            setError('Token symbol is required');
            return false;
        }

        const supplyNum = Number(tokenSupply);
        if (isNaN(supplyNum) || supplyNum <= 0) {
            setError('Token supply must be a positive number');
            return false;
        }

        const decimalsNum = Number(tokenDecimals);
        if (isNaN(decimalsNum) || decimalsNum < 6 || decimalsNum > 9) {
            setError('Token decimals must be between 6 and 9');
            return false;
        }

        return true;
    };

    const validateStep2 = () => {
        const initMarketCap = Number(initialMarketCap);
        if (isNaN(initMarketCap) || initMarketCap <= 0) {
            setError('Initial market cap must be a positive number');
            return false;
        }

        const migMarketCap = Number(migrationMarketCap);
        if (isNaN(migMarketCap) || migMarketCap <= initMarketCap) {
            setError('Migration market cap must be greater than initial market cap');
            return false;
        }

        const feeVal = Number(baseFeeBps);
        if (isNaN(feeVal) || feeVal < 0 || feeVal > 1000) {
            setError('Base fee must be between 0 and 1000 basis points (0-10%)');
            return false;
        }

        // Validate buy amount if buy on create is enabled
        if (buyOnCreate) {
            const buyAmountVal = Number(buyAmount);
            if (isNaN(buyAmountVal) || buyAmountVal <= 0) {
                setError('Buy amount must be a positive number');
                return false;
            }

            // Check if buy amount is reasonable (usually not more than 100 SOL)
            if (buyAmountVal > 100) {
                setError('Buy amount is unusually high. Please check the amount.');
                return false;
            }
        }

        // Check LP percentages add up to 100%
        const totalPercentage = Number(partnerLpPercentage) +
            Number(creatorLpPercentage) +
            Number(partnerLockedLpPercentage) +
            Number(creatorLockedLpPercentage);

        if (totalPercentage !== 100) {
            setError('LP percentages must add up to 100%');
            return false;
        }

        return true;
    };

    const handleNext = () => {
        setError('');
        if (step === 1 && validateStep1()) {
            setStep(2);
        }
    };

    const handleBack = () => {
        setError('');
        if (step === 2) {
            setStep(1);
        }
    };

    const handleCreateToken = async () => {
        if (!validateStep2()) {
            return;
        }

        setError('');
        setIsCreating(true);
        setStatusMessage('Preparing to create token...');

        try {
            // Log parameters for debugging
            console.log('Creating token with params:', {
                tokenName,
                tokenSymbol,
                initialMarketCap: parseFloat(initialMarketCap),
                targetMarketCap: parseFloat(migrationMarketCap),
                tokenSupply: parseInt(tokenSupply),
                buyAmount: buyOnCreate ? parseFloat(buyAmount) : undefined,
                website: tokenWebsite
            });

            // Use the improved createTokenWithCurve function
            const result = await createTokenWithCurve(
                {
                    tokenName,
                    tokenSymbol,
                    initialMarketCap: parseFloat(initialMarketCap),
                    targetMarketCap: parseFloat(migrationMarketCap),
                    tokenSupply: parseInt(tokenSupply),
                    buyAmount: buyOnCreate ? parseFloat(buyAmount) : undefined,
                    website: tokenWebsite,
                    logo: tokenLogo
                },
                connection,
                wallet,
                setStatusMessage
            );

            console.log('Token created successfully:', result);

            if (onTokenCreated && result.baseMintAddress) {
                onTokenCreated(result.baseMintAddress, result.txId);
            }

            // After successful token creation, register it in our centralized service
            const dispatch = useAppDispatch();
            const userId = useAppSelector(state => state.auth.address);
            
            if (userId && result.baseMintAddress) {
                try {
                    setStatusMessage('Registering token in database...');
                    
                    // Register the token using our centralized service
                    await TokenService.registerToken({
                        address: result.baseMintAddress,
                        name: tokenName,
                        symbol: tokenSymbol,
                        creatorId: userId,
                        initialPrice: parseFloat(initialMarketCap) / parseInt(tokenSupply),
                        totalSupply: tokenSupply,
                        protocolType: 'meteora',
                        logoURI: tokenLogo || undefined,
                    }, dispatch);
                    
                    setStatusMessage('Token registered successfully!');
                } catch (registerError) {
                    console.error('Error registering token:', registerError);
                    setStatusMessage('Token created on-chain but registration failed. Please try again later.');
                }
            }
        } catch (err) {
            console.error('Error creating token:', err);
            setError(`Failed to create token: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsCreating(false);
        }
    };

    const renderStep1 = () => {
        return (
            <View>
                <Text style={styles.sectionTitle}>Basic Token Information</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Token Name</Text>
                    <TextInput
                        style={styles.input}
                        value={tokenName}
                        onChangeText={setTokenName}
                        placeholder="e.g. My Awesome Token"
                        placeholderTextColor={COLORS.greyDark}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Token Symbol</Text>
                    <TextInput
                        style={styles.input}
                        value={tokenSymbol}
                        onChangeText={setTokenSymbol}
                        placeholder="e.g. MAT"
                        placeholderTextColor={COLORS.greyDark}
                        maxLength={10}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Website (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={tokenWebsite}
                        onChangeText={setTokenWebsite}
                        placeholder="e.g. https://example.com"
                        placeholderTextColor={COLORS.greyDark}
                    />
                    <Text style={styles.helperText}>Project website for token metadata</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Logo URL (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={tokenLogo}
                        onChangeText={setTokenLogo}
                        placeholder="e.g. https://example.com/logo.png"
                        placeholderTextColor={COLORS.greyDark}
                    />
                    <Text style={styles.helperText}>Direct URL to token logo image</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Total Supply</Text>
                    <TextInput
                        style={styles.input}
                        value={tokenSupply}
                        onChangeText={setTokenSupply}
                        placeholder="e.g. 1000000000"
                        placeholderTextColor={COLORS.greyDark}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Decimals (6-9)</Text>
                    <TextInput
                        style={styles.input}
                        value={tokenDecimals}
                        onChangeText={setTokenDecimals}
                        placeholder="e.g. 9"
                        placeholderTextColor={COLORS.greyDark}
                        keyboardType="numeric"
                        maxLength={1}
                    />
                </View>

                {/* <View style={styles.switchContainer}>
                    <Text style={styles.label}>Use Token-2022 Standard</Text>
                    <Switch
                        value={isToken2022}
                        onValueChange={setIsToken2022}
                        trackColor={{ false: COLORS.greyDark, true: COLORS.brandPrimary }}
                        thumbColor={isToken2022 ? COLORS.white : COLORS.greyLight}
                    />
                </View> */}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity style={styles.actionButton} onPress={handleNext}>
                    <LinearGradient
                        colors={['#32D4DE', '#B591FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionButtonGradient}
                    >
                        <Text style={styles.actionButtonText}>Next</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    };

    const renderStep2 = () => {
        return (
            <View>
                <Text style={styles.sectionTitle}>Bonding Curve Configuration</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Initial Market Cap (SOL)</Text>
                    <TextInput
                        style={styles.input}
                        value={initialMarketCap}
                        onChangeText={setInitialMarketCap}
                        placeholder="e.g. 100"
                        placeholderTextColor={COLORS.greyDark}
                        keyboardType="numeric"
                    />
                    <Text style={styles.helperText}>Starting market cap for your token.</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Migration Market Cap (SOL)</Text>
                    <TextInput
                        style={styles.input}
                        value={migrationMarketCap}
                        onChangeText={setMigrationMarketCap}
                        placeholder="e.g. 3000"
                        placeholderTextColor={COLORS.greyDark}
                        keyboardType="numeric"
                    />
                    <Text style={styles.helperText}>When reached, token graduates to DAMM V1.</Text>
                </View>

                {/* Buy on create option */}
                <View style={styles.switchContainer}>
                    <Text style={styles.label}>Buy tokens after creation</Text>
                    <Switch
                        value={buyOnCreate}
                        onValueChange={setBuyOnCreate}
                        trackColor={{ false: COLORS.greyDark, true: COLORS.brandPrimary }}
                        thumbColor={buyOnCreate ? COLORS.white : COLORS.greyLight}
                    />
                </View>

                {/* Buy amount input (only shown when toggle is on) */}
                {buyOnCreate && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Amount to buy (SOL)</Text>
                        <TextInput
                            style={styles.input}
                            value={buyAmount}
                            onChangeText={setBuyAmount}
                            placeholder="e.g. 1"
                            placeholderTextColor={COLORS.greyDark}
                            keyboardType="numeric"
                        />
                        <Text style={styles.helperText}>Amount of SOL to spend buying your token after creation.</Text>
                    </View>
                )}

                {/* Add the bonding curve visualizer */}
                <BondingCurveVisualizer
                    initialMarketCap={parsedInitialMarketCap}
                    migrationMarketCap={parsedMigrationMarketCap}
                    tokenSupply={parsedTokenSupply}
                    baseFeeBps={Number(baseFeeBps)}
                />

                <TouchableOpacity
                    style={styles.advancedToggle}
                    onPress={() => setShowAdvanced(!showAdvanced)}
                >
                    <Text style={styles.advancedToggleText}>
                        {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                    </Text>
                </TouchableOpacity>

                {showAdvanced && (
                    <View style={styles.advancedContainer}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Base Fee (BPS)</Text>
                            <TextInput
                                style={styles.input}
                                value={baseFeeBps}
                                onChangeText={setBaseFeeBps}
                                placeholder="e.g. 100 (1%)"
                                placeholderTextColor={COLORS.greyDark}
                                keyboardType="numeric"
                                maxLength={4}
                            />
                            <Text style={styles.helperText}>100 BPS = 1% trading fee</Text>
                        </View>

                        <View style={styles.switchContainer}>
                            <Text style={styles.label}>Enable Dynamic Fee</Text>
                            <Switch
                                value={dynamicFeeEnabled}
                                onValueChange={setDynamicFeeEnabled}
                                trackColor={{ false: COLORS.greyDark, true: COLORS.brandPrimary }}
                                thumbColor={dynamicFeeEnabled ? COLORS.white : COLORS.greyLight}
                            />
                        </View>

                        <View style={styles.switchContainer}>
                            <Text style={styles.label}>Collect Fee in Both Tokens</Text>
                            <Switch
                                value={collectFeeBoth}
                                onValueChange={setCollectFeeBoth}
                                trackColor={{ false: COLORS.greyDark, true: COLORS.brandPrimary }}
                                thumbColor={collectFeeBoth ? COLORS.white : COLORS.greyLight}
                            />
                        </View>

                        <Text style={styles.label}>Migration Fee Option</Text>
                        <View style={styles.feeTiersContainer}>
                            {[
                                { label: '0.25%', value: MigrationFeeOption.FixedBps25 },
                                { label: '0.3%', value: MigrationFeeOption.FixedBps30 },
                                { label: '1%', value: MigrationFeeOption.FixedBps100 },
                                { label: '2%', value: MigrationFeeOption.FixedBps200 },
                                { label: '4%', value: MigrationFeeOption.FixedBps400 },
                                { label: '6%', value: MigrationFeeOption.FixedBps600 },
                            ].map((fee) => (
                                <TouchableOpacity
                                    key={`fee-${fee.value}`}
                                    style={[
                                        styles.feeTierButton,
                                        selectedMigrationFee === fee.value && styles.feeTierButtonSelected,
                                    ]}
                                    onPress={() => setSelectedMigrationFee(fee.value)}
                                >
                                    <Text
                                        style={[
                                            styles.feeTierText,
                                            selectedMigrationFee === fee.value && styles.feeTierTextSelected,
                                        ]}
                                    >
                                        {fee.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>LP Distribution</Text>
                        <Text style={styles.helperText}>Total must add up to 100%</Text>
                        <View style={styles.lpDistributionContainer}>
                            <View style={styles.lpInputGroup}>
                                <Text style={styles.lpLabel}>Partner</Text>
                                <TextInput
                                    style={styles.lpInput}
                                    value={partnerLpPercentage}
                                    onChangeText={setPartnerLpPercentage}
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.lpPercent}>%</Text>
                            </View>

                            <View style={styles.lpInputGroup}>
                                <Text style={styles.lpLabel}>Creator</Text>
                                <TextInput
                                    style={styles.lpInput}
                                    value={creatorLpPercentage}
                                    onChangeText={setCreatorLpPercentage}
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.lpPercent}>%</Text>
                            </View>

                            <View style={styles.lpInputGroup}>
                                <Text style={styles.lpLabel}>Partner Locked</Text>
                                <TextInput
                                    style={styles.lpInput}
                                    value={partnerLockedLpPercentage}
                                    onChangeText={setPartnerLockedLpPercentage}
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.lpPercent}>%</Text>
                            </View>

                            <View style={styles.lpInputGroup}>
                                <Text style={styles.lpLabel}>Creator Locked</Text>
                                <TextInput
                                    style={styles.lpInput}
                                    value={creatorLockedLpPercentage}
                                    onChangeText={setCreatorLockedLpPercentage}
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={styles.lpPercent}>%</Text>
                            </View>
                        </View>
                    </View>
                )}

                {isCreating && statusMessage ? (
                    <View style={styles.statusContainer}>
                        <Text style={styles.statusText}>{statusMessage}</Text>
                    </View>
                ) : null}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.createButton]}
                        onPress={handleCreateToken}
                        disabled={isCreating}
                    >
                        <LinearGradient
                            colors={['#32D4DE', '#B591FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.actionButtonGradient}
                        >
                            {isCreating ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.actionButtonText}>
                                    {buyOnCreate ? 'Create & Buy Tokens' : 'Create Token'}
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
                <Text style={styles.title}>Create Token with Bonding Curve</Text>

                <View style={styles.stepIndicator}>
                    <View style={[styles.step, step >= 1 && styles.stepActive]}>
                        <Text style={[styles.stepText, step >= 1 && styles.stepTextActive]}>1</Text>
                    </View>
                    <View style={styles.stepConnector} />
                    <View style={[styles.step, step >= 2 && styles.stepActive]}>
                        <Text style={[styles.stepText, step >= 2 && styles.stepTextActive]}>2</Text>
                    </View>
                </View>

                {step === 1 ? renderStep1() : renderStep2()}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    card: {
        backgroundColor: COLORS.lighterBackground,
        borderRadius: 16,
        padding: 20,
        margin: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weights.semiBold,
        color: COLORS.white,
        marginBottom: 24,
        textAlign: 'center',
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    step: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.darkerBackground,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
    },
    stepActive: {
        backgroundColor: COLORS.brandPrimary,
        borderColor: COLORS.brandPrimary,
    },
    stepConnector: {
        width: 30,
        height: 2,
        backgroundColor: COLORS.borderDarkColor,
        marginHorizontal: 8,
    },
    stepText: {
        color: COLORS.greyDark,
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: TYPOGRAPHY.weights.semiBold,
    },
    stepTextActive: {
        color: COLORS.white,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weights.semiBold,
        color: COLORS.white,
        marginBottom: 16,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.greyMid,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.darkerBackground,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.md,
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
    },
    helperText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.greyDark,
        marginTop: 4,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorText: {
        color: COLORS.errorRed,
        fontSize: TYPOGRAPHY.size.sm,
        marginVertical: 8,
    },
    statusContainer: {
        backgroundColor: COLORS.darkerBackground,
        padding: 12,
        borderRadius: 8,
        marginVertical: 12,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.brandPrimary,
    },
    statusText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.sm,
    },
    actionButton: {
        marginTop: 16,
        overflow: 'hidden',
        borderRadius: 12,
    },
    actionButtonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    actionButtonText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: TYPOGRAPHY.weights.semiBold,
    },
    advancedToggle: {
        alignItems: 'center',
        marginBottom: 16,
    },
    advancedToggleText: {
        color: COLORS.brandPrimary,
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weights.medium,
    },
    advancedContainer: {
        marginTop: 8,
    },
    feeTiersContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginVertical: 8,
    },
    feeTierButton: {
        backgroundColor: COLORS.darkerBackground,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
    },
    feeTierButtonSelected: {
        backgroundColor: COLORS.brandPrimary,
        borderColor: COLORS.brandPrimary,
    },
    feeTierText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.sm,
    },
    feeTierTextSelected: {
        fontWeight: TYPOGRAPHY.weights.semiBold,
    },
    lpDistributionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginVertical: 8,
    },
    lpInputGroup: {
        width: '50%',
        paddingRight: 8,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    lpLabel: {
        width: '40%',
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.greyMid,
    },
    lpInput: {
        flex: 1,
        backgroundColor: COLORS.darkerBackground,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.sm,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
    },
    lpPercent: {
        marginLeft: 4,
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.greyMid,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    backButton: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.borderDarkColor,
        width: '30%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: TYPOGRAPHY.weights.medium,
    },
    createButton: {
        width: '65%',
    },
}); 