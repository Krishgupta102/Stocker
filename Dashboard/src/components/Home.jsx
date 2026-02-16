import React from 'react'
import TopBar from './TopBar'
import Dashboard from './Dashboard'
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

const Home = () => {
  return (
    <>
        <TopBar/>
        <Dashboard/>
        <ToastContainer />
    </>
  )
}

export default Home