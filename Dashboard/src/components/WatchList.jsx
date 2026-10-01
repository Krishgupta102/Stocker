import React, {
  useState,
  useContext,
  useEffect,
  useMemo,
} from "react";

import axios from "axios";

import GeneralContext from "./GeneralContext";

import { Tooltip, Grow } from "@mui/material";

import {
  BarChartOutlined,
  KeyboardArrowDown,
  KeyboardArrowUp,
  MoreHoriz,
} from "@mui/icons-material";

import {
  watchlist as defaultWatchlist,
} from "../data/data";

import { DoughnutChart } from "./DoughtnoutChart";

import useStockWebSocket from "../hooks/useStockWebSocket";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:3002",
});

const WatchList = () => {
  const [watchlist, setWatchlist] =
    useState(defaultWatchlist);

  const [loading, setLoading] =
    useState(true);

  // ----------------------------------------
  // Convert UI symbols to Yahoo symbols
  // ----------------------------------------

  const yahooSymbols = useMemo(() => {
    return defaultWatchlist.map((stock) => {
      if (
        stock.name.endsWith(".NS") ||
        stock.name.endsWith(".BO")
      ) {
        return stock.name;
      }

      return `${stock.name}.NS`;
    });
  }, []);

  // ----------------------------------------
  // WebSocket
  // ----------------------------------------

  const {
    isConnected,
    prices,
  } = useStockWebSocket(yahooSymbols);

  // ----------------------------------------
  // Initial REST fetch
  // ----------------------------------------

  const fetchLiveData = async () => {
    try {
      const symbols =
        defaultWatchlist
          .map((stock) => stock.name)
          .join(",");

      const response =
        await api.get(
          `/api/stocks/batch?symbols=${encodeURIComponent(
            symbols
          )}`
        );

      const liveData =
        response.data || [];

      const updatedWatchlist =
        defaultWatchlist.map(
          (stock, index) => ({
            ...stock,
            ...liveData[index],
          })
        );

      setWatchlist(
        updatedWatchlist
      );

      setLoading(false);
    } catch (error) {
      console.error(
        "Error fetching initial stock data:",
        error
      );

      setLoading(false);
    }
  };

  // ----------------------------------------
  // Fetch initial data only
  // ----------------------------------------

  useEffect(() => {
    fetchLiveData();
  }, []);

  // ----------------------------------------
  // Apply WebSocket price updates
  // ----------------------------------------

  useEffect(() => {
    if (
      !prices ||
      Object.keys(prices).length === 0
    ) {
      return;
    }

    setWatchlist(
      (currentWatchlist) =>
        currentWatchlist.map(
          (stock) => {
            const yahooSymbol =
              stock.name.endsWith(".NS") ||
              stock.name.endsWith(".BO")
                ? stock.name
                : `${stock.name}.NS`;

            const liveStock =
              prices[yahooSymbol];

            if (!liveStock) {
              return stock;
            }

            return {
              ...stock,
              ...liveStock,
            };
          }
        )
    );
  }, [prices]);

  // ----------------------------------------
  // Doughnut chart data
  // ----------------------------------------

  const labels =
    watchlist.map(
      (stock) => stock.name
    );

  const data = {
    labels,

    datasets: [
      {
        label: "Price",

        data: watchlist.map(
          (stock) => stock.price
        ),

        backgroundColor: [
          "rgba(255, 99, 132, 0.5)",
          "rgba(54, 162, 235, 0.5)",
          "rgba(255, 206, 86, 0.5)",
          "rgba(75, 192, 192, 0.5)",
          "rgba(153, 102, 255, 0.5)",
          "rgba(255, 159, 64, 0.5)",
        ],

        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)",
        ],

        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="watchlist-container">

      <div className="search-container">

        <input
          type="text"
          name="search"
          id="search"
          placeholder="Search eg:infy, bse, nifty fut weekly, gold mcx"
          className="search"
        />

        <span className="counts">

          {watchlist.length} / 50

          {loading && " 🔄 "}

          {!loading && (
            <span
              style={{
                marginLeft: "8px",
                fontSize: "12px",
              }}
            >
              {isConnected
                ? "🟢 LIVE"
                : "🔴 OFFLINE"}
            </span>
          )}

        </span>

      </div>

      <ul className="list">

        {watchlist.map(
          (stock, index) => {

            return (
              <WatchListItem
                stock={stock}
                key={index}
              />
            );

          }
        )}

      </ul>

      <DoughnutChart
        data={data}
      />

    </div>
  );
};

export default WatchList;

// ======================================================
// WATCHLIST ITEM
// ======================================================

const WatchListItem = ({
  stock,
}) => {

  const [
    showWatchlistActions,
    setShowWatchlistActions,
  ] = useState(false);

  const handleMouseEnter = () => {
    setShowWatchlistActions(
      true
    );
  };

  const handleMouseLeave = () => {
    setShowWatchlistActions(
      false
    );
  };

  return (
    <li
      onMouseEnter={
        handleMouseEnter
      }
      onMouseLeave={
        handleMouseLeave
      }
    >

      <div className="item">

        <p
          className={
            stock.isDown
              ? "down"
              : "up"
          }
        >
          {stock.name}
        </p>

        <div className="itemInfo">

          <span className="percent">
            {stock.percent}
          </span>

          {stock.isDown ? (
            <KeyboardArrowDown
              className="down"
            />
          ) : (
            <KeyboardArrowUp
              className="down"
            />
          )}

          <span className="price">
            {stock.price}
          </span>

        </div>

      </div>

      {showWatchlistActions && (
        <WatchListActions
          uid={stock.name}
        />
      )}

    </li>
  );
};

// ======================================================
// WATCHLIST ACTIONS
// ======================================================

const WatchListActions = ({
  uid,
}) => {

  const generalContext =
    useContext(
      GeneralContext
    );

  const handleBuyClick = () => {
    generalContext.openBuyWindow(
      uid
    );
  };

  const handleSellClick = () => {
    generalContext.openSellWindow(
      uid
    );
  };

  return (
    <span className="actions">

      <span>

        <Tooltip
          title="Buy (B)"
          placement="top"
          arrow
          TransitionComponent={Grow}
          onClick={
            handleBuyClick
          }
        >
          <button className="buy">
            Buy
          </button>
        </Tooltip>

        <Tooltip
          title="Sell (S)"
          placement="top"
          arrow
          TransitionComponent={Grow}
          onClick={
            handleSellClick
          }
        >
          <button className="sell">
            Sell
          </button>
        </Tooltip>

        <Tooltip
          title="Analytics (A)"
          placement="top"
          arrow
          TransitionComponent={Grow}
        >
          <button className="action">
            <BarChartOutlined className="icon" />
          </button>
        </Tooltip>

        <Tooltip
          title="More"
          placement="top"
          arrow
          TransitionComponent={Grow}
        >
          <button className="action">
            <MoreHoriz className="icon" />
          </button>
        </Tooltip>

      </span>

    </span>
  );
};