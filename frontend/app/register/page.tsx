"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sprout, User, Mail, Lock, Globe, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [language, setLanguage] = useState("English");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://127.0.0.1:8000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          language,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        router.push("/login");
      } else {
        alert("Registration Failed");
      }
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lime-300 via-green-300 to-green-400 px-4 py-10">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-green-900/20 border border-white/60 p-9">

        <div className="text-center mb-7">

          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-green-300 to-emerald-400 flex items-center justify-center mb-4 shadow-md shadow-green-400/30">
            <Sprout className="text-white" size={26} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Create Account
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Join the AI Agricultural Advisory System
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRegister();
          }}
          className="space-y-4"
        >

          <div className="relative">
            <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-slate-200 bg-slate-50 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:bg-white transition"
            />
          </div>

          <div className="relative">
            <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              placeholder="Email Address"
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
              placeholder="Password"
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

          <div className="relative">
            <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-slate-200 bg-slate-50 rounded-xl pl-11 pr-11 py-3 text-sm text-slate-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <div className="relative">
            <Globe size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:bg-white transition appearance-none"
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी</option>
              <option value="Telugu">తెలుగు</option>
              <option value="Kannada">ಕನ್ನಡ</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 ${
              loading
                ? "bg-gray-400 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-green-300 to-emerald-400 hover:shadow-xl hover:-translate-y-0.5 shadow-green-400/30"
            }`}
          >
            {loading ? "Creating account..." : "Register"}
          </button>

        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-green-600 hover:underline">
            Login
          </a>
        </p>

      </div>

    </div>
  );
}