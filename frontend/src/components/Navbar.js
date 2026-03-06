// src/components/Navbar.js
import React from "react";
import { NavLink } from "react-router-dom";
import '../App.css';

const Navbar = () => {
  return (
    <nav className="navbar-container relative">
      <div className="neon-line top-line"></div>

      <div className="navbar-inner max-w-7xl mx-auto px-6 flex justify-center">
        <ul className="navbar-ul">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "nav-active" : "nav-link"
              }
            >
              Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/sign-to-text"
              className={({ isActive }) =>
                isActive ? "nav-active" : "nav-link"
              }
            >
              Sign ➜ Text
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/text-to-sign"
              className={({ isActive }) =>
                isActive ? "nav-active" : "nav-link"
              }
            >
              Text ➜ Sign
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                isActive ? "nav-active" : "nav-link"
              }
            >
              Login
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/register"
              className={({ isActive }) =>
                isActive ? "nav-active" : "nav-link"
              }
            >
              Register
            </NavLink>
          </li>
        </ul>
      </div>

      <div className="neon-line bottom-line"></div>
    </nav>
  );
};

export default Navbar;
