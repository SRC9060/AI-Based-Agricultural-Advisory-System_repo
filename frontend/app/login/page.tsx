"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sprout, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);

      const response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();
      console.log(data);

      if (data.message === "Login Successful") {

        localStorage.setItem("user_id", data.user.id);
        localStorage.setItem("user_name", data.user.name);
        localStorage.setItem("user_email", data.user.email);

        const statusResponse = await fetch(
          `http://127.0.0.1:8000/profile-status/${data.user.id}`
        );
        const statusData = await statusResponse.json();
        console.log("Profile Status:", statusData);

        if (statusData.profile_completed) {
          router.push("/dashboard");
        } else {
          router.push("/profile");
        }

      } else {
        alert(data.message);
      }

    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lime-300 via-green-300 to-green-400 px-4">

  <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-green-900/20 border border-white/60 p-9">

    <div className="text-center mb-7">

      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-green-300 to-emerald-400 flex items-center justify-center mb-4 shadow-md shadow-green-400/30">
        <Sprout className="text-white" size={26} />
      </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Sign in to continue to your account
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-4"
        >

          <div className="relative">
            <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-200 bg-slate-50 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:bg-white transition"
            />
          </div>

          <div className="relative">
            <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-slate-200 bg-slate-50 rounded-xl pl-11 pr-11 py-3 text-sm text-slate-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 ${
              loading
                ? "bg-gray-400 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-green-400 to-emerald-500 hover:shadow-xl hover:-translate-y-0.5 shadow-green-400/30"
            }`}
          >
            {loading ? "Signing in..." : "Login"}
          </button>

        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don&apos;t have an account?{" "}
          <a href="/register" className="font-semibold text-green-600 hover:underline">
            Register
          </a>
        </p>

      </div>

    </div>
  );
}