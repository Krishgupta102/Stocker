const axios = require("axios");

// ======================================================
// CACHE
// ======================================================

// Yahoo/API response cache
const cache = new Map();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// When Yahoo rate-limits us, don't immediately retry
// the same symbol.
const RATE_LIMIT_BACKOFF = 60 * 1000; // 1 minute

// Keep track of temporarily rate-limited symbols.
const rateLimitedUntil = new Map();

// ======================================================
// GET STOCK PRICE
// ======================================================

async function getStockPrice(symbol, options = {}) {
  const {
    forceRefresh = false,
  } = options;

  try {
    // ------------------------------------------------
    // CHECK RATE LIMIT BACKOFF
    // ------------------------------------------------

    const blockedUntil =
      rateLimitedUntil.get(symbol);

    if (
      blockedUntil &&
      Date.now() < blockedUntil
    ) {
      console.log(
        `Skipping ${symbol} because Yahoo rate limit is active`
      );

      const cached =
        cache.get(symbol);

      if (cached) {
        return cached.data;
      }

      return {
        name: symbol
          .replace(".NS", "")
          .replace(".BO", ""),

        symbol,

        price: 0,

        percent: "0.00%",

        isDown: false,

        change: 0,

        previousClose: 0,

        dayHigh: 0,

        dayLow: 0,

        error: "Yahoo Finance rate limited",
      };
    }

    // ------------------------------------------------
    // CHECK CACHE
    // ------------------------------------------------

    const cached = cache.get(symbol);

    if (
      !forceRefresh &&
      cached &&
      Date.now() - cached.timestamp <
        CACHE_DURATION
    ) {
      return cached.data;
    }

    // ------------------------------------------------
    // YAHOO FINANCE REQUEST
    // ------------------------------------------------

    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?interval=1d&range=1d`;

    const response = await axios.get(url, {
      timeout: 10000,

      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",

        Accept:
          "application/json,text/plain,*/*",
      },
    });

    // ------------------------------------------------
    // CLEAR RATE LIMIT STATE
    // ------------------------------------------------

    rateLimitedUntil.delete(symbol);

    // ------------------------------------------------
    // PARSE RESPONSE
    // ------------------------------------------------

    const result =
      response.data?.chart?.result?.[0];

    if (!result) {
      throw new Error(
        `No Yahoo Finance data returned for ${symbol}`
      );
    }

    const quote = result.meta;

    const currentPrice =
      quote.regularMarketPrice || 0;

    const previousClose =
      quote.previousClose ||
      quote.chartPreviousClose ||
      0;

    const change =
      currentPrice - previousClose;

    const changePercent =
      previousClose > 0
        ? (change / previousClose) * 100
        : 0;

    // ------------------------------------------------
    // FORMAT STOCK DATA
    // ------------------------------------------------

    const stockData = {
      name: symbol
        .replace(".NS", "")
        .replace(".BO", ""),

      symbol,

      price: currentPrice,

      percent:
        changePercent !== 0
          ? `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%`
          : "0.00%",

      isDown: changePercent < 0,

      change,

      previousClose,

      dayHigh:
        quote.regularMarketDayHigh || 0,

      dayLow:
        quote.regularMarketDayLow || 0,

      timestamp: Date.now(),
    };

    // ------------------------------------------------
    // SAVE TO YAHOO/API CACHE
    // ------------------------------------------------

    cache.set(symbol, {
      data: stockData,
      timestamp: Date.now(),
    });

    return stockData;

  } catch (error) {

    // ==================================================
    // RATE LIMIT
    // ==================================================

    if (
      error.response?.status === 429
    ) {
      const retryUntil =
        Date.now() +
        RATE_LIMIT_BACKOFF;

      rateLimitedUntil.set(
        symbol,
        retryUntil
      );

      console.warn(
        `Yahoo Finance rate limited ${symbol}. Backing off for 60 seconds.`
      );

      const cached =
        cache.get(symbol);

      if (cached) {
        return cached.data;
      }

      return {
        name: symbol
          .replace(".NS", "")
          .replace(".BO", ""),

        symbol,

        price: 0,

        percent: "0.00%",

        isDown: false,

        change: 0,

        previousClose: 0,

        dayHigh: 0,

        dayLow: 0,

        error: "Yahoo Finance rate limited",
      };
    }

    // ==================================================
    // OTHER ERRORS
    // ==================================================

    console.error(
      `Error fetching stock ${symbol}:`,
      error.message
    );

    // Return cached data if available.
    const cached =
      cache.get(symbol);

    if (cached) {
      console.log(
        `Returning cached data for ${symbol}`
      );

      return cached.data;
    }

    // Default response.
    return {
      name: symbol
        .replace(".NS", "")
        .replace(".BO", ""),

      symbol,

      price: 0,

      percent: "0.00%",

      isDown: false,

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
// GET MULTIPLE STOCKS
// ======================================================

async function getMultipleStocks(
  symbols,
  options = {}
) {
  try {
    const results =
      await Promise.allSettled(
        symbols.map((symbol) =>
          getStockPrice(
            symbol,
            options
          )
        )
      );

    return results
      .filter(
        (result) =>
          result.status ===
          "fulfilled"
      )
      .map(
        (result) =>
          result.value
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
// CONVERT SYMBOL
// ======================================================

function toYahooSymbol(symbol) {
  if (
    symbol.endsWith(".NS") ||
    symbol.endsWith(".BO")
  ) {
    return symbol;
  }

  return `${symbol}.NS`;
}

// ======================================================
// REAL-TIME PRICE CACHE
// ======================================================

// Stores the latest price that is being
// distributed through the WebSocket layer.

const livePriceCache = new Map();

// ------------------------------------------------------
// SAVE LIVE PRICE
// ------------------------------------------------------

function setLivePrice(symbol, data) {
  livePriceCache.set(symbol, {
    ...data,
    updatedAt: Date.now(),
  });
}

// ------------------------------------------------------
// GET LIVE PRICE
// ------------------------------------------------------

function getLivePrice(symbol) {
  return (
    livePriceCache.get(symbol) ||
    null
  );
}

// ------------------------------------------------------
// GET ALL LIVE PRICES
// ------------------------------------------------------

function getAllLivePrices() {
  return livePriceCache;
}

// ------------------------------------------------------
// CHECK IF LIVE PRICE EXISTS
// ------------------------------------------------------

function hasLivePrice(symbol) {
  return livePriceCache.has(symbol);
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getStockPrice,
  getMultipleStocks,
  toYahooSymbol,

  // Real-time price cache
  setLivePrice,
  getLivePrice,
  getAllLivePrices,
  hasLivePrice,
};