import { useEffect, useRef, useState } from "react";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "ws://localhost:3002/ws";

const useStockWebSocket = (
  symbols = [],
  subscriptionType = "SUBSCRIBE"
) => {
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const [isConnected, setIsConnected] =
    useState(false);

  const [prices, setPrices] =
    useState({});

  // Convert symbols into a stable string.
  // Prevents unnecessary WebSocket reconnections
  // when the parent component re-renders.
  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (!symbolsKey) {
      return;
    }

    const subscriptionSymbols =
      symbolsKey.split(",");

    let shouldReconnect = true;

    const connect = () => {
      console.log(
        "Connecting to Stocker WebSocket..."
      );

      const socket =
        new WebSocket(WS_URL);

      socketRef.current = socket;

      // ==================================================
      // CONNECTION OPEN
      // ==================================================

      socket.onopen = () => {
        console.log(
          "WebSocket connected"
        );

        setIsConnected(true);

        socket.send(
          JSON.stringify({
            type: subscriptionType,
            symbols: subscriptionSymbols,
          })
        );

        console.log(
          `Subscribed using ${subscriptionType}:`,
          subscriptionSymbols
        );
      };

      // ==================================================
      // RECEIVE MESSAGE
      // ==================================================

      socket.onmessage = (event) => {
        try {
          const message =
            JSON.parse(event.data);

          // ----------------------------------------------
          // NORMAL STOCK PRICE UPDATE
          // ----------------------------------------------

          if (
            message.type ===
            "PRICE_UPDATE"
          ) {
            const stock =
              message.data;

            if (!stock) {
              return;
            }

            const symbol =
              stock.symbol ||
              stock.name;

            if (!symbol) {
              return;
            }

            setPrices(
              (previousPrices) => ({
                ...previousPrices,
                [symbol]: stock,
              })
            );
          }

          // ----------------------------------------------
          // HOLDING PRICE UPDATE
          // ----------------------------------------------

          if (
            message.type ===
            "HOLDING_PRICE_UPDATE"
          ) {
            const stock =
              message.data;

            if (!stock) {
              return;
            }

            const symbol =
              stock.symbol ||
              stock.name;

            if (!symbol) {
              return;
            }

            setPrices(
              (previousPrices) => ({
                ...previousPrices,
                [symbol]: stock,
              })
            );
          }

          // ----------------------------------------------
          // CONNECTION MESSAGE
          // ----------------------------------------------

          if (
            message.type ===
            "CONNECTED"
          ) {
            console.log(
              "WebSocket server:",
              message.message
            );
          }

          // ----------------------------------------------
          // SUBSCRIPTION CONFIRMATION
          // ----------------------------------------------

          if (
            message.type ===
            "SUBSCRIBED"
          ) {
            console.log(
              "Stock subscription confirmed:",
              message.data
            );
          }

          if (
            message.type ===
            "HOLDINGS_SUBSCRIBED"
          ) {
            console.log(
              "Holdings subscription confirmed:",
              message.data
            );
          }
        } catch (error) {
          console.error(
            "Invalid WebSocket message:",
            error
          );
        }
      };

      // ==================================================
      // ERROR
      // ==================================================

      socket.onerror = () => {
        console.error(
          "WebSocket connection error"
        );
      };

      // ==================================================
      // CLOSE
      // ==================================================

      socket.onclose = () => {
        console.log(
          "WebSocket disconnected"
        );

        setIsConnected(false);

        if (
          shouldReconnect &&
          !reconnectTimeoutRef.current
        ) {
          reconnectTimeoutRef.current =
            setTimeout(() => {
              reconnectTimeoutRef.current =
                null;

              connect();
            }, 3000);
        }
      };
    };

    connect();

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      shouldReconnect = false;

      if (
        reconnectTimeoutRef.current
      ) {
        clearTimeout(
          reconnectTimeoutRef.current
        );

        reconnectTimeoutRef.current =
          null;
      }

      if (socketRef.current) {
        socketRef.current.close();

        socketRef.current = null;
      }
    };
  }, [
    symbolsKey,
    subscriptionType,
  ]);

  return {
    isConnected,
    prices,
  };
};

export default useStockWebSocket;