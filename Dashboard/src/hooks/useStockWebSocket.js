import { useEffect, useRef, useState } from "react";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "ws://localhost:3002/ws";

const useStockWebSocket = (symbols = []) => {
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const [isConnected, setIsConnected] =
    useState(false);

  const [prices, setPrices] =
    useState({});

  // Convert symbols into a stable string.
  // This prevents the WebSocket from reconnecting
  // every time the parent component renders.
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

      socket.onopen = () => {
        console.log(
          "WebSocket connected"
        );

        setIsConnected(true);

        socket.send(
          JSON.stringify({
            type: "SUBSCRIBE",
            symbols: subscriptionSymbols,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const message =
            JSON.parse(event.data);

          if (
            message.type ===
            "PRICE_UPDATE"
          ) {
            const stock =
              message.data;

            setPrices(
              (previousPrices) => ({
                ...previousPrices,
                [stock.symbol]:
                  stock,
              })
            );
          }
        } catch (error) {
          console.error(
            "Invalid WebSocket message:",
            error
          );
        }
      };

      socket.onerror = () => {
        // Browser WebSocket errors don't
        // provide much useful information.
        console.error(
          "WebSocket connection error"
        );
      };

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
  }, [symbolsKey]);

  return {
    isConnected,
    prices,
  };
};

export default useStockWebSocket;