import { Routes, Route, Link } from "react-router-dom";

import Home from "./pages/Home";
import Feedback from "./pages/Feedback";
import Dashboard from "./pages/Dashboard";
import Insights from "./pages/Insights";
import About from "./pages/About";

import "./App.css";

function App() {
  return (
    <div className="app">

      {/* Navigation Bar */}
      <nav className="navbar">

        <Link to="/" className="logo">
          CustomerIQ
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/feedback">Feedback</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/insights">Insights</Link>
          <Link to="/about">About</Link>
        </div>

      </nav>

      {/* Pages */}
      <Routes>

        <Route path="/" element={<Home />} />

        <Route
          path="/feedback"
          element={<Feedback />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/insights"
          element={<Insights />}
        />

        <Route
          path="/about"
          element={<About />}
        />

      </Routes>

    </div>
  );
}

export default App;