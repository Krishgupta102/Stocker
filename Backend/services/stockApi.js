const axios = require('axios');

// Cache to store stock data
const cache = new Map();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch live stock price from Yahoo Finance.
 *
 * @param {string} symbol
 * @param {Object} options
 * @param {boolean} options.forceRefresh
 * @returns {Promise<Object>}
 */
async function getStockPrice(symbol, options = {}) {
    try {
        const { forceRefresh = false } = options;

        // ----------------------------------------
        // CHECK CACHE
        // ----------------------------------------

        const cached = cache.get(symbol);

        if (
            !forceRefresh &&
            cached &&
            Date.now() - cached.timestamp < CACHE_DURATION
        ) {
            return cached.data;
        }

        // ----------------------------------------
        // FETCH FROM YAHOO FINANCE
        // ----------------------------------------

        const url =
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
            `?interval=1d&range=1d`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const result = response.data.chart.result[0];

        if (!result) {
            throw new Error(
                `No data returned for ${symbol}`
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

        // ----------------------------------------
        // FORMAT STOCK DATA
        // ----------------------------------------

        const stockData = {
            name: symbol
                .replace('.NS', '')
                .replace('.BO', ''),

            symbol,

            price: currentPrice,

            percent:
                changePercent !== 0
                    ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`
                    : '0.00%',

            isDown: changePercent < 0,

            change,

            previousClose,

            dayHigh:
                quote.regularMarketDayHigh || 0,

            dayLow:
                quote.regularMarketDayLow || 0,

            timestamp: Date.now(),
        };

        // ----------------------------------------
        // UPDATE CACHE
        // ----------------------------------------

        cache.set(symbol, {
            data: stockData,
            timestamp: Date.now(),
        });

        return stockData;

    } catch (error) {
        console.error(
            `Error fetching stock ${symbol}:`,
            error.message
        );

        // ----------------------------------------
        // FALLBACK TO CACHED DATA
        // ----------------------------------------

        const cached = cache.get(symbol);

        if (cached) {
            console.log(
                `Returning cached data for ${symbol}`
            );

            return cached.data;
        }

        // ----------------------------------------
        // DEFAULT RESPONSE
        // ----------------------------------------

        return {
            name: symbol
                .replace('.NS', '')
                .replace('.BO', ''),

            symbol,

            price: 0,

            percent: '0.00%',

            isDown: false,

            change: 0,

            previousClose: 0,

            dayHigh: 0,

            dayLow: 0,

            timestamp: Date.now(),

            error: 'Failed to fetch live data',
        };
    }
}

/**
 * Fetch multiple stocks in batch.
 *
 * @param {Array<string>} symbols
 * @param {Object} options
 * @returns {Promise<Array<Object>>}
 */
async function getMultipleStocks(
    symbols,
    options = {}
) {
    try {
        const promises = symbols.map(
            (symbol) =>
                getStockPrice(symbol, options)
        );

        return await Promise.all(promises);

    } catch (error) {
        console.error(
            'Error fetching multiple stocks:',
            error.message
        );

        return [];
    }
}

/**
 * Convert Indian stock symbol
 * to Yahoo Finance format.
 *
 * Example:
 * INFY → INFY.NS
 */
function toYahooSymbol(symbol) {
    if (
        symbol.endsWith('.NS') ||
        symbol.endsWith('.BO')
    ) {
        return symbol;
    }

    return `${symbol}.NS`;
}

module.exports = {
    getStockPrice,
    getMultipleStocks,
    toYahooSymbol,
};