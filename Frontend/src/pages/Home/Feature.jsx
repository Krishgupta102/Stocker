import React from "react";
import "../../App.css";

const Feature = () => {
  const features = [
    {
      title: "Largest stock broker in India",
      text: "1.3+ crore Stocker clients contribute to over 15% of all retail order volumes in India."
    },
    {
      title: "Unbeatable pricing",
      text: "Free equity investments and flat ₹20 intraday and F&O trades."
    },
    {
      title: "Powerful platforms",
      text: "Sleek, modern trading platforms and apps for all your devices."
    },
    {
      title: "Customer-first always",
      text: "No gimmicks, no hidden charges, and a support team that actually listens."
    }
  ];

  return (
    <section className="features">
      <div className="container">
        <div className="grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Feature;