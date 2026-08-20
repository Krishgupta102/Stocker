import React, { useState, useEffect } from "react";
import axios from "axios";
import { VerticalGraph } from "./VerticalGraph";
import "../App.css";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3002",
});

const Holdings = () => {
  const [allHoldings, setAllHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchHoldings = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/allHoldings");

        if (mounted) {
          setAllHoldings(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error("Failed to fetch holdings:", err);

        if (mounted) {
          setError("Failed to load holdings");
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

  // ==========================================
  // Portfolio calculations
  // ==========================================

  const totalInvestment = allHoldings.reduce((total, stock) => {
    const avg = Number(stock.avg) || 0;
    const qty = Number(stock.qty) || 0;

    const investment =
      stock.investment != null
        ? Number(stock.investment)
        : avg * qty;

    return total + investment;
  }, 0);

  const currentValue = allHoldings.reduce((total, stock) => {
    const price = Number(stock.price) || 0;
    const qty = Number(stock.qty) || 0;

    const value =
      stock.currentValue != null
        ? Number(stock.currentValue)
        : price * qty;

    return total + value;
  }, 0);

  const pnl = currentValue - totalInvestment;

  const pnlPercent =
    totalInvestment > 0
      ? (pnl / totalInvestment) * 100
      : 0;

  // ==========================================
  // Chart data
  // ==========================================

  const labels = allHoldings.map((stock) => stock.name);

  const data = {
    labels,
    datasets: [
      {
        label: "Stock Price",
        data: allHoldings.map(
          (stock) => Number(stock.price) || 0
        ),
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
    ],
  };

  // ==========================================
  // Loading state
  // ==========================================

  if (loading) {
    return (
      <div className="loading">
        Loading holdings...
      </div>
    );
  }

  // ==========================================
  // Error state
  // ==========================================

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    );
  }

  // ==========================================
  // Empty state
  // ==========================================

  if (allHoldings.length === 0) {
    return (
      <div className="empty-state">
        <h2>Holdings (0)</h2>
        <p>You don't have any holdings yet.</p>
      </div>
    );
  }

  // ==========================================
  // Main UI
  // ==========================================

  return (
    <>
      <h2>Holdings ({allHoldings.length})</h2>

      {/* Holdings Table */}

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
            {allHoldings.map((stock) => {
              const qty = Number(stock.qty) || 0;
              const avg = Number(stock.avg) || 0;
              const price = Number(stock.price) || 0;

              // Investment
              const investment =
                stock.investment != null
                  ? Number(stock.investment)
                  : avg * qty;

              // Current value
              const curValue =
                stock.currentValue != null
                  ? Number(stock.currentValue)
                  : price * qty;

              // Profit / Loss
              const stockPnl =
                stock.pnl != null
                  ? Number(stock.pnl)
                  : curValue - investment;

              const stockPnlPercent =
                investment > 0
                  ? (stockPnl / investment) * 100
                  : 0;

              // Profit / Loss class
              const profClass =
                stockPnl >= 0 ? "profit" : "loss";

              // Day change
              const dayChange =
                stock.day != null
                  ? String(stock.day)
                  : "0.00%";

              const dayChangeValue =
                parseFloat(dayChange.replace("%", "")) || 0;

              const dayClass =
                dayChangeValue >= 0
                  ? "profit"
                  : "loss";

              // Net change
              const netChange =
                stock.net != null
                  ? String(stock.net)
                  : "0.00%";

              const netChangeValue =
                parseFloat(netChange.replace("%", "")) || 0;

              const netClass =
                netChangeValue >= 0
                  ? "profit"
                  : "loss";

              return (
                <tr key={stock._id || `${stock.name}-${stock.qty}`}>
                  {/* Instrument */}

                  <td>
                    {stock.name}
                  </td>

                  {/* Quantity */}

                  <td>
                    {qty}
                  </td>

                  {/* Average Cost */}

                  <td>
                    ₹{avg.toFixed(2)}
                  </td>

                  {/* LTP */}

                  <td>
                    ₹{price.toFixed(2)}
                  </td>

                  {/* Current Value */}

                  <td>
                    ₹{curValue.toFixed(2)}
                  </td>

                  {/* P&L */}

                  <td className={profClass}>
                    <div>
                      ₹{stockPnl.toFixed(2)}
                    </div>

                    <small>
                      {stockPnlPercent >= 0
                        ? "+"
                        : ""}
                      {stockPnlPercent.toFixed(2)}%
                    </small>
                  </td>

                  {/* Net Change */}

                  <td className={netClass}>
                    {netChange}
                  </td>

                  {/* Day Change */}

                  <td className={dayClass}>
                    {dayChange}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ==========================================
          Portfolio Summary
          ========================================== */}

      <div className="row">

        {/* Total Investment */}

        <div className="col">
          <h5>
            ₹{totalInvestment.toFixed(2)}
          </h5>

          <p>Total investment</p>
        </div>

        {/* Current Value */}

        <div className="col">
          <h5>
            ₹{currentValue.toFixed(2)}
          </h5>

          <p>Current value</p>
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
            ₹{pnl.toFixed(2)}{" "}
            <span>
              ({pnl >= 0 ? "+" : ""}
              {pnlPercent.toFixed(2)}%)
            </span>
          </h5>

          <p>P&L</p>
        </div>

      </div>

      {/* Portfolio Chart */}

      <VerticalGraph data={data} />
    </>
  );
};

export default Holdings;