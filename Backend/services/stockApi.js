const axios = require("axios");

const {
  redisClient,
} = require("../config/redis");

// ======================================================
// CONFIGURATION
// ======================================================

// Redis cache duration
// 10 seconds is reasonable for our current
// trading-simulation WebSocket setup.

const CACHE_DURATION = 10;

// ======================================================
// REDIS HELPERS
// ======================================================

function getRedisKey(symbol) {
  return `stock:price:${symbol}`;
}

// ======================================================
// FETCH STOCK PRICE
// ======================================================

async function getStockPrice(
  symbol,
  options = {}
) {
  try {
    const {
      forceRefresh = false,
    } = options;

    const redisKey =
      getRedisKey(symbol);

    // ==================================================
    // 1. CHECK REDIS CACHE
    // ==================================================

    if (
      !forceRefresh &&
      redisClient.isReady
    ) {
      try {
        const cachedData =
          await redisClient.get(
            redisKey
          );

        if (cachedData) {
          console.log(
            `Redis cache HIT: ${symbol}`
          );

          return JSON.parse(
            cachedData
          );
        }

        console.log(
          `Redis cache MISS: ${symbol}`
        );

      } catch (redisError) {
        console.error(
          `Redis GET error for ${symbol}:`,
          redisError.message
        );
      }
    }

    // ==================================================
    // 2. FETCH FROM YAHOO FINANCE
    // ==================================================

    console.log(
      `Fetching ${symbol} from Yahoo Finance`
    );

    const encodedSymbol =
      encodeURIComponent(symbol);

    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d&range=1d`;

    const response =
      await axios.get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0",
          },
          timeout: 10000,
        }
      );

    const result =
      response.data
        ?.chart
        ?.result?.[0];

    if (!result) {
      throw new Error(
        `No Yahoo Finance data available for ${symbol}`
      );
    }

    // ==================================================
    // 3. EXTRACT MARKET DATA
    // ==================================================

    const quote =
      result.meta;

    const currentPrice =
      Number(
        quote.regularMarketPrice
      ) || 0;

    const previousClose =
      Number(
        quote.previousClose ||
        quote.chartPreviousClose
      ) || 0;

    const change =
      currentPrice -
      previousClose;

    const changePercent =
      previousClose > 0
        ? (change /
            previousClose) *
          100
        : 0;

    const stockData = {
      symbol,

      name: symbol
        .replace(".NS", "")
        .replace(".BO", ""),

      price:
        currentPrice,

      percent:
        `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`,

      isDown:
        changePercent < 0,

      change,

      previousClose,

      dayHigh:
        Number(
          quote.regularMarketDayHigh
        ) || 0,

      dayLow:
        Number(
          quote.regularMarketDayLow
        ) || 0,

      cachedAt:
        new Date().toISOString(),
    };

    // ==================================================
    // 4. SAVE TO REDIS
    // ==================================================

    if (
      redisClient.isReady
    ) {
      try {
        await redisClient.set(
          redisKey,
          JSON.stringify(
            stockData
          ),
          {
            EX:
              CACHE_DURATION,
          }
        );

        console.log(
          `Redis cache SET: ${symbol}`
        );

      } catch (redisError) {
        console.error(
          `Redis SET error for ${symbol}:`,
          redisError.message
        );
      }
    }

    return stockData;

  } catch (error) {

    console.error(
      `Error fetching stock ${symbol}:`,
      error.message
    );

    // ==================================================
    // 5. FALLBACK TO REDIS
    // ==================================================

    if (
      redisClient.isReady
    ) {
      try {
        const cachedData =
          await redisClient.get(
            getRedisKey(symbol)
          );

        if (cachedData) {
          console.log(
            `Returning Redis fallback for ${symbol}`
          );

          return JSON.parse(
            cachedData
          );
        }

      } catch (redisError) {
        console.error(
          `Redis fallback error for ${symbol}:`,
          redisError.message
        );
      }
    }

    // ==================================================
    // 6. FINAL FALLBACK
    // ==================================================

    return {
      symbol,

      name: symbol
        .replace(".NS", "")
        .replace(".BO", ""),

      price: 0,

      percent:
        "0.00%",

      isDown:
        false,

      change: 0,

      previousClose: 0,

      dayHigh: 0,

      dayLow: 0,

      error:
        "Failed to fetch live data",
    };
  }
}

// ======================================================
// FETCH MULTIPLE STOCKS
// ======================================================

async function getMultipleStocks(
  symbols
) {
  try {

    const promises =
      symbols.map(
        (symbol) =>
          getStockPrice(symbol)
      );

    return await Promise.all(
      promises
    );

  } catch (error) {

    console.error(
      "Error fetching multiple stocks:",
      error.message
    );

    return [];
  }
}

// ======================================================
// CONVERT SYMBOL TO YAHOO FORMAT
// ======================================================

function toYahooSymbol(
  symbol
) {
  if (
    symbol.endsWith(".NS") ||
    symbol.endsWith(".BO")
  ) {
    return symbol;
  }

  return `${symbol}.NS`;
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getStockPrice,
  getMultipleStocks,
  toYahooSymbol,
};