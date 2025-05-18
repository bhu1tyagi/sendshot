import supabase from '../supabase';
import { v4 as uuidv4 } from 'uuid';

export interface Token {
  id: string;
  address: string;
  name: string;
  symbol: string;
  metadata_uri?: string;
  creator_id: string;
  created_at: string;
  initial_price: number;
  current_price?: number;
  price_change_24h?: number;
  total_supply: string;
  holders?: number;
  protocol_type: 'pumpfun' | 'raydium' | 'tokenmill' | 'meteora';
}

export interface TokenResponse {
  id: string;
  address: string;
  name: string;
  symbol: string;
  metadataURI?: string;
  creatorId: string;
  createdAt: string;
  initialPrice: number;
  currentPrice?: number;
  priceChange24h?: number;
  totalSupply: string;
  holders?: number;
  protocolType: 'pumpfun' | 'raydium' | 'tokenmill' | 'meteora';
}

// Convert from database snake_case to camelCase for frontend
export function convertDbTokenToResponse(token: Token): TokenResponse | null {
  if (!token) {
    console.error('Cannot convert null or undefined token');
    return null;
  }
  
  // Add validation to ensure critical fields exist
  if (!token.id || !token.creator_id) {
    console.error('Token is missing critical fields:', {
      hasId: !!token.id,
      hasCreatorId: !!token.creator_id,
      token
    });
  }
  
  return {
    id: token.id,
    address: token.address,
    name: token.name,
    symbol: token.symbol,
    metadataURI: token.metadata_uri,
    creatorId: token.creator_id,
    createdAt: token.created_at,
    initialPrice: token.initial_price,
    currentPrice: token.current_price,
    priceChange24h: token.price_change_24h,
    totalSupply: token.total_supply,
    holders: token.holders,
    protocolType: token.protocol_type,
  };
}

// Convert from frontend camelCase to database snake_case
export function convertRequestToDbToken(tokenRequest: any): Omit<Token, 'id' | 'created_at'> {
  return {
    address: tokenRequest.address,
    name: tokenRequest.name,
    symbol: tokenRequest.symbol,
    metadata_uri: tokenRequest.metadataURI,
    creator_id: tokenRequest.creatorId,
    initial_price: tokenRequest.initialPrice,
    current_price: tokenRequest.currentPrice,
    price_change_24h: tokenRequest.priceChange24h,
    total_supply: tokenRequest.totalSupply,
    holders: tokenRequest.holders,
    protocol_type: tokenRequest.protocolType,
  };
}

export async function createToken(tokenData: Omit<Token, 'id' | 'created_at'>): Promise<TokenResponse | null> {
  const { data, error } = await supabase
    .from('tokens')
    .insert([
      {
        id: uuidv4(),
        ...tokenData,
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating token:', error);
    return null;
  }

  return convertDbTokenToResponse(data);
}

export async function getAllTokens(): Promise<TokenResponse[]> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all tokens:', error);
    return [];
  }

  // Convert and filter out any null results
  return data
    .map(convertDbTokenToResponse)
    .filter(token => token !== null);
}

export async function getUserTokens(userId: string): Promise<TokenResponse[]> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching tokens for user ${userId}:`, error);
    return [];
  }

  // Convert and filter out any null results
  return data
    .map(convertDbTokenToResponse)
    .filter(token => token !== null);
}

export async function getTokenById(tokenId: string): Promise<TokenResponse | null> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('id', tokenId)
    .single();

  if (error) {
    console.error(`Error fetching token with ID ${tokenId}:`, error);
    return null;
  }

  return convertDbTokenToResponse(data);
}

export async function updateToken(tokenId: string, updates: Partial<Omit<Token, 'id' | 'created_at'>>): Promise<TokenResponse | null> {
  const { data, error } = await supabase
    .from('tokens')
    .update(updates)
    .eq('id', tokenId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating token with ID ${tokenId}:`, error);
    return null;
  }

  return convertDbTokenToResponse(data);
}

export async function deleteToken(tokenId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tokens')
    .delete()
    .eq('id', tokenId);

  if (error) {
    console.error(`Error deleting token with ID ${tokenId}:`, error);
    return false;
  }

  return true;
} 