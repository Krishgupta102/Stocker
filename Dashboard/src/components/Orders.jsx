import React, { useState, useEffect } from "react";
import axios from "axios";
import "../App.css";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3002",
});

const Orders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async () => {
      try {
        const res = await api.get("/allOrders");
        if (mounted) setOrders(res.data || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
        if (mounted) setOrders([]);
      }
    };
    fetchOrders();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <h3 className="title">Orders ({orders.length})</h3>

      <div className="order-table">
        <table>
          <thead>
            <tr>
              <th>Instrument</th>
              <th>Qty.</th>
              <th>Price</th>
              <th>Mode</th>
              {/* <th>Status</th>
              <th>Order Time</th> */}
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={index}>
                <td>{order.name}</td>
                <td>{order.qty}</td>
                <td>{order.price.toFixed(2)}</td>
                <td>{order.mode}</td>
                {/* <td>{order.status || "Pending"}</td>
                <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "--"}</td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Orders;
