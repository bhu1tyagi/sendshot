import { Connection, Transaction, VersionedTransaction, PublicKey, SystemProgram } from '@solana/web3.js';
import { TokenInfo } from '../types/tokenTypes';
import { JupiterService, JupiterSwapResponse } from './jupiterService';
import { RaydiumService } from '../../raydium/services/raydiumService';
import { Direction } from '../../pumpFun/services/pumpSwapService';
import { TransactionService } from '../../walletProviders/services/transaction/transactionService';
import { COMMISSION_WALLET, HELIUS_STAKED_URL, SERVER_URL } from '@env';
import { Alert } from 'react-native';

const API_BASE_URL = SERVER_URL || 'http://localhost:8080';

export type SwapProvider = 'Jupiter' | 'Raydium' | 'PumpSwap';

export interface TradeResponse {
  success: boolean;
  signature?: string;
  error?: Error | string;
  inputAmount: number;
  outputAmount: number;
}

export interface SwapCallback {
  statusCallback: (status: string) => void;
  isComponentMounted?: () => boolean;
}

// Fee configuration
const FEE_PERCENTAGE = 0.05; // 0.05% default fee
const RAYDIUM_FEE_PERCENTAGE = 0.05; // 0.05% fee for Raydium
const FEE_RECIPIENT = COMMISSION_WALLET;

/**
 * TradeService - Provider-agnostic service for executing token swaps
 * 
 * This service delegates to provider-specific services based on the requested provider:
 * - Jupiter: JupiterService in dataModule
 * - Raydium: RaydiumService in raydium module
 * - PumpSwap: PumpSwapService in pumpFun module
 */
export class TradeService {
  /**
   * Calculate fee amount from an input amount in SOL
   */
  static calculateFeeAmount(inputAmount: number, provider: SwapProvider = 'Jupiter'): number {
    // Different fee percentage based on provider
    const feePercentage = provider === 'Raydium' ? RAYDIUM_FEE_PERCENTAGE : FEE_PERCENTAGE;
    
    const feeAmount = Math.floor(inputAmount * (feePercentage / 100));
    console.log(`[TradeService] 🧮 Calculated ${provider} fee: ${feeAmount} lamports (${feePercentage}% of ${inputAmount} SOL lamports)`);
    return feeAmount;
  }

  /**
   * Creates a fee transaction to collect fees on behalf of the project
   * @param inputAmountLamports The input amount in SOL lamports
   */
  static async collectFee(
    inputAmountLamports: number,
    walletPublicKey: PublicKey,
    sendTransaction: (
      transaction: Transaction | VersionedTransaction,
      connection: Connection, 
      options?: { statusCallback?: (status: string) => void, confirmTransaction?: boolean }
    ) => Promise<string>,
    statusCallback?: (status: string) => void,
    provider: SwapProvider = 'Jupiter'
  ): Promise<string | null> {
    console.log(`[TradeService] 🔍 STARTING FEE COLLECTION FOR ${provider}`);
    console.log(`[TradeService] 🔍 Input amount (SOL lamports): ${inputAmountLamports}`);
    console.log(`[TradeService] 🔍 Wallet: ${walletPublicKey.toString()}`);
    
    try {
      // Calculate fee amount based on provider
      const feeAmount = this.calculateFeeAmount(inputAmountLamports, provider);
      const feePercentage = provider === 'Raydium' ? RAYDIUM_FEE_PERCENTAGE : FEE_PERCENTAGE;
      console.log(`[TradeService] 🔍 Fee amount: ${feeAmount} SOL lamports (${feePercentage}% of ${inputAmountLamports} SOL lamports)`);
      if (feeAmount <= 0) {
        console.log('[TradeService] ⚠️ Fee amount too small, skipping fee collection');
        return null;
      }
      
      // Create direct RPC connection
      const connection = new Connection(HELIUS_STAKED_URL, 'confirmed');
      
      // Get a fresh blockhash
      console.log('[TradeService] 🔗 Getting latest blockhash');
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      console.log(`[TradeService] 🔗 Blockhash received: ${blockhash}`);
      
      // Create fee transfer instruction
      const feeRecipientPubkey = new PublicKey(FEE_RECIPIENT);
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: feeRecipientPubkey,
        lamports: feeAmount
      });
      
      // Create a new transaction for the fee
      const feeTx = new Transaction();
      feeTx.add(transferInstruction);
      feeTx.recentBlockhash = blockhash;
      feeTx.feePayer = walletPublicKey;
      
      // Automatically send the fee transaction without user confirmation
      console.log(`[TradeService] 💰 Automatically collecting ${feePercentage}% fee (${feeAmount} SOL lamports)`);
      
      if (statusCallback) {
        console.log('[TradeService] 📱 Calling status callback for fee transaction');
        statusCallback(`Collecting ${feePercentage}% fee...`);
      }
      
      console.log('[TradeService] 📤 Sending fee transaction...');
      
      try {
        const signature = await sendTransaction(
          feeTx,
          connection,
          {
            statusCallback: (status) => {
              console.log(`[TradeService Fee] 📡 Status: ${status}`);
              if (statusCallback) {
                statusCallback(`Fee: ${status}`);
              }
            },
            confirmTransaction: true
          }
        );
        
        console.log('[TradeService] ✅ Fee transaction successfully sent with signature:', signature);
        
        // Show notification for the fee transaction
        console.log('[TradeService] 🔔 Showing success notification');
        TransactionService.showSuccess(signature, 'transfer');
        
        return signature;

      } catch (sendError) {
        console.error('[TradeService] ❌ Error sending fee:', sendError);
        if (sendError instanceof Error) {
          console.error('[TradeService] ❌ Error message:', sendError.message);
        }
        // Log the error but don't show alert to user
        console.log('[TradeService] Fee transaction failed but swap was successful');
        return null;
      }
    } catch (error) {
      console.error('[TradeService] ❌ Error collecting fee:', error);
      if (error instanceof Error) {
        console.error('[TradeService] ❌ Error message:', error.message);
        console.error('[TradeService] ❌ Error stack:', error.stack);
      }
      return null;
    }
  }

  /**
   * Executes a token swap using the specified provider
   */
  static async executeSwap(
    inputToken: TokenInfo,
    outputToken: TokenInfo,
    inputAmount: string,
    walletPublicKey: PublicKey,
    sendTransaction: (
      transaction: Transaction | VersionedTransaction,
      connection: Connection, 
      options?: { statusCallback?: (status: string) => void, confirmTransaction?: boolean }
    ) => Promise<string>,
    callbacks?: SwapCallback,
    provider: SwapProvider = 'Jupiter',
    options?: {
      poolAddress?: string;
      slippage?: number;
    }
  ): Promise<TradeResponse> {
    console.log(`[TradeService] 🚀 executeSwap called with provider: ${provider}`);
    try {
      // Create a connection object that might be reused for fee collection
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      let swapResponse: TradeResponse;

      // Select provider implementation
      switch (provider) {
        case 'Jupiter':
          console.log('[TradeService] 🪐 Using JupiterService for swap');
          // Use JupiterService for Jupiter swaps
          swapResponse = await JupiterService.executeSwap(
            inputToken,
            outputToken,
            inputAmount,
            walletPublicKey,
            sendTransaction,
            callbacks
          );
          console.log('[TradeService] 🪐 Jupiter swap response:', JSON.stringify(swapResponse));
          break;
          
        case 'Raydium':
          console.log('[TradeService] 🌊 Using RaydiumService for swap');
          // Use RaydiumService for Raydium swaps
          swapResponse = await RaydiumService.executeSwap(
            inputToken,
            outputToken,
            inputAmount,
            walletPublicKey,
            sendTransaction,
            callbacks
          );
          console.log('[TradeService] 🌊 Raydium swap response:', JSON.stringify(swapResponse));
          break;
          
        case 'PumpSwap':
          console.log('[TradeService] 🔄 PumpSwap path selected');
          if (!options?.poolAddress) {
            throw new Error('Pool address is required for PumpSwap');
          }
          
          const numericAmount = parseFloat(inputAmount);
          if (isNaN(numericAmount) || numericAmount <= 0) {
            throw new Error('Invalid amount specified');
          }
          
          try {
            // Status update helper
            const updateStatus = (status: string) => {
              console.log('[TradeService] Status:', status);
              callbacks?.statusCallback?.(status);
            };
            updateStatus('Preparing swap transaction...');
            
            // Get server URL
            const baseUrl = SERVER_URL || 'http://localhost:8080';
            console.log('[TradeService] Server URL:', baseUrl);
            
            // Use slippage from options or default to 10%
            const slippageValue = options.slippage || 10.0;
            console.log('[TradeService] Using slippage:', slippageValue);
            
            // Make API request
            console.log('[TradeService] Requesting transaction from server');
            const response = await fetch(`${baseUrl}/api/pump-swap/build-swap`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pool: options.poolAddress,
                inputAmount: numericAmount,
                direction: inputToken.symbol === "SOL" ? Direction.BaseToQuote : Direction.QuoteToBase,
                slippage: slippageValue,
                userPublicKey: walletPublicKey.toString()
              })
            });
            
            // Check response status
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Server error: ${response.status} ${errorText}`);
            }
            
            // Parse response JSON
            const data = await response.json();
            console.log('[TradeService] Response:', JSON.stringify(data, null, 2));
            
            if (!data.success) {
              throw new Error(data.error || 'Server returned error');
            }
            
            if (!data.data?.transaction) {
              throw new Error('No transaction in response');
            }
            
            // Log the transaction
            console.log('[TradeService] Got transaction base64 string, length:', data.data.transaction.length);
            
            // Status update
            updateStatus('Transaction received, sending to wallet...');
            
            // Create a Transaction object
            const txBuffer = Buffer.from(data.data.transaction, 'base64');
            const txData = new Uint8Array(txBuffer);
            
            console.log('[TradeService] Transaction buffer length:', txData.length);
            
            // Try as versioned transaction first
            let tx;
            try {
              tx = VersionedTransaction.deserialize(txData);
              console.log('[TradeService] Successfully parsed as VersionedTransaction');
            } catch (e) {
              console.log('[TradeService] Not a VersionedTransaction, trying legacy format');
              tx = Transaction.from(txBuffer);
              tx.feePayer = walletPublicKey;
              console.log('[TradeService] Successfully parsed as Transaction');
            }
            
            // Log transaction details
            if (tx instanceof VersionedTransaction) {
              console.log('[TradeService] tx is VersionedTransaction with', 
                tx.message.compiledInstructions.length, 'instructions');
            } else {
              console.log('[TradeService] tx is Transaction with', 
                tx.instructions.length, 'instructions');
            }
            
            // Send the transaction 
            console.log('[TradeService] Sending transaction to wallet');
            let signature: string;
            try {
              signature = await sendTransaction(tx, connection, {
                statusCallback: updateStatus,
                confirmTransaction: true
              });
              
              console.log('[TradeService] Transaction sent with signature:', signature);
              updateStatus('Swap completed successfully!');
              
              // Estimate the output amount for PumpSwap based on input amount
              // Since we don't have the exact output amount from PumpSwap, estimate it
              // This is used for fee calculation - using 98% of input value (assuming 2% slippage)
              const estimatedOutputAmount = numericAmount * 0.98;
              console.log('[TradeService] PumpSwap - Estimated output amount for fee:', estimatedOutputAmount);
              
              swapResponse = {
                success: true,
                signature,
                inputAmount: numericAmount,
                outputAmount: estimatedOutputAmount // Use estimated value for fee calculation
              };
            } catch (txError: any) {
              // Check if error is due to confirmation timeout but transaction might have succeeded
              if (txError.message && txError.message.includes('confirmation failed after maximum retries')) {
                console.log('[TradeService] Transaction may have succeeded but confirmation timed out');
                console.log('[TradeService] Transaction signature:', txError.signature || 'Unknown');
                
                // If we have a signature, we can use it to verify the transaction
                if (txError.signature) {
                  updateStatus('Transaction may have succeeded. Verifying on chain...');
                  
                  try {
                    // Give the transaction a moment to finalize
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Try to get the transaction status
                    const status = await connection.getSignatureStatus(txError.signature);
                    console.log('[TradeService] Transaction status:', JSON.stringify(status, null, 2));
                    
                    if (status.value && !status.value.err) {
                      // Transaction is confirmed or likely to be confirmed
                      updateStatus('Transaction verified successful!');
                      
                      // Use SOL input amount if input token is SOL, otherwise use minimum
                      const solAmount = inputToken.symbol === 'SOL' 
                        ? numericAmount * 1e9 // Convert SOL to lamports
                        : 0.005 * 1e9; // Use 0.005 SOL as minimum fee base
                        
                      return {
                        success: true,
                        signature: txError.signature,
                        inputAmount: numericAmount,
                        outputAmount: numericAmount * 0.98 // Estimated output amount
                      };
                    }
                  } catch (verifyError) {
                    console.error('[TradeService] Error verifying transaction:', verifyError);
                  }
                }
                
                // Return a more helpful error message
                updateStatus('Transaction sent but confirmation timed out. Check your wallet or blockchain explorer.');
                throw new Error(`Transaction may have succeeded but confirmation timed out. Signature: ${txError.signature || 'Unknown'}`);
              }
              
              // Re-throw the original error
              throw txError;
            }
          } catch (error: any) {
            console.error('[TradeService] Error:', error);
            return {
              success: false,
              error,
              inputAmount: 0,
              outputAmount: 0
            };
          }
          break;
          
        default:
          console.error('[TradeService] Unsupported swap provider:', provider);
          throw new Error(`Unsupported swap provider: ${provider}`);
      }

      // If the swap was successful, collect the fee
      if (swapResponse.success) {
        console.log('[TradeService] 🎉 Swap successful, preparing to collect fee');
        
        try {
          // For fee calculation, we need to ensure we're using SOL amount
          let solInputAmount: number;
          
          // If input token is SOL, use the inputAmount directly
          if (inputToken.symbol === 'SOL') {
            // Convert to lamports if needed
            solInputAmount = this.toBaseUnits(inputAmount, 9); // SOL has 9 decimals
            console.log(`[TradeService] 💸 Using SOL input amount for fee: ${solInputAmount} lamports`);
          } else {
            // If input token is not SOL, use a fixed minimum fee in lamports
            // This is a simplified approach - in a production system, you might want to 
            // convert the input token value to SOL using an oracle or price feed
            solInputAmount = this.toBaseUnits("0.005", 9); // Use 0.005 SOL as a minimum fee base
            console.log(`[TradeService] 💸 Non-SOL input token, using minimum fee base: ${solInputAmount} lamports`);
          }
          
          // Get status update function
          const statusCallback = callbacks?.statusCallback || (() => {});
          
          // Collect fee - will create and send a separate transaction
          // This doesn't affect the success of the main swap
          const feeSignature = await this.collectFee(
            solInputAmount,
            walletPublicKey,
            sendTransaction,
            statusCallback,
            provider
          );
          
          // if (feeSignature) {
          //   console.log('[TradeService] ✅ Fee collection successful with signature:', feeSignature);
          // } else {
          //   console.log('[TradeService] ℹ️ Fee collection completed without signature');
          // }
          
          // // Send a final status update to signal the entire process is complete
          // if (statusCallback) {
          //   statusCallback('Transaction complete! ✓');
          // }
        } catch (feeError) {
          console.error('[TradeService] ❌ Error collecting fee, but swap was successful:', feeError);
          if (feeError instanceof Error) {
            console.error('[TradeService] ❌ Fee error message:', feeError.message);
            console.error('[TradeService] ❌ Fee error stack:', feeError.stack);
          }
          
          // Even if fee collection failed, the swap was successful, so mark as complete
          if (callbacks?.statusCallback) {
            callbacks.statusCallback('Swap completed successfully!');
          }
        }
      } else {
        console.log('[TradeService] ❌ Swap was not successful, skipping fee collection');
        console.log('[TradeService] ℹ️ Swap error:', swapResponse.error);
      }
      
      return swapResponse;
    } catch (err: any) {
      console.error(`[TradeService] ❌ Trade error with provider ${provider}:`, err);
      
      // Special handling for PumpSwap-specific errors
      if (provider === 'PumpSwap' && err.message) {
        console.log('[TradeService] PumpSwap error details:', err.message);
        
        // Enhance the error object with swap details for more helpful UI feedback
        err.swapDetails = {
          provider: 'PumpSwap',
          inputToken: inputToken.symbol,
          outputToken: outputToken.symbol,
          amount: inputAmount,
          poolAddress: options?.poolAddress
        };
        
        // If the error is specifically about slippage or price impact
        if (err.message.includes('ExceededSlippage') || err.message.includes('0x1774')) {
          err.message = 'Transaction failed due to extreme price impact in this pool. Please try a smaller amount or contact the pool creator.';
        }
      }
      
      // Special handling for Raydium-specific errors
      if (provider === 'Raydium' && err.message) {
        console.log('[TradeService] Raydium error details:', err.message);
        
        // Enhance the error object with swap details
        err.swapDetails = {
          provider: 'Raydium',
          inputToken: inputToken.symbol,
          outputToken: outputToken.symbol,
          amount: inputAmount
        };
        
        // Handle specific Raydium error codes
        if (err.message.includes('custom program error: 0x26') || 
            err.message.includes('exceeds desired slippage limit')) {
          err.message = 'Swap failed due to price movement. Try increasing the slippage tolerance or using a smaller amount.';
        }
      }
      
      return {
        success: false,
        error: err,
        inputAmount: 0,
        outputAmount: 0
      };
    }
  }
  
  /**
   * Converts a decimal amount to base units (e.g., SOL -> lamports)
   */
  static toBaseUnits(amount: string, decimals: number): number {
    const val = parseFloat(amount);
    if (isNaN(val)) return 0;
    return val * Math.pow(10, decimals);
  }
} 