import { useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [role, setRole] = useState("instructor"); // 'admin' or 'instructor'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault();

    const endpoint =
      role === "admin"
        ? `${import.meta.env.VITE_BACKEND_URL}/api/admin/login`
        : `${import.meta.env.VITE_BACKEND_URL}/api/instructor/login`;

    try {
      const { data } = await axios.post(endpoint, { email, password });

      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", role);
        toast.success(`${role.toUpperCase()} Login Successful!`);
        role === "admin"? navigate('/AdmDashboard') : navigate('/InsDashboard')
      } else {
        toast.error(data.message || "Invalid credentials");
      }
    } catch (error) {
      toast.error("Server error");
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <h2 className="text-2xl font-semibold text-center mb-4">Login</h2>

        {/* Role Toggle */}
        <div className="flex justify-center mb 4">
          <button
            onClick={() => setRole("instructor")}
            className={`px-4 py-2 rounded-l-lg ${
              role === "instructor" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Instructor
          </button>
          <button
            onClick={() => setRole("admin")}
            className={`px-4 py-2 rounded-r-lg ${
              role === "admin" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Login as {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </form>
      </div>

      <ToastContainer />
    </div>
  );
};

export default Login;
