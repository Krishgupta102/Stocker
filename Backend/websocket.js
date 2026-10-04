const WebSocket = require("ws");

const stockApi = require("./services/stockApi");

const { HoldingsModel } = require("./model/HoldingsModel");

const clients = new Set();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({
    server,
    path: "/ws",
  });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    clients.add(ws);

    // Stock-price subscriptions
    ws.subscriptions = [];

    // Holdings subscriptions
    ws.holdingSubscriptions = [];

    // ====================================================
    // HEARTBEAT
    // ====================================================

    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // ====================================================
    // CLIENT MESSAGES
    // ====================================================

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        console.log("WebSocket message:", data);

        // ------------------------------------------------
        // STOCK PRICE SUBSCRIBE
        // ------------------------------------------------

        if (data.type === "SUBSCRIBE") {
          ws.subscriptions = Array.isArray(data.symbols)
            ? data.symbols
            : [];

          console.log(
            "Client subscribed to:",
            ws.subscriptions
          );

          ws.send(
            JSON.stringify({
              type: "SUBSCRIBED",
              data: {
                symbols: ws.subscriptions,
              },
            })
          );
        }

        // ------------------------------------------------
        // STOCK PRICE UNSUBSCRIBE
        // ------------------------------------------------

        if (data.type === "UNSUBSCRIBE") {
          ws.subscriptions = [];

          console.log(
            "Client unsubscribed from all symbols"
          );

          ws.send(
            JSON.stringify({
              type: "UNSUBSCRIBED",
              data: {
                symbols: [],
              },
            })
          );
        }

        // ------------------------------------------------
        // HOLDINGS SUBSCRIBE
        // ------------------------------------------------

        if (data.type === "HOLDINGS_SUBSCRIBE") {
          ws.holdingSubscriptions = Array.isArray(
            data.symbols
          )
            ? data.symbols
            : [];

          console.log(
            "Client subscribed to holdings:",
            ws.holdingSubscriptions
          );

          ws.send(
            JSON.stringify({
              type: "HOLDINGS_SUBSCRIBED",
              data: {
                symbols: ws.holdingSubscriptions,
              },
            })
          );
        }

        // ------------------------------------------------
        // HOLDINGS UNSUBSCRIBE
        // ------------------------------------------------

        if (data.type === "HOLDINGS_UNSUBSCRIBE") {
          ws.holdingSubscriptions = [];

          console.log(
            "Client unsubscribed from holdings"
          );

          ws.send(
            JSON.stringify({
              type: "HOLDINGS_UNSUBSCRIBED",
              data: {
                symbols: [],
              },
            })
          );
        }
      } catch (error) {
        console.error(
          "WebSocket message error:",
          error
        );
      }
    });

    // ====================================================
    // CLIENT DISCONNECTED
    // ====================================================

    ws.on("close", () => {
      console.log(
        "WebSocket client disconnected"
      );

      clients.delete(ws);
    });

    // ====================================================
    // SOCKET ERROR
    // ====================================================

    ws.on("error", (error) => {
      console.error(
        "WebSocket error:",
        error
      );

      clients.delete(ws);
    });

    // ====================================================
    // INITIAL CONNECTION MESSAGE
    // ====================================================

    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        message:
          "Connected to Stocker WebSocket server",
      })
    );
  });

  // ======================================================
  // HEARTBEAT INTERVAL
  // ======================================================

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(
          "Terminating inactive WebSocket connection"
        );

        return ws.terminate();
      }

      ws.isAlive = false;

      ws.ping();
    });
  }, 30000);

  // ======================================================
  // PRICE UPDATE INTERVAL
  // ======================================================

  const priceInterval = setInterval(() => {
    updateSubscribedPrices();
  }, 10000);

  // ======================================================
  // CLEANUP
  // ======================================================

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
    clearInterval(priceInterval);
  });

  return wss;
}

// ======================================================
// UPDATE HOLDING MARKET PRICE
// ======================================================

async function updateHoldingMarketPrice(
  symbol,
  stockData
) {
  try {
    // Validate market data
    if (
      !stockData ||
      typeof stockData.price !== "number" ||
      stockData.price <= 0
    ) {
      console.log(
        `Skipping invalid market data for ${symbol}`
      );

      return;
    }

    // Convert Yahoo symbol to holding name.
    //
    // INFY.NS       -> INFY
    // TCS.NS        -> TCS
    // HINDUNILVR.NS -> HINDUNILVR

    const holdingName = symbol
      .replace(".NS", "")
      .replace(".BO", "")
      .toUpperCase();

    // Find holding in MongoDB
    const holding =
      await HoldingsModel.findOne({
        name: holdingName,
      });

    // Stock may exist in watchlist
    // but may not be owned.
    if (!holding) {
      return;
    }

    const qty =
      Number(holding.qty) || 0;

    const avg =
      Number(holding.avg) || 0;

    const currentPrice =
      Number(stockData.price);

    // ==================================================
    // PORTFOLIO CALCULATIONS
    // ==================================================

    const investment =
      avg * qty;

    const currentValue =
      currentPrice * qty;

    const pnl =
      currentValue - investment;

    const pnlPercent =
      investment > 0
        ? (pnl / investment) * 100
        : 0;

    // ==================================================
    // UPDATE HOLDING
    // ==================================================

    // Latest market price
    holding.price =
      currentPrice;

    // Unrealized P&L percentage
    holding.net =
      pnlPercent;

    // Today's market percentage change
    holding.day =
      parseFloat(
        String(
          stockData.percent || "0"
        ).replace("%", "")
      ) || 0;

    await holding.save();

    console.log(
      `Updated holding ${holdingName}:`,
      `price=₹${currentPrice.toFixed(2)}`,
      `net=${pnlPercent.toFixed(2)}%`,
      `day=${holding.day.toFixed(2)}%`
    );
  } catch (error) {
    console.error(
      `Failed to update holding ${symbol}:`,
      error.message
    );
  }
}

// ======================================================
// FETCH PRICES FOR ALL SUBSCRIBED SYMBOLS
// ======================================================

async function updateSubscribedPrices() {
  const symbols = new Set();

  // Collect all unique symbols subscribed
  // by connected clients.

  clients.forEach((ws) => {
    if (
      ws.readyState === WebSocket.OPEN &&
      Array.isArray(ws.subscriptions)
    ) {
      ws.subscriptions.forEach((symbol) => {
        symbols.add(symbol);
      });
    }
  });

  // No clients are subscribed to anything
  if (symbols.size === 0) {
    return;
  }

  console.log(
    "Updating subscribed prices:",
    [...symbols]
  );

  // ====================================================
  // FETCH EACH STOCK
  // ====================================================

  for (const symbol of symbols) {
    try {
      const stockData =
        await stockApi.getStockPrice(
          symbol,
          {
            forceRefresh: true,
          }
        );

      // ==================================================
      // UPDATE MONGODB HOLDING
      // ==================================================

      await updateHoldingMarketPrice(
        symbol,
        stockData
      );

      // ==================================================
      // WATCHLIST PRICE UPDATE
      // ==================================================

      broadcastToSubscribers(
        symbol,
        stockData
      );

      // ==================================================
      // HOLDINGS PRICE UPDATE
      // ==================================================

      broadcastHoldingPriceUpdate(
        symbol,
        stockData
      );
    } catch (error) {
      console.error(
        `Failed to update ${symbol}:`,
        error.message
      );
    }
  }
}

// ======================================================
// BROADCAST STOCK PRICE UPDATE
// ======================================================

function broadcastToSubscribers(
  symbol,
  data
) {
  let broadcastCount = 0;

  clients.forEach((ws) => {
    if (
      ws.readyState === WebSocket.OPEN &&
      Array.isArray(ws.subscriptions) &&
      ws.subscriptions.includes(symbol)
    ) {
      ws.send(
        JSON.stringify({
          type: "PRICE_UPDATE",
          data,
        })
      );

      broadcastCount++;
    }
  });

  if (broadcastCount > 0) {
    console.log(
      `Broadcasted ${symbol} update to ${broadcastCount} client(s)`
    );
  }
}

// ======================================================
// BROADCAST HOLDING PRICE UPDATE
// ======================================================

function broadcastHoldingPriceUpdate(
  symbol,
  data
) {
  let broadcastCount = 0;

  clients.forEach((ws) => {
    if (
      ws.readyState === WebSocket.OPEN &&
      Array.isArray(ws.holdingSubscriptions) &&
      ws.holdingSubscriptions.includes(symbol)
    ) {
      ws.send(
        JSON.stringify({
          type: "HOLDING_PRICE_UPDATE",
          data: {
            ...data,
            symbol,
          },
        })
      );

      broadcastCount++;
    }
  });

  if (broadcastCount > 0) {
    console.log(
      `Broadcasted holding price for ${symbol} to ${broadcastCount} client(s)`
    );
  }
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  setupWebSocket,
  broadcastToSubscribers,
  broadcastHoldingPriceUpdate,
};