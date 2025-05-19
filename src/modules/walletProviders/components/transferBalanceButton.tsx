import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { styles } from './transferBalanceButton.styles'
import { useAppSelector, useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { Cluster, Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  sendSOL,
  COMMISSION_PERCENTAGE,
} from '@/shared/services/transactions';
import { useWallet } from '@/modules/walletProviders/hooks/useWallet';
import {
  setSelectedFeeTier as setFeeTier,
  setTransactionMode as setMode
} from '@/shared/state/transaction/reducer';
import { CLUSTER, HELIUS_STAKED_URL } from '@env';
import { TransactionService } from '@/modules/walletProviders/services/transaction/transactionService';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import { ENDPOINTS } from '@/config/constants';

export interface TransferBalanceButtonProps {
  amIFollowing?: boolean;
  areTheyFollowingMe?: boolean;
  onPressFollow?: () => void;
  onPressUnfollow?: () => void;
  onSendToWallet?: () => void;
  recipientAddress?: string;
  showOnlyTransferButton?: boolean;
  showCustomWalletInput?: boolean;
  buttonLabel?: string;
  externalModalVisible?: boolean;
  externalSetModalVisible?: (visible: boolean) => void;
}

const TransferBalanceButton: React.FC<TransferBalanceButtonProps> = ({
  amIFollowing = false,
  areTheyFollowingMe = false,
  onPressFollow = () => {},
  onPressUnfollow = () => {},
  onSendToWallet,
  recipientAddress = '',
  showOnlyTransferButton = false,
  showCustomWalletInput = false,
  buttonLabel = 'Send to Wallet',
  externalModalVisible,
  externalSetModalVisible,
}) => {
  const dispatch = useAppDispatch();
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'jito' | 'priority' | null>(
    null,
  );
  const [selectedFeeTier, setSelectedFeeTier] = useState<
    'low' | 'medium' | 'high' | 'very-high'
  >('low');
  const [amountSol, setAmountSol] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null,
  );
  const [customWalletAddress, setCustomWalletAddress] = useState(recipientAddress);
  const [walletAddressError, setWalletAddressError] = useState('');
  const [fetchingBalance, setFetchingBalance] = useState(false);

  // Add a ref to modal components with initial null value
  const modalRef = useRef<View | null>(null);

  // Get the current auth state and transaction settings
  const currentProvider = useAppSelector(state => state.auth.provider);
  const transactionState = useAppSelector(state => state.transaction);

  // Use the wallet from useWallet - now it will work correctly with MWA
  const {wallet, address, isMWA} = useWallet();

  // Watch for external modal visibility changes
  useEffect(() => {
    if (externalModalVisible !== undefined && externalModalVisible !== sendModalVisible) {
      setSendModalVisible(externalModalVisible);
    }
  }, [externalModalVisible]);

  // Notify parent when internal modal state changes
  useEffect(() => {
    if (externalSetModalVisible) {
      externalSetModalVisible(sendModalVisible);
    }
  }, [sendModalVisible, externalSetModalVisible]);

  // Initialize modal state with Redux state when opened
  useEffect(() => {
    if (sendModalVisible) {
      setSelectedMode(transactionState.transactionMode);
      setSelectedFeeTier(transactionState.selectedFeeTier);
      setTransactionStatus(null);
      setWalletAddressError('');
      
      // Reset custom wallet address when modal opens if not showing custom input
      if (!showCustomWalletInput) {
        setCustomWalletAddress(recipientAddress);
      } else if (!customWalletAddress) {
        setCustomWalletAddress('');
      }
    }
  }, [sendModalVisible, transactionState, recipientAddress, showCustomWalletInput]);

  let followLabel = 'Follow';
  if (amIFollowing) {
    followLabel = 'Following';
  } else if (!amIFollowing && areTheyFollowingMe) {
    followLabel = 'Follow Back';
  }

  const handlePressFollowButton = () => {
    if (amIFollowing) {
      onPressUnfollow();
    } else {
      onPressFollow();
    }
  };

  const validateSolanaAddress = (address: string): boolean => {
    try {
      if (!address || address.trim() === '') return false;
      
      // Check if it's a valid Solana address
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handlePressSendToWallet = () => {
    // Only validate the recipient address if we're not showing the custom input
    if (!showCustomWalletInput && !recipientAddress) {
      Alert.alert('Error', 'No recipient address available');
      return;
    }

    if (onSendToWallet) {
      onSendToWallet();
    }

    setSendModalVisible(true);
  };

  const handleWalletAddressChange = (text: string) => {
    setCustomWalletAddress(text);
    setWalletAddressError('');
  };

  const handleSendTransaction = async () => {
    // Use a single try/catch for the whole operation
    try {
      if (!selectedMode) {
        Alert.alert('Error', "Please select 'Priority' or 'Jito' first.");
        return;
      }

      // Get the correct recipient address based on whether we're using custom input
      const finalRecipientAddress = showCustomWalletInput ? customWalletAddress : recipientAddress;
      
      // Validate wallet address
      if (!validateSolanaAddress(finalRecipientAddress)) {
        setWalletAddressError('Please enter a valid Solana wallet address');
        return;
      }

      if (!finalRecipientAddress || !amountSol) {
        Alert.alert('Error', 'Please provide recipient address and amount.');
        return;
      }
      
      const parsedAmount = parseFloat(amountSol);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        Alert.alert('Error', 'Invalid SOL amount.');
        return;
      }

      if (!wallet) {
        Alert.alert('Error', 'Wallet not connected');
        return;
      }

      // Update the Redux state with the selections from the modal
      if (selectedMode) {
        dispatch(setMode(selectedMode));

        if (selectedMode === 'priority' && selectedFeeTier) {
          dispatch(setFeeTier(selectedFeeTier));
        }
      }
      const rpcUrl =
        HELIUS_STAKED_URL ||
        ENDPOINTS.helius ||
        clusterApiUrl(CLUSTER as Cluster);
      // Create connection using the helper function
      const connection = new Connection(rpcUrl, 'confirmed');

      // Set initial status
      setTransactionStatus('Preparing transaction...');

      // Use our centralized sendSOL function for both MWA and non-MWA wallets
      // It handles its own confirmation logic and success/failure reporting
      const signature = await sendSOL({
        wallet,
        recipientAddress: finalRecipientAddress,
        amountSol: parsedAmount,
        connection, // Pass the created connection
        onStatusUpdate: status => {
          // Only update status if it's not an error message
          if (!status.startsWith('Error:')) {
            console.log(`[AddButton] ${status}`);
            setTransactionStatus(status);
          } else {
            // For errors, use a generic message (sendSOL handles detailed error reporting)
            setTransactionStatus('Processing transaction...');
          }
        },
      });

      // If sendSOL completes without throwing, the signature was obtained.
      // The background confirmation will handle the final success/failure toast.
      console.log(`[AddButton] sendSOL returned signature: ${signature}`);

      // We already show "Transaction sent..." or similar in onStatusUpdate
      // Keep the modal open briefly to show the final status update from confirmation
      setTimeout(() => {
        setSendModalVisible(false);
        setSelectedMode(null);
        setAmountSol('');
        setTransactionStatus(null);
        if (showCustomWalletInput) {
          setCustomWalletAddress('');
        }
      }, 3000); // Increased delay slightly
    } catch (err: any) {
      // This catch block now only handles errors thrown *before* or *during* the initial
      // call to sendSOL (e.g., input validation, wallet connection issues, immediate send failure).
      // Confirmation errors are handled internally by sendSOL and shouldn't reach here.
      console.error('Error during transaction initiation:', err);

      setTransactionStatus('Transaction failed');

      // Show error using TransactionService
      TransactionService.showError(err);

      // Close modal after showing the error
      setTimeout(() => {
        setSendModalVisible(false);
        setSelectedMode(null);
        setAmountSol('');
        setTransactionStatus(null);
      }, 2000);
    }
  };

  // Fetch user's SOL balance
  const fetchSolBalance = useCallback(async () => {
    if (!wallet || !('publicKey' in wallet) || !wallet.publicKey) {
      Alert.alert('Error', 'Wallet not connected');
      return;
    }

    try {
      setFetchingBalance(true);
      
      const rpcUrl =
        HELIUS_STAKED_URL ||
        ENDPOINTS.helius ||
        clusterApiUrl(CLUSTER as Cluster);
      
      const connection = new Connection(rpcUrl, 'confirmed');
      
      // Convert string publicKey to PublicKey object if needed
      const publicKey = typeof wallet.publicKey === 'string' 
        ? new PublicKey(wallet.publicKey)
        : wallet.publicKey;
        
      const balance = await connection.getBalance(publicKey);
      
      // Convert lamports to SOL and format - leave a small amount for transaction fee
      const solBalance = (balance / LAMPORTS_PER_SOL) - 0.001;
      
      // Handle edge cases
      if (solBalance <= 0) {
        Alert.alert('Insufficient Balance', 'Your wallet does not have enough SOL to transfer.');
        setFetchingBalance(false);
        return;
      }
      
      // Set the input amount to the max balance (with 9 decimal places max)
      setAmountSol(solBalance.toFixed(Math.min(9, solBalance.toString().split('.')[1]?.length || 9)));
      
      setFetchingBalance(false);
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      Alert.alert('Error', 'Failed to fetch your balance. Please try again.');
      setFetchingBalance(false);
    }
  }, [wallet]);

  // Only render the send to wallet button if provider supports it
  const showSendToWalletButton =
    (currentProvider === 'privy' ||
    currentProvider === 'dynamic' ||
    currentProvider === 'mwa') && !showOnlyTransferButton;

  return (
    <View style={styles.container}>
      {!showOnlyTransferButton && (
        <TouchableOpacity style={styles.btn} onPress={handlePressFollowButton}>
          <Text style={styles.text}>{followLabel}</Text>
        </TouchableOpacity>
      )}

      {(showSendToWalletButton || showOnlyTransferButton) && (
        <TouchableOpacity 
          style={[styles.btn, showOnlyTransferButton && styles.fullWidthBtn]} 
          onPress={handlePressSendToWallet}
        >
          <Text style={styles.text}>{buttonLabel}</Text>
        </TouchableOpacity>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={sendModalVisible}
        onRequestClose={() => setSendModalVisible(false)}>
        <View style={modalOverlayStyles.overlay} ref={modalRef}>
          <View style={modalOverlayStyles.drawerContainer}>
            {/* Drag handle for bottom drawer */}
            <View style={modalOverlayStyles.dragHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={modalOverlayStyles.scrollContent}>
              <Text style={modalOverlayStyles.title}>Send SOL</Text>

              {showCustomWalletInput && (
                <View style={modalOverlayStyles.inputContainer}>
                  <Text style={modalOverlayStyles.label}>Recipient Wallet Address</Text>
                  <TextInput
                    style={[modalOverlayStyles.input, walletAddressError ? modalOverlayStyles.inputError : null]}
                    value={customWalletAddress}
                    onChangeText={handleWalletAddressChange}
                    placeholder="Enter Solana wallet address"
                    placeholderTextColor={COLORS.textHint}
                  />
                  {walletAddressError ? (
                    <Text style={modalOverlayStyles.errorText}>{walletAddressError}</Text>
                  ) : null}
                </View>
              )}

              <View style={modalOverlayStyles.modeContainer}>
                <View style={modalOverlayStyles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      modalOverlayStyles.modeButton,
                      selectedMode === 'priority' &&
                        modalOverlayStyles.selectedBtn,
                    ]}
                    onPress={() => setSelectedMode('priority')}>
                    <Text
                      style={[
                        modalOverlayStyles.modeButtonText,
                        selectedMode === 'priority' &&
                          modalOverlayStyles.selectedBtnText,
                      ]}>
                      Priority
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      modalOverlayStyles.modeButton,
                      selectedMode === 'jito' && modalOverlayStyles.selectedBtn,
                    ]}
                    onPress={() => setSelectedMode('jito')}>
                    <Text
                      style={[
                        modalOverlayStyles.modeButtonText,
                        selectedMode === 'jito' &&
                          modalOverlayStyles.selectedBtnText,
                      ]}>
                      Jito
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {selectedMode === 'priority' && (
                <View style={modalOverlayStyles.tierContainer}>
                  <Text style={modalOverlayStyles.sectionTitle}>
                    Priority Fee Tier:
                  </Text>
                  <View style={modalOverlayStyles.tierButtonRow}>
                    {(['low', 'medium', 'high', 'very-high'] as const).map(
                      tier => (
                        <TouchableOpacity
                          key={tier}
                          style={[
                            modalOverlayStyles.tierButton,
                            selectedFeeTier === tier &&
                              modalOverlayStyles.selectedBtn,
                          ]}
                          onPress={() => setSelectedFeeTier(tier)}>
                          <Text
                            style={[
                              modalOverlayStyles.tierButtonText,
                              selectedFeeTier === tier &&
                                modalOverlayStyles.selectedBtnText,
                            ]}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </View>
              )}

              <View style={modalOverlayStyles.inputContainer}>
                <View style={modalOverlayStyles.amountLabelRow}>
                  <Text style={modalOverlayStyles.label}>Amount (SOL)</Text>
                  <TouchableOpacity 
                    style={modalOverlayStyles.maxButton}
                    onPress={fetchSolBalance}
                    disabled={fetchingBalance}
                  >
                    {fetchingBalance ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={modalOverlayStyles.maxButtonText}>MAX</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Preset amount buttons */}
                <View style={modalOverlayStyles.presetButtonsRow}>
                  <TouchableOpacity
                    style={modalOverlayStyles.presetButton}
                    onPress={() => setAmountSol('1')}>
                    <Text style={modalOverlayStyles.presetButtonText}>
                      1 SOL
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={modalOverlayStyles.presetButton}
                    onPress={() => setAmountSol('5')}>
                    <Text style={modalOverlayStyles.presetButtonText}>
                      5 SOL
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={modalOverlayStyles.presetButton}
                    onPress={() => setAmountSol('10')}>
                    <Text style={modalOverlayStyles.presetButtonText}>
                      10 SOL
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Input with plus/minus controls */}
                <View style={modalOverlayStyles.amountControlContainer}>
                  <TouchableOpacity
                    style={modalOverlayStyles.controlButton}
                    onPress={() => {
                      const currentVal = parseFloat(amountSol) || 0;
                      if (currentVal > 0) {
                        setAmountSol((currentVal - 1).toString());
                      }
                    }}>
                    <Text style={modalOverlayStyles.controlButtonText}>−</Text>
                  </TouchableOpacity>

                  <TextInput
                    style={modalOverlayStyles.amountInput}
                    value={amountSol}
                    onChangeText={setAmountSol}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.textHint}
                    textAlign="center"
                  />

                  <TouchableOpacity
                    style={modalOverlayStyles.controlButton}
                    onPress={() => {
                      const currentVal = parseFloat(amountSol) || 0;
                      setAmountSol((currentVal + 1).toString());
                    }}>
                    <Text style={modalOverlayStyles.controlButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {transactionStatus && (
                <View style={modalOverlayStyles.statusContainer}>
                  <Text style={modalOverlayStyles.statusText}>
                    {transactionStatus}
                  </Text>
                </View>
              )}

              <View style={modalOverlayStyles.buttonRow}>
                <TouchableOpacity
                  style={[
                    modalOverlayStyles.modalButton,
                    {backgroundColor: COLORS.lightBackground},
                  ]}
                  onPress={() => setSendModalVisible(false)}
                  disabled={
                    !!transactionStatus && !transactionStatus.includes('Error')
                  }>
                  <Text style={modalOverlayStyles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    modalOverlayStyles.modalButton,
                    {backgroundColor: COLORS.brandBlue},
                    !!transactionStatus && {opacity: 0.5},
                  ]}
                  onPress={handleSendTransaction}
                  disabled={!!transactionStatus}>
                  <Text style={modalOverlayStyles.modalButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TransferBalanceButton;

const modalOverlayStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    padding: 0,
  },
  drawerContainer: {
    backgroundColor: COLORS.lighterBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.borderDarkColor,
    maxHeight: '85%',
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: 600,
    marginBottom: 16,
    textAlign: 'center',
    color: COLORS.white,
  },
  modeContainer: {
    marginBottom: 24,
    width: '100%',
  },
  sectionTitle: {
    fontWeight: 500,
    fontSize: TYPOGRAPHY.size.sm,
    marginBottom: 8,
    color: COLORS.white,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    columnGap: 6,
    rowGap: 8,
    marginTop: 16,
    flexWrap: 'nowrap',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.lightBackground,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modeButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.medium),
  },
  selectedBtn: {
    backgroundColor: COLORS.lightGrey,
  },
  selectedBtnText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.bold),
  },
  tierContainer: {
    marginBottom: 16,
  },
  tierButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.lighterBackground,
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
  },
  tierButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.medium),
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  statusContainer: {
    backgroundColor: COLORS.darkerBackground,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
  },
  statusText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.size.sm,
    textAlign: 'center',
  },
  label: {
    fontWeight: 500,
    marginTop: 8,
    marginBottom: 8,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.white,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: TYPOGRAPHY.size.sm,
    backgroundColor: COLORS.lighterBackground,
    color: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.errorRed,
  },
  errorText: {
    color: COLORS.errorRed,
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    minHeight: 48,
    backgroundColor: COLORS.brandBlue,
  },
  modalButtonText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.semiBold),
    fontSize: TYPOGRAPHY.size.md,
  },
  tierButtonRow: {
    flexDirection: 'row',
    width: '100%',
    columnGap: 8,
    rowGap: 10,
    flexWrap: 'nowrap',
  },
  presetButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  presetButton: {
    flex: 1,
    backgroundColor: COLORS.lightGrey,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  presetButtonText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.semiBold),
    fontSize: TYPOGRAPHY.size.md,
  },
  amountControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.lightGrey,
    overflow: 'hidden',
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.bold),
  },
  amountInput: {
    flex: 1,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.bold),
    fontSize: 20,
    textAlign: 'center',
    height: '100%',
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: COLORS.borderDarkColor,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  commissionContainer: {
    backgroundColor: COLORS.darkerBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
  },
  commissionText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.size.xs,
    textAlign: 'center',
  },
  amountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  maxButton: {
    backgroundColor: COLORS.lightGrey,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
  },
  maxButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.semiBold),
  },
});
