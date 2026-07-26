"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sprout,
  User,
  Mail,
  Lock,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";

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
      {/* Register Card */}
      <div
        className="
          w-full
          max-w-xl
          rounded-[32px]
          border
          border-emerald-200/70
          bg-gradient-to-br
          from-white
          via-emerald-50
          to-green-100
          px-10
          py-10
          shadow-2xl
          shadow-emerald-950/30
        "
      >
        {/* Header */}
        <div className="text-center mb-7">
          <div
            className="
              w-18
              h-18
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
            <Sprout className="text-white" size={32} />
          </div>

          <h1 className="text-3xl font-bold text-emerald-950">
            Create Account
          </h1>

          <p className="text-base text-slate-600 mt-2">
            Join the AI Agricultural Advisory System
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRegister();
          }}
          className="space-y-4"
        >
          {/* Full Name */}
          <div className="relative">
            <User
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600"
            />

            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          {/* Email */}
          <div className="relative">
            <Mail
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600"
            />

            <input
              type="email"
              placeholder="Email Address"
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
              className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600"
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
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

          {/* Confirm Password */}
          <div className="relative">
            <Lock
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600"
            />

            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
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
              {showConfirmPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>

          {/* Language */}
          <div className="relative">
            <Globe
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600"
            />

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
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
                outline-none
                transition-all
                duration-200
                appearance-none
                focus:border-emerald-500
                focus:bg-white
                focus:ring-4
                focus:ring-emerald-500/10
              "
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी</option>
              <option value="Telugu">తెలుగు</option>
              <option value="Kannada">ಕನ್ನಡ</option>
            </select>
          </div>

          {/* Register Button */}
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
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-base text-slate-600 mt-7">
          Already have an account?{" "}
          <a
            href="/login"
            className="
              font-bold
              text-emerald-700
              transition
              hover:text-emerald-900
              hover:underline
            "
          >
            Login
          </a>
        </p>
      </div>
    </div>
  );
}