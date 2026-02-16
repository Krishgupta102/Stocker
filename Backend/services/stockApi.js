const axios = require('axios');

// Cache to store stock data (5 minute cache)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch live stock price from Yahoo Finance using direct API
 * @param {string} symbol - Stock symbol (e.g., 'INFY.NS' for NSE stocks)
 * @returns {Promise<Object>} Stock data with price, change, etc.
 */
async function getStockPrice(symbol) {
    try {
        // Check cache first
        const cached = cache.get(symbol);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }

        // Fetch from Yahoo Finance using their query API
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const result = response.data.chart.result[0];
        const quote = result.meta;
        const indicators = result.indicators.quote[0];

        const currentPrice = quote.regularMarketPrice;
        const previousClose = quote.previousClose || quote.chartPreviousClose;
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;

        const stockData = {
            name: symbol.replace('.NS', '').replace('.BO', ''),
            price: currentPrice || 0,
            percent: changePercent
                ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`
                : '0.00%',
            isDown: changePercent < 0,
            change: change || 0,
            previousClose: previousClose || 0,
            dayHigh: quote.regularMarketDayHigh || 0,
            dayLow: quote.regularMarketDayLow || 0,
        };

        // Cache the result
        cache.set(symbol, {
            data: stockData,
            timestamp: Date.now(),
        });

        return stockData;
    } catch (error) {
        console.error(`Error fetching stock ${symbol}:`, error.message);

        // Return cached data if available, even if expired
        const cached = cache.get(symbol);
        if (cached) {
            console.log(`Returning cached data for ${symbol}`);
            return cached.data;
        }

        // Return default data if no cache
        return {
            name: symbol.replace('.NS', '').replace('.BO', ''),
            price: 0,
            percent: '0.00%',
            isDown: false,
            change: 0,
            error: 'Failed to fetch live data',
        };
    }
}

/**
 * Fetch multiple stocks in batch
 * @param {Array<string>} symbols - Array of stock symbols
 * @returns {Promise<Array<Object>>} Array of stock data
 */
async function getMultipleStocks(symbols) {
    try {
        const promises = symbols.map(symbol => getStockPrice(symbol));
        return await Promise.all(promises);
    } catch (error) {
        console.error('Error fetching multiple stocks:', error.message);
        return [];
    }
}

/**
 * Convert Indian stock symbol to Yahoo Finance format
 * @param {string} symbol - Stock symbol (e.g., 'INFY')
 * @returns {string} Yahoo Finance symbol (e.g., 'INFY.NS')
 */
function toYahooSymbol(symbol) {
    // If already has .NS or .BO, return as is
    if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) {
        return symbol;
    }
    // Default to NSE (.NS)
    return `${symbol}.NS`;
}

module.exports = {
    getStockPrice,
    getMultipleStocks,
    toYahooSymbol,
};
