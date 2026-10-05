const WebSocket = require("ws");
const stockApi = require("./services/stockApi");

const clients = new Set();

// ======================================================
// SETUP WEBSOCKET SERVER
// ======================================================

function setupWebSocket(server) {
  const wss = new WebSocket.Server({
    server,
    path: "/ws",
  });

  // ====================================================
  // CLIENT CONNECTION
  // ====================================================

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    clients.add(ws);

    // Each client starts with no subscriptions
    ws.subscriptions = [];

    // ==================================================
    // HEARTBEAT
    // ==================================================

    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // ==================================================
    // CLIENT MESSAGES
    // ==================================================

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        console.log("WebSocket message:", data);

        // ----------------------------------------------
        // SUBSCRIBE
        // ----------------------------------------------

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

        // ----------------------------------------------
        // UNSUBSCRIBE
        // ----------------------------------------------

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
      } catch (error) {
        console.error(
          "WebSocket message error:",
          error.message
        );
      }
    });

    // ==================================================
    // CLIENT DISCONNECTED
    // ==================================================

    ws.on("close", () => {
      console.log(
        "WebSocket client disconnected"
      );

      clients.delete(ws);
    });

    // ==================================================
    // SOCKET ERROR
    // ==================================================

    ws.on("error", (error) => {
      console.error(
        "WebSocket error:",
        error.message
      );

      clients.delete(ws);
    });

    // ==================================================
    // INITIAL CONNECTION MESSAGE
    // ==================================================

    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        message:
          "Connected to Stocker WebSocket server",
      })
    );
  });

  // ====================================================
  // HEARTBEAT INTERVAL
  // ====================================================

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

  // ====================================================
  // PRICE UPDATE INTERVAL
  // ====================================================

  const priceInterval = setInterval(() => {
    updateSubscribedPrices();
  }, 10000);

  // ====================================================
  // CLEANUP
  // ====================================================

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
    clearInterval(priceInterval);
  });

  return wss;
}

// ======================================================
// FETCH PRICES FOR ALL SUBSCRIBED SYMBOLS
// ======================================================

async function updateSubscribedPrices() {
  const symbols = new Set();

  // ----------------------------------------------------
  // Collect all unique subscribed symbols
  // ----------------------------------------------------

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

  // ----------------------------------------------------
  // Nothing to update
  // ----------------------------------------------------

  if (symbols.size === 0) {
    return;
  }

  console.log(
    "Updating subscribed prices:",
    [...symbols]
  );

  // ----------------------------------------------------
  // Fetch each unique stock
  // ----------------------------------------------------

  for (const symbol of symbols) {
    try {
      /*
       * IMPORTANT:
       *
       * getStockPrice() now handles Redis caching.
       *
       * We DO NOT call:
       *
       * stockApi.setLivePrice()
       *
       * because that function does not exist
       * in the current stockApi.js.
       */

      const stockData =
        await stockApi.getStockPrice(symbol);

      // ------------------------------------------------
      // Validate returned data
      // ------------------------------------------------

      if (
        !stockData ||
        typeof stockData.price !== "number"
      ) {
        console.log(
          `Skipping invalid data for ${symbol}`
        );

        continue;
      }

      // ------------------------------------------------
      // Broadcast price to subscribed clients
      // ------------------------------------------------

      broadcastToSubscribers(
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
// BROADCAST PRICE UPDATE
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
      try {
        ws.send(
          JSON.stringify({
            type: "PRICE_UPDATE",

            data: {
              ...data,

              // Make sure frontend knows
              // which stock this update belongs to
              symbol,
            },
          })
        );

        broadcastCount++;
      } catch (error) {
        console.error(
          `Failed to send ${symbol} update:`,
          error.message
        );
      }
    }
  });

  console.log(
    `Broadcasted ${symbol} update to ${broadcastCount} client(s)`
  );
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  setupWebSocket,
  broadcastToSubscribers,
};