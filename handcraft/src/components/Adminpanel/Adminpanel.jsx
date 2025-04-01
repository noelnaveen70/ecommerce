import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaChartBar,
  FaExclamationTriangle,
  FaSignOutAlt,
  FaShoppingCart,
  FaComments,
  FaDollarSign,
  FaMoon,
  FaSun,
} from "react-icons/fa";

const AdminDashboard = () => {
  const [isSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div
      className={`flex min-h-screen transition-all duration-500 ${
        theme === "dark"
          ? "bg-black text-gray-300"
          : "bg-[rgba(66,99,235,0.4)] text-gray-900"
      }`}
    >
      {/* Sidebar */}
      <div
        className={`p-5 w-64 ${
          theme === "dark"
            ? "bg-black text-gray-300"
            : "bg-[rgba(92, 92, 93, 0.4)] text-black"
        } min-h-screen transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-64"
        } md:translate-x-0`}
      >
        <h2 className="text-3xl font-extrabold mb-8 text-center">Admin Panel</h2>
        <ul className="space-y-4">
          <li className="p-4 flex items-center hover:bg-blue-600 rounded-lg cursor-pointer transition-all duration-300">
            <Link to="/User" className="flex items-center w-full">
              <FaUsers className="mr-3 text-xl" /> User & Seller Management
            </Link>
          </li>
          <li className="p-4 flex items-center hover:bg-green-600 rounded-lg cursor-pointer transition-all duration-300">
            <Link to="/analytics" className="flex items-center w-full">
              <FaChartBar className="mr-3 text-xl" /> Platform Analytics
            </Link>
          </li>
          <li className="p-4 flex items-center hover:bg-yellow-600 rounded-lg cursor-pointer transition-all duration-300">
            <Link to="/disputes" className="flex items-center w-full">
              <FaExclamationTriangle className="mr-3 text-xl" /> Dispute & Reports
            </Link>
          </li>
          <li
            className="p-4 flex items-center hover:bg-red-600 rounded-lg cursor-pointer transition-all duration-300 text-white bg-red-500"
            onClick={handleLogout}
          >
            <FaSignOutAlt className="mr-3 text-xl" /> Logout
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-8">
          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div
              className={`p-6 shadow-lg rounded-lg flex items-center justify-between border-l-4 border-blue-500 ${
                theme === "dark" ? "bg-gray-800 text-gray-300" : "bg-white"
              }`}
            >
              <div>
                <h3 className="text-lg font-semibold">User Management</h3>
                <p className="text-sm">Manage all users and sellers</p>
              </div>
              <FaUsers className="text-blue-500 text-3xl" />
            </div>
            <div
              className={`p-6 shadow-lg rounded-lg flex items-center justify-between border-l-4 border-green-500 ${
                theme === "dark" ? "bg-gray-800 text-gray-300" : "bg-white"
              }`}
            >
              <div>
                <h3 className="text-lg font-semibold">Sales Analytics</h3>
                <p className="text-sm">View platform sales metrics</p>
              </div>
              <FaShoppingCart className="text-green-500 text-3xl" />
            </div>
            <div
              className={`p-6 shadow-lg rounded-lg flex items-center justify-between border-l-4 border-yellow-500 ${
                theme === "dark" ? "bg-gray-800 text-gray-300" : "bg-white"
              }`}
            >
              <div>
                <h3 className="text-lg font-semibold">Dispute Resolution</h3>
                <p className="text-sm">Handle customer disputes</p>
              </div>
              <FaExclamationTriangle className="text-yellow-500 text-3xl" />
            </div>
            <div
              className={`p-6 shadow-lg rounded-lg flex items-center justify-between border-l-4 border-purple-500 ${
                theme === "dark" ? "bg-gray-800 text-gray-300" : "bg-white"
              }`}
            >
              <div>
                <h3 className="text-lg font-semibold">Revenue Reports</h3>
                <p className="text-sm">View platform earnings</p>
              </div>
              <FaDollarSign className="text-purple-500 text-3xl" />
            </div>
          </div>

          {/* Features Section */}
          <div
            className={`p-6 shadow-lg rounded-lg ${
              theme === "dark" ? "bg-gray-800 text-gray-300" : "bg-white"
            }`}
          >
            <h3 className="text-xl font-bold mb-4">Admin Panel Features</h3>
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h4 className="font-semibold text-lg">1. User & Seller Management</h4>
                <p className="text-sm">
                  Manage all registered users and sellers, including approval, suspension, and account verification.
                </p>
              </div>
              <div className="border-b pb-4">
                <h4 className="font-semibold text-lg">2. Platform Analytics</h4>
                <p className="text-sm">
                  View detailed analytics about user activity, sales trends, and platform growth metrics.
                </p>
              </div>
              <div className="border-b pb-4">
                <h4 className="font-semibold text-lg">3. Dispute & Reports</h4>
                <p className="text-sm">
                  Handle customer disputes, review reports, and take appropriate actions to maintain platform integrity.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg">4. Content Moderation</h4>
                <p className="text-sm">
                  Monitor and moderate product listings, reviews, and user-generated content.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;