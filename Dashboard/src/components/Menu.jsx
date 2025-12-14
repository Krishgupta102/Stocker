import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";   // make sure firebase.js exists in Dashboard/src
import { signOut, onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";
import "../App.css";

const Menu = () => {
  const [selectedMenu, setSelectedMenu] = useState(0);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // listen to login/logout state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // show displayName if available, else fallback to email
        setUserName(user.displayName || user.email);
      } else {
        setUserName("");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleMenuClick = (index) => {
    setSelectedMenu(index);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully", { position: "top-center" });
      window.location.href = "http://localhost:5173/"; // redirect to login
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out", { position: "bottom-center" });
    }
  };

  return (
    <div className="menu-container">
      <img src="logo.png" alt="logo" className="logo-img" style={{ width: "50px" }}/>

      <div className="menus">
        <ul>
          {["Dashboard", "Orders", "Holdings", "Positions"].map( //"Funds", "Apps"
            (item, index) => (
              <li key={index}>
                <Link
                  style={{ textDecoration: "none" }}
                  to={`/${item.toLowerCase() === "dashboard" ? "" : item.toLowerCase()}`}
                  onClick={() => handleMenuClick(index)}
                >
                  <p className={selectedMenu === index ? "menu selected" : "menu"}>
                    {item}
                  </p>
                </Link>
              </li>
            )
          )}
        </ul>
        <hr />

        {/* ✅ Profile Section */}
        <div className="profile">
          <div className="avatar">
            {userName ? userName[0].toUpperCase() : "?"}
          </div>
          <p className="username">
            {userName ? userName : "Guest"}
          </p>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>
    </div>
  );
};

export default Menu;
