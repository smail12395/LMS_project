import React, { useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [state, setState] = useState("Sign up"); // Sign up | Login
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const toggleState = () => {
    setState(state === "Sign up" ? "Login" : "Sign up");
    setName("");
    setEmail("");
    setPassword("");
    setPhoneNumber("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  

    try {
      if (state === "Sign up") {
        const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/register`, {
          name,
          email,
          password,
          phoneNumber,
        });

        if (data.success) {
          localStorage.setItem("token", data.token);
          toast.success("✅ Registered successfully!");
          navigate("/");
        } else {
          toast.error(data.message || "❌ Registration failed");
        }
      } else {
        const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/login`, {
          email,
          password,
        });

        if (data.success) {
          localStorage.setItem("token", data.token);
          toast.success("✅ Logged in successfully!");
          navigate("/summarize");
        } else {
          toast.error(data.message || "❌ Login failed");
        }
      }
    }catch (err) {
     console.error(err);
     const message =
       err.response?.data?.message ||
       err.message ||
       "⚠️ Server error. Try again later.";
   
     toast.error(message);
} finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          {state === "Sign up" ? "Create Account" : "Login"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {state === "Sign up" && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring focus:ring-blue-100 outline-none"
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring focus:ring-blue-100 outline-none"
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring focus:ring-blue-100 outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring focus:ring-blue-100 outline-none"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 font-semibold text-white rounded-xl shadow-md transition ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-primary hover:bg-blue-700"
            }`}
          >
            {loading
              ? state === "Sign up"
                ? "Registering..."
                : "Logging in..."
              : state === "Sign up"
              ? "Sign Up"
              : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          {state === "Sign up" ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            className="text-primary cursor-pointer font-semibold hover:underline"
            onClick={toggleState}
          >
            {state === "Sign up" ? "Click here to login" : "Click here to sign up"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
