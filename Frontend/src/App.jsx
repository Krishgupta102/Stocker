import React, { useEffect } from "react";
// import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/login";
import SignUp from "./pages/register";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Profile from "./pages/profile";
import { useState } from "react";
import { auth } from "./pages/firebase";
import HomePage from "./pages/Home/HomePage";
import Navbar from "./pages/Navbar";
import Footer from "./pages/Footer";
import ProductsPage from "./pages/products/ProductsPage";
import PricingPage from "./pages/pricing/PricingPage";
import AboutPage from "./pages/About/AboutPage";
import SupportPage from "./pages/Support/SupportPage";

function App() {
  const [user, setUser] = useState();
  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      setUser(user);
    });
  });
  return (
    <Router>
      <div className="App">
        <div className="auth-wrapper">
          <div className="auth-inner">
            <Navbar/>
            <Routes>
              {/* <Route
                path="/"
                element={user ? <Navigate to="/profile" /> : <Login />}
              /> */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<SignUp />} />
              {/* <Route path="/profile" element={<Profile />} /> */}
              <Route path="/products" element={<ProductsPage/>} />
              <Route path="/pricing" element={<PricingPage/>} />
              <Route path="/about" element={<AboutPage/>} />
              <Route path="/support" element={<SupportPage/>} />
              <Route path="*" element={<h1>404 Not Found</h1>} />
            </Routes>
            <ToastContainer />
            <Footer/>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;