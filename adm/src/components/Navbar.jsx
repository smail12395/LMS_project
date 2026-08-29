import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import useInstructorLock from "../hooks/useInstructorLock";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { locked: instructorLocked } = useInstructorLock();

  // Re-read the auth state on every navigation so the menu reflects the
  // current role immediately after login/logout, without a full page refresh.
  // This keeps instructor vs admin items correct in both DB and Preview mode.
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");

    setToken(storedToken);
    setRole(storedRole);
    setLoading(false);
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path
      ? "text-emerald-600 font-semibold"
      : "text-slate-600 hover:text-emerald-600";

  if (loading) {
    return (
      <div className="w-full h-16 flex items-center px-6 bg-white shadow-sm">
        <span className="text-slate-400">Loading...</span>
      </div>
    );
  }

  const isAdmin = role === "admin";

  // When the instructor is on a course-scoped page (/AllCources/:courseId,
  // /VideoSeries/:courseId or /UsersAnswers/:courseId) we can build a
  // course-aware "Users Answers" link that passes the same courseId.
  const currentCourseId = (() => {
    const m = location.pathname.match(/^\/(?:AllCources|VideoSeries|UsersAnswers)\/([^/]+)/);
    return m ? m[1] : null;
  })();

  const isUsersAnswersActive =
    /^\/UsersAnswers\//.test(location.pathname) && currentCourseId;

  return (
    <nav className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span
              onClick={() => navigate(isAdmin ? "/ManageInstructors" : "/")}
              className="text-2xl font-bold text-emerald-600 cursor-pointer"
            >
              ED AI
            </span>

            {role && (
              <span className="hidden sm:inline-block text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
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
            ) : isAdmin ? (
              <>
                <Link to="/ManageInstructors" className={isActive("/ManageInstructors")}>
                  Manage Instructors
                </Link>
                <Link to="/PlatformSettings" className={isActive("/PlatformSettings")}>
                  Platform Settings
                </Link>
                <button
                  onClick={logout}
                  className="ml-4 bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/" className={isActive("/")}>
                  Dashboard
                </Link>
                <Link
                  to={instructorLocked ? "/payInstructor" : "/AddCource"}
                  className={
                    instructorLocked
                      ? "text-slate-400 hover:text-slate-500 inline-flex items-center gap-1"
                      : isActive("/AddCource")
                  }
                >
                  {instructorLocked && <LockClosedIcon className="h-3.5 w-3.5" />}
                  Add Course
                </Link>
                <Link to="/AllCources" className={isActive("/AllCources")}>
                  All Courses
                </Link>
                {currentCourseId && (
                  <Link
                    to={`/UsersAnswers/${currentCourseId}`}
                    className={
                      isUsersAnswersActive
                        ? "text-emerald-600 font-semibold"
                        : "text-slate-600 hover:text-emerald-600"
                    }
                  >
                    Users Answers
                  </Link>
                )}
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
                className="text-slate-600 hover:text-emerald-600"
              >
                Login
              </Link>
            ) : isAdmin ? (
              <>
                <Link
                  to="/ManageInstructors"
                  onClick={() => setMenuOpen(false)}
                  className="text-slate-600 hover:text-emerald-600"
                >
                  Manage Instructors
                </Link>
                <Link
                  to="/PlatformSettings"
                  onClick={() => setMenuOpen(false)}
                  className="text-slate-600 hover:text-emerald-600"
                >
                  Platform Settings
                </Link>
                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="text-slate-600 hover:text-emerald-600"
                >
                  Dashboard
                </Link>
                <Link
                  to={instructorLocked ? "/payInstructor" : "/AddCource"}
                  onClick={() => setMenuOpen(false)}
                  className={
                    instructorLocked
                      ? "text-slate-400 hover:text-slate-500 inline-flex items-center gap-1"
                      : "text-slate-600 hover:text-emerald-600"
                  }
                >
                  {instructorLocked && <LockClosedIcon className="h-3.5 w-3.5" />}
                  Add Course
                </Link>
                <Link
                  to="/AllCources"
                  onClick={() => setMenuOpen(false)}
                  className="text-slate-600 hover:text-emerald-600"
                >
                  All Courses
                </Link>
                {currentCourseId && (
                  <Link
                    to={`/UsersAnswers/${currentCourseId}`}
                    onClick={() => setMenuOpen(false)}
                    className={
                      isUsersAnswersActive
                        ? "text-emerald-600 font-semibold"
                        : "text-slate-600 hover:text-emerald-600"
                    }
                  >
                    Users Answers
                  </Link>
                )}
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
