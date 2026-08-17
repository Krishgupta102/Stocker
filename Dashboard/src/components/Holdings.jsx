import React, { useState, useEffect } from "react";
import axios from "axios";
import { VerticalGraph } from "./VerticalGraph";
import "../App.css";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "http://localhost:3002",
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
          setAllHoldings(res.data || []);
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

  // -----------------------------
  // Calculate portfolio totals
  // -----------------------------

  const totalInvestment = allHoldings.reduce((total, stock) => {
    const investment =
      Number(stock.investment) ||
      Number(stock.avg) * Number(stock.qty) ||
      0;

    return total + investment;
  }, 0);

  const currentValue = allHoldings.reduce((total, stock) => {
    const value =
      Number(stock.currentValue) ||
      Number(stock.price) * Number(stock.qty) ||
      0;

    return total + value;
  }, 0);

  const pnl = currentValue - totalInvestment;

  const pnlPercent =
    totalInvestment > 0
      ? (pnl / totalInvestment) * 100
      : 0;

  // -----------------------------
  // Chart data
  // -----------------------------

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

  // -----------------------------
  // Loading state
  // -----------------------------

  if (loading) {
    return (
      <div className="loading">
        Loading holdings...
      </div>
    );
  }

  // -----------------------------
  // Error state
  // -----------------------------

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    );
  }

  return (
    <>
      <h2>Holdings ({allHoldings.length})</h2>

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

              const investment =
                Number(stock.investment) ||
                avg * qty;

              const curValue =
                Number(stock.currentValue) ||
                price * qty;

              const stockPnl =
                Number(stock.pnl) ||
                curValue - investment;

              const isProfit = stockPnl >= 0;

              const profClass = isProfit
                ? "profit"
                : "loss";

              const dayChange = stock.day || "0.00%";

              const dayClass = dayChange.startsWith("-")
                ? "loss"
                : "profit";

              return (
                <tr key={stock._id}>
                  <td>{stock.name}</td>

                  <td>{qty}</td>

                  <td>
                    ₹{avg.toFixed(2)}
                  </td>

                  <td>
                    ₹{price.toFixed(2)}
                  </td>

                  <td>
                    ₹{curValue.toFixed(2)}
                  </td>

                  <td className={profClass}>
                    ₹{stockPnl.toFixed(2)}
                  </td>

                  <td className={profClass}>
                    {stock.net || "0.00%"}
                  </td>

                  <td className={dayClass}>
                    {dayChange}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Portfolio Summary */}

      <div className="row">

        <div className="col">
          <h5>
            ₹{totalInvestment.toFixed(2)}
          </h5>

          <p>Total investment</p>
        </div>

        <div className="col">
          <h5>
            ₹{currentValue.toFixed(2)}
          </h5>

          <p>Current value</p>
        </div>

        <div className="col">
          <h5 className={pnl >= 0 ? "profit" : "loss"}>
            ₹{pnl.toFixed(2)}{" "}
            ({pnlPercent.toFixed(2)}%)
          </h5>

          <p>P&L</p>
        </div>

      </div>

      <VerticalGraph data={data} />
    </>
  );
};

export default Holdings;