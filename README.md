# 📈 Stocker

A full-stack stock trading simulation platform built with the MERN stack. Stocker allows users to monitor stock prices, simulate buying and selling stocks, manage holdings and positions, and track portfolio performance.

The project is designed as a paper-trading platform for learning and experimenting with stock market workflows without using real money.

---

## 🚀 Features

### 📊 Stock Market Data

- Fetch live stock market data using Yahoo Finance
- Support for Indian NSE stocks
- Automatic conversion of stock symbols to Yahoo Finance format
- Batch stock data fetching
- Cached stock data to reduce unnecessary API requests
- Displays:
  - Current price
  - Price change
  - Percentage change
  - Previous close
  - Day high
  - Day low

### 💰 Paper Trading

- Buy stocks using simulated funds
- Sell stocks from existing holdings
- Quantity validation
- Price validation
- Prevent selling more shares than owned
- Automatic average purchase price calculation
- Order history

### 📦 Portfolio Management

- Track current holdings
- Track stock quantity
- Calculate average purchase price
- Calculate investment value
- Calculate current portfolio value
- Calculate profit/loss
- Display portfolio performance

### 📋 Orders

Users can view their trading history including:

- Instrument
- Quantity
- Price
- Order mode
- Order status
- Order timestamp

### 📈 Positions

Stocker maintains position information for simulated trades and portfolio tracking.

### 🖥️ Dashboard

The dashboard provides an overview of:

- Portfolio equity
- Available margin
- Holdings
- Current value
- Investment amount
- Profit/loss
- Portfolio statistics

### 🐳 Docker Support

The application can be run using Docker Compose with separate containers for:

- Backend
- Frontend
- Dashboard

### 🔄 CI Pipeline

GitHub Actions is used to automatically:

1. Install dependencies
2. Build the frontend
3. Build the dashboard
4. Build Docker containers

---

# 🏗️ Architecture

```text
                         ┌─────────────────────┐
                         │      Stocker        │
                         │   Trading Platform  │
                         └──────────┬──────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │   Frontend   │  │   Dashboard  │  │   Backend    │
          │   React.js   │  │   React.js   │  │ Node/Express │
          └──────────────┘  └──────────────┘  └───────┬──────┘
                                                       │
                         ┌─────────────────────────────┼───────────────┐
                         │                             │               │
                         ▼                             ▼               ▼
                  ┌──────────────┐             ┌──────────────┐ ┌─────────────┐
                  │ MongoDB Atlas│             │ Yahoo Finance│ │   REST API  │
                  │   Database   │             │ Market Data  │ │             │
                  └──────────────┘             └──────────────┘ └─────────────┘