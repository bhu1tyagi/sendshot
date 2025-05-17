import { Router } from 'express';
import { meteoraDBCService } from '../service/MeteoraDBC';
// Import the type for reference but don't use it directly in assignment
import { CreatePoolParam } from '../service/MeteoraDBC/types';

const router = Router();

/**
 * Build curve by market cap and create config
 */
router.post('/build-curve-by-market-cap', async (req, res) => {
  const result = await meteoraDBCService.buildCurveAndCreateConfigByMarketCap(req.body);
  res.json(result);
});

/**
 * Create pool
 */
router.post('/pool', async (req, res) => {
  try {
    // Use a type assertion instead of direct assignment to CreatePoolParam
    // This way we can omit the baseMint property which gets generated inside createPool
    const params = {
      payer: req.body.payer,
      poolCreator: req.body.poolCreator,
      quoteMint: req.body.quoteMint,
      config: req.body.config,
      baseTokenType: req.body.baseTokenType,
      quoteTokenType: req.body.quoteTokenType,
      name: req.body.name,
      symbol: req.body.symbol,
      uri: req.body.uri
    } as any; // Using any here to bypass TypeScript's type checking

    // The baseMint keypair is generated on the server
    const result = await meteoraDBCService.createPool(params);
    
    // Return the result with the baseMintAddress and poolAddress
    res.json(result);
  } catch (error) {
    console.error('Error in /pool route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Pool and Buy
 */
router.post('/pool-and-buy', async (req, res) => {
  try {
    console.log('Received pool-and-buy request with params:', JSON.stringify({
      createPoolParam: req.body.createPoolParam,
      buyAmount: String(req.body.buyAmount || ''),
      minimumAmountOut: String(req.body.minimumAmountOut || '1')
    }, null, 2));
    
    // Ensure parameters are in correct format
    const params = {
      createPoolParam: {
        ...req.body.createPoolParam,
        // Make sure these are strings, not PublicKey objects
        payer: String(req.body.createPoolParam.payer),
        poolCreator: String(req.body.createPoolParam.poolCreator),
        quoteMint: String(req.body.createPoolParam.quoteMint),
        config: String(req.body.createPoolParam.config),
      },
      buyAmount: String(req.body.buyAmount),
      minimumAmountOut: String(req.body.minimumAmountOut || "1"),
      referralTokenAccount: req.body.referralTokenAccount
    };
    
    const result = await meteoraDBCService.createPoolAndBuy(params);
    res.json(result);
  } catch (error) {
    console.error('Error in /pool-and-buy route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create pool metadata
 */
router.post('/pool-metadata', async (req, res) => {
  try {
    const result = await meteoraDBCService.createPoolMetadata({
      virtualPool: req.body.virtualPool,
      name: req.body.name,
      website: req.body.website,
      logo: req.body.logo,
      creator: req.body.creator,
      payer: req.body.payer
    });
    res.json(result);
  } catch (error) {
    console.error('Error in /pool-metadata route:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Swap
 */
router.post('/swap', async (req, res) => {
  const result = await meteoraDBCService.swap(req.body);
  res.json(result);
});

/**
 * Get pool state
 */
router.get('/pool-state/:poolAddress', async (req, res) => {
  const { poolAddress } = req.params;
  const result = await meteoraDBCService.getPoolState(poolAddress);
  res.json(result);
});

/**
 * Get pool config state
 */
router.get('/pool-config-state/:configAddress', async (req, res) => {
  const { configAddress } = req.params;
  const result = await meteoraDBCService.getPoolConfigState(configAddress);
  res.json(result);
});

/**
 * Get pool curve progress
 */
router.get('/pool-curve-progress/:poolAddress', async (req, res) => {
  const { poolAddress } = req.params;
  const result = await meteoraDBCService.getPoolCurveProgress(poolAddress);
  res.json(result);
});

/**
 * Get pool fee metrics
 */
router.get('/pool-fee-metrics/:poolAddress', async (req, res) => {
  const { poolAddress } = req.params;
  const result = await meteoraDBCService.getPoolFeeMetrics(poolAddress);
  res.json(result);
});

export default router; 