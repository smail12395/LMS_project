import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");

    setToken(storedToken);
    setRole(storedRole);
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path
      ? "text-indigo-600 font-semibold"
      : "text-gray-700 hover:text-indigo-600";

  if (loading) {
    return (
      <div className="w-full h-16 flex items-center px-6 bg-white shadow-sm">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <nav className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span
              onClick={() => navigate("/")}
              className="text-2xl font-bold text-indigo-600 cursor-pointer"
            >
              ED AI
            </span>

            {role && (
              <span className="hidden sm:inline-block text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-600 font-medium">
                {role}
              </span>
            )}
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {!token ? (
              <Link to="/login" className={isActive("/login")}>
                Login
              </Link>
            ) : (
              <>
                <Link to="/" className={isActive("/")}>
                  Dashboard
                </Link>

                <Link to="/AddCource" className={isActive("/AddCource")}>
                  Add Course
                </Link>

                <Link to="/AllCources" className={isActive("/AllCources")}>
                  All Courses
                </Link>

                <button
                  onClick={logout}
                  className="ml-4 bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg transition"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-700 focus:outline-none"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="flex flex-col px-6 py-4 gap-4">
            {!token ? (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="text-gray-700 hover:text-indigo-600"
              >
                Login
              </Link>
            ) : (
              <>
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="text-gray-700 hover:text-indigo-600"
                >
                  Dashboard
                </Link>

                <Link
                  to="/AddCource"
                  onClick={() => setMenuOpen(false)}
                  className="text-gray-700 hover:text-indigo-600"
                >
                  Add Course
                </Link>

                <Link
                  to="/AllCources"
                  onClick={() => setMenuOpen(false)}
                  className="text-gray-700 hover:text-indigo-600"
                >
                  All Courses
                </Link>

                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-left"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
