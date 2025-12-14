import React from "react";
import "../../App.css";

const Award = () => {
  return (
    <section className="award-section">
      <div className="award-container">
        {/* Left Column */}
        <div className="award-left">
          <h2>Trust with confidence</h2>

          <div className="award-item">
            <h4>Customer-first always</h4>
            <p>
              That's why 1.6+ crore customers trust Stocker with ~ ₹6 lakh crores
              of equity investments and contribute to 15% of daily retail exchange
              volumes in India.
            </p>
          </div>

          <div className="award-item">
            <h4>No spam or gimmicks</h4>
            <p>
              Transparent pricing, no hidden charges, and no forced product sales.
            </p>
          </div>

          <div className="award-item">
            <h4>The Stocker universe</h4>
            <p>
              A suite of powerful trading platforms, investment apps, and partner
              products for your financial journey.
            </p>
          </div>

          <div className="award-item">
            <h4>Do better with money</h4>
            <p>
              Educational initiatives like Varsity and TradingQnA help you improve
              financial literacy and make smarter investment choices.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="award-right">
          <img
            src="/images/ecosystem.png"
            alt="ecosystem"
            className="award-img"
          />

          <div className="award-links">
            <a href="#" className="award-link">
              Explore our Products
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="arrow-icon"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 
                .708-.708l4 4a.5.5 0 0 1 0 .708l-4 
                4a.5.5 0 0 1-.708-.708L13.293 
                8.5H1.5A.5.5 0 0 1 1 8z"/>
              </svg>
            </a>

            <a href="#" className="award-link">
              Try Kite demo
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="arrow-icon"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 
                .708-.708l4 4a.5.5 0 0 1 0 .708l-4 
                4a.5.5 0 0 1-.708-.708L13.293 
                8.5H1.5A.5.5 0 0 1 1 8z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="award-logos">
        <img src="/images/pressLogos.png" alt="Press Logos" />
      </div>
    </section>
  );
};

export default Award;
