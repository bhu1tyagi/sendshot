import { Connection, Commitment, PublicKey, ConnectionConfig } from '@solana/web3.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Meteora Dynamic Bonding Curve Program ID
export const METEORA_DBC_PROGRAM_ID = new PublicKey('dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN');

// Global connection instance
let globalConnection: Connection | null = null;

// Define RPC endpoints
const MAINNET_RPC = process.env.MAINNET_RPC || 'https://api.mainnet-beta.solana.com';
const DEVNET_RPC = process.env.DEVNET_RPC || 'https://api.devnet.solana.com';

/**
 * Gets a Solana connection using the RPC_URL from environment variables
 * Falls back to Solana devnet if RPC_URL is not defined
 * 
 * @param commitment Optional commitment level, defaults to 'confirmed'
 * @returns A Solana Connection
 */
export const getConnection = (commitment: Commitment = 'confirmed'): Connection => {
  // Use process.env.NETWORK or default to mainnet
  const network = process.env.NETWORK || 'mainnet';
  const rpcUrl = network === 'devnet' ? DEVNET_RPC : MAINNET_RPC;
  
  console.log(`Creating Solana connection to ${network} with commitment ${commitment}`);
  
  // Enhanced connection config with better timeout and retry settings
  const connectionConfig: ConnectionConfig = {
    commitment,
    confirmTransactionInitialTimeout: 120000, // 2 minutes
    disableRetryOnRateLimit: false,
    httpHeaders: {
      'Content-Type': 'application/json'
    }
  };
  
  return new Connection(rpcUrl, connectionConfig);
};

/**
 * Setup the connection when the server starts
 * This ensures we only have one connection instance throughout the app
 */
export function setupConnection(): void {
  if (!globalConnection) {
    console.log('Setting up Solana connection...');
    getConnection();
    console.log('Solana connection established');
  }
}

/**
 * Masks most of the RPC URL for logging purposes to avoid leaking sensitive information
 */
function maskRpcUrl(url: string): string {
  try {
    // For http(s)://xxx.xxx URLs, mask most of the URL but retain some identifying information
    if (url.includes('://')) {
      const parts = url.split('://');
      const protocol = parts[0];
      const domain = parts[1].split('/')[0];
      
      // If there's an API key in the URL, mask it
      if (url.includes('?') || url.includes('&')) {
        return `${protocol}://${maskDomain(domain)}/...`;
      }
      
      return `${protocol}://${maskDomain(domain)}`;
    }
    
    // For other formats, just show a placeholder
    return 'RPC URL is set (masked for security)';
  } catch (e) {
    return 'RPC URL is set';
  }
}

/**
 * Masks the middle of a domain while keeping the start and end visible
 */
function maskDomain(domain: string): string {
  if (domain.length <= 8) return domain;
  
  const start = domain.slice(0, 4);
  const end = domain.slice(-4);
  return `${start}...${end}`;
} 