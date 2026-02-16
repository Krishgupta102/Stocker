import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import GeneralContext from './GeneralContext';
import { KeyboardArrowUp, KeyboardArrowDown, Close } from '@mui/icons-material';
import './StockAnalytics.css';


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002',
});

const StockAnalytics = () => {
  const { isAnalyticsOpen, analyticsStock, closeAnalytics } = useContext(GeneralContext);
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAnalyticsOpen && analyticsStock) {
      fetchStockData();
    }
  }, [isAnalyticsOpen, analyticsStock]);

  const fetchStockData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/stock/${analyticsStock}`);
      setStockData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stock analytics:', err);
      setError('Failed to load stock data');
      setLoading(false);
    }
  };

  if (!isAnalyticsOpen) return null;

  return (
    <div className="analytics-overlay" onClick={closeAnalytics}>
      <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <h2>Stock Analytics</h2>
          <button className="close-btn" onClick={closeAnalytics}>
            <Close />
          </button>
        </div>

        {loading && (
          <div className="analytics-loading">
            <div className="spinner"></div>
            <p>Loading stock data...</p>
          </div>
        )}

        {error && (
          <div className="analytics-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && stockData && (
          <div className="analytics-content">
            <div className="stock-header">
              <div className="stock-name-section">
                <h3>{stockData.name}</h3>
                <span className="stock-symbol">{analyticsStock}</span>
              </div>
              <div className="stock-price-section">
                <h1 className="current-price">₹{stockData.price.toFixed(2)}</h1>
                <div className={`price-change ${stockData.isDown ? 'down' : 'up'}`}>
                  {stockData.isDown ? <KeyboardArrowDown /> : <KeyboardArrowUp />}
                  <span>{stockData.percent}</span>
                  <span className="change-value">
                    ({stockData.isDown ? '' : '+'}₹{stockData.change.toFixed(2)})
                  </span>
                </div>
              </div>
            </div>

            <div className="analytics-metrics">
              <div className="metric-card">
                <p className="metric-label">Day High</p>
                <p className="metric-value">₹{stockData.dayHigh.toFixed(2)}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Day Low</p>
                <p className="metric-value">₹{stockData.dayLow.toFixed(2)}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Previous Close</p>
                <p className="metric-value">₹{stockData.previousClose.toFixed(2)}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Change</p>
                <p className={`metric-value ${stockData.isDown ? 'down' : 'up'}`}>
                  {stockData.isDown ? '' : '+'}₹{stockData.change.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="analytics-info">
              <p className="info-text">
                <strong>Market Status:</strong> Live data from Yahoo Finance
              </p>
              <p className="info-text">
                <strong>Last Updated:</strong> {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockAnalytics;
