import React from "react";
import "../../App.css";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();
  const handleSignup = () => navigate("/register");
  return (
    <section className="hero">
      <div className="container text-center">
        <img
          src="/images/homeHero.png"
          alt="Home"
          className="hero-img"
        />
        <h1>Invest in everything</h1>
        <p>
          Online platform to invest in stocks, derivatives, mutual funds, and more.
        </p>
        <button className="btn-primary" onClick={handleSignup}>Sign up now</button>
      </div>
    </section>
  );
};

export default Hero;
