"use client";

import { API_URL } from "@/lib/api";

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

      const response = await fetch(`${API_URL}/login`, {
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
          `${API_URL}/profile-status/${data.user.id}`
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
    <div
      className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-gradient-to-br
        from-emerald-900
        via-green-700
        to-emerald-500
        px-5
        py-10
      "
    >
      {/* Login Card */}
      <div
        className="
          w-full
          max-w-lg
          rounded-[32px]
          border
          border-emerald-200/70
          bg-gradient-to-br
          from-white
          via-emerald-50
          to-green-100
          px-10
          py-12
          shadow-2xl
          shadow-emerald-950/30
        "
      >
        {/* Header */}
        <div className="text-center mb-9">
          {/* Logo */}
          <div
            className="
              w-20
              h-20
              mx-auto
              rounded-3xl
              bg-gradient-to-br
              from-emerald-400
              to-green-600
              flex
              items-center
              justify-center
              mb-5
              shadow-xl
              shadow-emerald-500/30
            "
          >
            <Sprout className="text-white" size={36} />
          </div>

          <h1 className="text-3xl font-bold text-emerald-950">
            Welcome Back
          </h1>

          <p className="text-base text-slate-600 mt-2">
            Sign in to continue to your account
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-5"
        >
          {/* Email */}
          <div className="relative">
            <Mail
              size={20}
              className="
                absolute
                left-5
                top-1/2
                -translate-y-1/2
                text-emerald-600
              "
            />

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="
                w-full
                rounded-2xl
                border
                border-emerald-200
                bg-white/80
                pl-14
                pr-5
                py-4
                text-base
                text-slate-800
                placeholder:text-slate-400
                outline-none
                transition-all
                duration-200
                focus:border-emerald-500
                focus:bg-white
                focus:ring-4
                focus:ring-emerald-500/10
              "
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock
              size={20}
              className="
                absolute
                left-5
                top-1/2
                -translate-y-1/2
                text-emerald-600
              "
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="
                w-full
                rounded-2xl
                border
                border-emerald-200
                bg-white/80
                pl-14
                pr-14
                py-4
                text-base
                text-slate-800
                placeholder:text-slate-400
                outline-none
                transition-all
                duration-200
                focus:border-emerald-500
                focus:bg-white
                focus:ring-4
                focus:ring-emerald-500/10
              "
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="
                absolute
                right-5
                top-1/2
                -translate-y-1/2
                text-slate-400
                transition
                hover:text-emerald-600
              "
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className={`
              w-full
              rounded-2xl
              py-4
              text-lg
              font-semibold
              text-white
              transition-all
              duration-300
              ${
                loading
                  ? "bg-slate-400 cursor-not-allowed"
                  : `
                    bg-gradient-to-r
                    from-emerald-600
                    to-green-500
                    shadow-lg
                    shadow-emerald-600/25
                    hover:from-emerald-700
                    hover:to-green-600
                    hover:-translate-y-0.5
                    hover:shadow-xl
                  `
              }
            `}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Register */}
        <p className="text-center text-base text-slate-600 mt-8">
          Don&apos;t have an account?{" "}
          <a
            href="/register"
            className="
              font-bold
              text-emerald-700
              transition
              hover:text-emerald-900
              hover:underline
            "
          >
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
