"use client";

import { API_URL, apiFetch } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sprout, Mail, Lock, Eye, EyeOff } from "lucide-react";
import {
  getLoginRedirectPath,
  getRememberedSession,
  saveLoginSession,
} from "@/lib/session";
import { useTranslation } from "@/components/LanguageProvider";
import LanguageSelector from "@/components/LanguageSelector";
import { saveAuthenticatedSession } from "@/lib/auth";
import { normalizeLanguage } from "@/lib/languages";
import "@/app/auth.css";

export default function LoginPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [checkingRememberedLogin, setCheckingRememberedLogin] = useState(true);

  useEffect(() => {
    try {
      const rememberedSession = getRememberedSession();

      if (rememberedSession) {
        router.replace(getLoginRedirectPath(rememberedSession));
      }
    } catch (error) {
      console.error("Error checking remembered session:", error);
    } finally {
      setCheckingRememberedLogin(false);
    }
  }, [router]);

  async function handleLogin() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      alert(t("Enter a Valid Mail Address"));
      return;
    }
    if (password.length < 8) {
      alert(t("Invalid Credentials"));
      return;
    }
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
      if (response.ok && data.access_token && data.user) {
        saveAuthenticatedSession(data.access_token, rememberMe);
        setLanguage(normalizeLanguage(data.user.language));
        const statusResponse = await apiFetch(
          `${API_URL}/profile-status/${data.user.id}`
        );
        const statusData = await statusResponse.json();
        const profileCompleted = Boolean(statusData.profile_completed);
        saveLoginSession(
          {
            userId: data.user.id,
            userName: data.user.name,
            userEmail: data.user.email,
            profileCompleted,
          },
          rememberMe
        );
        console.log("Profile Status:", statusData);
        router.push(profileCompleted ? "/dashboard" : "/profile");
      } else {
        alert(t(data.detail || data.message || "Invalid Credentials"));
      }
    } catch (error) {
      console.error(error);
      alert(t("Cannot Connect to Backend"));
    } finally {
      setLoading(false);
    }
  }

  if (checkingRememberedLogin) {
    return null;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center auth-page px-5 py-12">
      <div className="absolute top-6 right-6 z-50">
        <LanguageSelector variant="auth" />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[520px] auth-card p-10 sm:p-12 text-white shadow-2xl">
        {/* Header */}
        <div className="text-center mb-9">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#66BB6A] to-[#2E7D32] flex items-center justify-center mb-6 shadow-xl shadow-emerald-950/60">
            <Sprout className="text-white" size={40} />
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl lg:text-[42px] font-bold text-white tracking-tight leading-tight">
            {t("Welcome Back")}
          </h1>

          <p className="font-body text-base text-slate-300 mt-3">
            {t("Sign in to continue to your account")}
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-6"
        >
          {/* Email */}
          <div className="relative">
            <Mail
              size={22}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#66BB6A]"
            />

            <input
              type="email"
              placeholder={t("Enter your email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full auth-input pl-14 pr-5 text-base sm:text-lg text-white placeholder:text-slate-400 outline-none"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock
              size={22}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#66BB6A]"
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("Enter your password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full auth-input pl-14 pr-14 text-base sm:text-lg text-white placeholder:text-slate-400 outline-none"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#66BB6A] transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4.5 w-4.5 accent-[#66BB6A] rounded cursor-pointer"
            />

            <label
              htmlFor="remember"
              className="text-base font-body text-slate-300 cursor-pointer select-none"
            >
              Remember Me
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full font-heading font-bold text-lg text-white rounded-full auth-btn transition-all duration-300 mt-2 ${loading ? "opacity-60 cursor-not-allowed" : ""
              }`}
          >
            {loading ? t("Signing in...") : t("Login")}
          </button>
        </form>

        {/* Register */}
        <p className="font-body text-center text-base text-slate-300 mt-8">
          {t("Don't have an account?")}{" "}
          <a
            href="/register"
            className="font-bold text-[#66BB6A] hover:underline transition-colors ml-1"
          >
            {t("Register")}
          </a>
        </p>
      </div>
    </div>
  );
}
