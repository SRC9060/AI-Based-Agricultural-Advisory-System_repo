"use client";

import { API_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/LanguageProvider";
import LanguageSelector from "@/components/LanguageSelector";
import { APP_LANGUAGES, LanguageCode } from "@/lib/languages";
import {
  Sprout,
  User,
  Mail,
  Lock,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import "@/app/auth.css";

export default function RegisterPage() {
  const router = useRouter();
  const {
    language: activeLanguage,
    setLanguage: setActiveLanguage,
    t,
  } = useTranslation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [preferredLanguage, setPreferredLanguage] =
    useState<LanguageCode>(activeLanguage);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPreferredLanguage(activeLanguage);
  }, [activeLanguage]);

  async function handleRegister() {
    if (password !== confirmPassword) {
      alert(t("Passwords do not match!"));
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          language: preferredLanguage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setActiveLanguage(preferredLanguage);
        alert(t(data.message));
        router.push("/login");
      } else {
        alert(t(data.detail || "Registration Failed"));
      }
    } catch (error) {
      console.error(error);
      alert(t("Cannot connect to backend"));
    } finally {
      setLoading(false);
    }
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
      {/* Register Card */}
      <div
        className="
          w-full
          max-w-xl
          rounded-[32px]
          border
          border-emerald-200/70
          auth-card
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

          <h1 className="text-3xl font-bold text-emerald-950 dark:text-emerald-300">
            {t("Create Account")}
          </h1>

          <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
            {t("Join the AI Agricultural Advisory System")}
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
              className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
            />

            <input
              type="text"
              placeholder={t("Full Name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          {/* Email */}
          <div className="relative">
            <Mail
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
            />

            <input
              type="email"
              placeholder={t("Email Address")}
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
              className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("Password")}
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

          {/* Confirm Password */}
          <div className="relative">
            <Lock
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
            />

            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("Confirm Password")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
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
              className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
            />

            <select
              aria-label={t("Preferred Language")}
              value={preferredLanguage}
              onChange={(e) => {
                const nextLanguage = e.target.value as LanguageCode;
                setPreferredLanguage(nextLanguage);
                setActiveLanguage(nextLanguage);
              }}
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
                outline-none
                transition-all
                duration-200
                appearance-none
                focus:border-emerald-500
                focus:bg-white
                dark:focus:bg-slate-800
                focus:ring-4
                focus:ring-emerald-500/10
              "
            >
              {APP_LANGUAGES.map((item) => (
                <option key={item.code} value={item.code} className="dark:bg-slate-900 dark:text-slate-100">
                  {item.nativeName}
                </option>
              ))}
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
            {loading ? t("Creating account...") : t("Register")}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-base text-slate-600 dark:text-slate-400 mt-7">
          {t("Already have an account?")}{" "}
          <a
            href="/login"
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
            {t("Login")}
          </a>
        </p>
      </div>
    </div>
  );
}
