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
      alert(t("Cannot connect to backend"));
    } finally {
      setLoading(false);
    }
  }

  if (checkingRememberedLogin) {
    return null;
  }

  return (
    <div
      className="
        relative
        min-h-screen
        flex
        items-center
        justify-center
        auth-page
        px-5
        py-10
      "
    >
      <div className="absolute top-5 right-5 z-50">
        <LanguageSelector variant="auth" />
      </div>
      {/* Login Card */}
      <div
        className="
          w-full
          max-w-lg
          rounded-[32px]
          border
          border-emerald-200/70
          auth-card
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

          <h1 className="text-3xl font-bold text-emerald-950 dark:text-emerald-300">
            {t("Welcome Back")}
          </h1>

          <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
            {t("Sign in to continue to your account")}
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
                dark:text-emerald-400
              "
            />

            <input
              type="email"
              placeholder={t("Enter your email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="
                w-full
                rounded-2xl
                border
                border-emerald-200
                dark:border-slate-700
                bg-white/80
                dark:bg-slate-800/80
                pl-14
                pr-5
                py-4
                text-base
                text-slate-800
                dark:text-slate-100
                placeholder:text-slate-400
                dark:placeholder:text-slate-500
                outline-none
                transition-all
                duration-200
                focus:border-emerald-500
                focus:bg-white
                dark:focus:bg-slate-800
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
                dark:text-emerald-400
              "
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("Enter your password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="
                w-full
                rounded-2xl
                border
                border-emerald-200
                dark:border-slate-700
                bg-white/80
                dark:bg-slate-800/80
                pl-14
                pr-14
                py-4
                text-base
                text-slate-800
                dark:text-slate-100
                placeholder:text-slate-400
                dark:placeholder:text-slate-500
                outline-none
                transition-all
                duration-200
                focus:border-emerald-500
                focus:bg-white
                dark:focus:bg-slate-800
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
                dark:text-slate-500
                transition
                hover:text-emerald-600
                dark:hover:text-emerald-400
              "
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />

            <label
              htmlFor="remember"
              className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              Remember Me
            </label>
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
                  ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed"
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
            {loading ? t("Signing in...") : t("Login")}
          </button>
        </form>

        {/* Register */}
        <p className="text-center text-base text-slate-600 dark:text-slate-400 mt-8">
          {t("Don't have an account?")}{" "}
          <a
            href="/register"
            className="
              font-bold
              text-emerald-700
              dark:text-emerald-400
              transition
              hover:text-emerald-900
              dark:hover:text-emerald-300
              hover:underline
            "
          >
            {t("Register")}
          </a>
        </p>
      </div>
    </div>
  );
}
