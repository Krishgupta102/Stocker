import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { VerticalGraph } from "./VerticalGraph";
import useStockWebSocket from "../hooks/useStockWebSocket";

import "../App.css";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:3002",
});

const Holdings = () => {
  const [allHoldings, setAllHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==================================================
  // FETCH INITIAL HOLDINGS
  // ==================================================

  useEffect(() => {
    let mounted = true;

    const fetchHoldings = async () => {
      try {
        setLoading(true);
        setError("");

        const res =
          await api.get("/allHoldings");

        if (mounted) {
          setAllHoldings(
            Array.isArray(res.data)
              ? res.data
              : []
          );
        }
      } catch (err) {
        console.error(
          "Failed to fetch holdings:",
          err
        );

        if (mounted) {
          setError(
            "Failed to load holdings"
          );

          setAllHoldings([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchHoldings();

    return () => {
      mounted = false;
    };
  }, []);

  // ==================================================
  // CREATE YAHOO SYMBOLS FOR HOLDINGS
  // ==================================================

  const holdingSymbols = useMemo(() => {
    return allHoldings.map(
      (stock) => `${stock.name}.NS`
    );
  }, [allHoldings]);

  // ==================================================
  // REAL-TIME WEBSOCKET
  // ==================================================

  const {
    isConnected,
    prices,
  } = useStockWebSocket(
    holdingSymbols,
    "HOLDINGS_SUBSCRIBE"
  );

  // ==================================================
  // UPDATE HOLDINGS WITH LIVE PRICE
  // ==================================================

  useEffect(() => {
    if (
      !prices ||
      Object.keys(prices).length === 0
    ) {
      return;
    }

    setAllHoldings(
      (previousHoldings) =>
        previousHoldings.map(
          (holding) => {
            const symbol =
              `${holding.name}.NS`;

            const liveStock =
              prices[symbol];

            if (!liveStock) {
              return holding;
            }

            const qty =
              Number(holding.qty) || 0;

            const avg =
              Number(holding.avg) || 0;

            const livePrice =
              Number(liveStock.price) || 0;

            // ==========================================
            // INVESTMENT
            // ==========================================

            const investment =
              avg * qty;

            // ==========================================
            // CURRENT VALUE
            // ==========================================

            const currentValue =
              livePrice * qty;

            // ==========================================
            // P&L
            // ==========================================

            const pnl =
              currentValue -
              investment;

            // ==========================================
            // P&L %
            // ==========================================

            const pnlPercent =
              investment > 0
                ? (pnl / investment) * 100
                : 0;

            // ==========================================
            // DAY CHANGE
            // ==========================================

            const dayChange =
              parseFloat(
                String(
                  liveStock.percent ||
                    "0"
                ).replace("%", "")
              ) || 0;

            return {
              ...holding,

              // Live market data
              price: livePrice,

              // Calculated portfolio data
              investment,
              currentValue,
              pnl,

              // Net P&L percentage
              net: pnlPercent,

              // Today's change
              day: dayChange,
            };
          }
        )
    );
  }, [prices]);

  // ==================================================
  // PORTFOLIO CALCULATIONS
  // ==================================================

  const totalInvestment =
    allHoldings.reduce(
      (total, stock) => {
        const avg =
          Number(stock.avg) || 0;

        const qty =
          Number(stock.qty) || 0;

        const investment =
          stock.investment != null
            ? Number(
                stock.investment
              )
            : avg * qty;

        return (
          total + investment
        );
      },
      0
    );

  const currentValue =
    allHoldings.reduce(
      (total, stock) => {
        const price =
          Number(stock.price) || 0;

        const qty =
          Number(stock.qty) || 0;

        const value =
          stock.currentValue != null
            ? Number(
                stock.currentValue
              )
            : price * qty;

        return total + value;
      },
      0
    );

  const pnl =
    currentValue -
    totalInvestment;

  const pnlPercent =
    totalInvestment > 0
      ? (pnl / totalInvestment) *
        100
      : 0;

  // ==================================================
  // CHART DATA
  // ==================================================

  const labels =
    allHoldings.map(
      (stock) => stock.name
    );

  const data = {
    labels,

    datasets: [
      {
        label: "Stock Price",

        data: allHoldings.map(
          (stock) =>
            Number(stock.price) || 0
        ),

        backgroundColor:
          "rgba(255, 99, 132, 0.5)",
      },
    ],
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div className="loading">
        Loading holdings...
      </div>
    );
  }

  // ==================================================
  // ERROR
  // ==================================================

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    );
  }

  // ==================================================
  // EMPTY
  // ==================================================

  if (allHoldings.length === 0) {
    return (
      <div className="empty-state">
        <h2>Holdings (0)</h2>

        <p>
          You don't have any holdings yet.
        </p>
      </div>
    );
  }

  // ==================================================
  // MAIN UI
  // ==================================================

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <h2>
          Holdings ({allHoldings.length})
        </h2>

        {/* WebSocket status */}

        <span
          style={{
            fontSize: "12px",
            color: isConnected
              ? "green"
              : "red",
          }}
        >
          {isConnected
            ? "● Live"
            : "● Disconnected"}
        </span>
      </div>

      {/* ==================================================
          HOLDINGS TABLE
          ================================================== */}

      <div className="order-table">
        <table>
          <thead>
            <tr>
              <th>Instrument</th>
              <th>Qty.</th>
              <th>Avg. cost</th>
              <th>LTP</th>
              <th>Cur. val</th>
              <th>P&L</th>
              <th>Net chg.</th>
              <th>Day chg.</th>
            </tr>
          </thead>

          <tbody>
            {allHoldings.map(
              (stock) => {
                const qty =
                  Number(
                    stock.qty
                  ) || 0;

                const avg =
                  Number(
                    stock.avg
                  ) || 0;

                const price =
                  Number(
                    stock.price
                  ) || 0;

                // ========================================
                // INVESTMENT
                // ========================================

                const investment =
                  stock.investment !=
                  null
                    ? Number(
                        stock.investment
                      )
                    : avg * qty;

                // ========================================
                // CURRENT VALUE
                // ========================================

                const curValue =
                  stock.currentValue !=
                  null
                    ? Number(
                        stock.currentValue
                      )
                    : price * qty;

                // ========================================
                // P&L
                // ========================================

                const stockPnl =
                  stock.pnl != null
                    ? Number(
                        stock.pnl
                      )
                    : curValue -
                      investment;

                const stockPnlPercent =
                  investment > 0
                    ? (stockPnl /
                        investment) *
                      100
                    : 0;

                const profClass =
                  stockPnl >= 0
                    ? "profit"
                    : "loss";

                // ========================================
                // DAY CHANGE
                // ========================================

                const dayChange =
                  stock.day != null
                    ? String(
                        stock.day
                      )
                    : "0.00%";

                const dayChangeValue =
                  parseFloat(
                    dayChange.replace(
                      "%",
                      ""
                    )
                  ) || 0;

                const dayClass =
                  dayChangeValue >= 0
                    ? "profit"
                    : "loss";

                // ========================================
                // NET CHANGE
                // ========================================

                const netChange =
                  stock.net != null
                    ? String(
                        stock.net
                      )
                    : "0.00%";

                const netChangeValue =
                  parseFloat(
                    netChange.replace(
                      "%",
                      ""
                    )
                  ) || 0;

                const netClass =
                  netChangeValue >= 0
                    ? "profit"
                    : "loss";

                return (
                  <tr
                    key={
                      stock._id ||
                      `${stock.name}-${stock.qty}`
                    }
                  >
                    {/* Instrument */}

                    <td>
                      {stock.name}
                    </td>

                    {/* Quantity */}

                    <td>
                      {qty}
                    </td>

                    {/* Average */}

                    <td>
                      ₹
                      {avg.toFixed(
                        2
                      )}
                    </td>

                    {/* LIVE PRICE */}

                    <td>
                      ₹
                      {price.toFixed(
                        2
                      )}
                    </td>

                    {/* Current Value */}

                    <td>
                      ₹
                      {curValue.toFixed(
                        2
                      )}
                    </td>

                    {/* P&L */}

                    <td
                      className={
                        profClass
                      }
                    >
                      <div>
                        ₹
                        {stockPnl.toFixed(
                          2
                        )}
                      </div>

                      <small>
                        {stockPnlPercent >=
                        0
                          ? "+"
                          : ""}
                        {stockPnlPercent.toFixed(
                          2
                        )}
                        %
                      </small>
                    </td>

                    {/* Net Change */}

                    <td
                      className={
                        netClass
                      }
                    >
                      {netChange}
                    </td>

                    {/* Day Change */}

                    <td
                      className={
                        dayClass
                      }
                    >
                      {dayChange}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      {/* ==================================================
          PORTFOLIO SUMMARY
          ================================================== */}

      <div className="row">

        {/* Total Investment */}

        <div className="col">
          <h5>
            ₹
            {totalInvestment.toFixed(
              2
            )}
          </h5>

          <p>
            Total investment
          </p>
        </div>

        {/* Current Value */}

        <div className="col">
          <h5>
            ₹
            {currentValue.toFixed(
              2
            )}
          </h5>

          <p>
            Current value
          </p>
        </div>

        {/* Total P&L */}

        <div className="col">
          <h5
            className={
              pnl >= 0
                ? "profit"
                : "loss"
            }
          >
            ₹
            {pnl.toFixed(2)}

            {" "}

            <span>
              (
              {pnl >= 0
                ? "+"
                : ""}
              {pnlPercent.toFixed(
                2
              )}
              %)
            </span>
          </h5>

          <p>P&L</p>
        </div>

      </div>

      {/* ==================================================
          PORTFOLIO CHART
          ================================================== */}

      <VerticalGraph
        data={data}
      />
    </>
  );
};

export default Holdings;