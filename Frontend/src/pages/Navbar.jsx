import React, { useState } from "react";
import "./../App.css";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="brand">
          <img
            src="logo.png"
            alt="Zerodha"
            height="30"
          />
        </Link>
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
        <ul className={`nav-links ${menuOpen ? "active" : ""}`}>
          <li><Link to="/register">Signup</Link></li>
          <li><Link to="/About">About</Link></li>
          <li><Link to="/Products">Products</Link></li>
          <li><Link to="/Pricing">Pricing</Link></li>
          <li><Link to="/Support">Support</Link></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
