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
    useState(activeLanguage);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPreferredLanguage(activeLanguage);
  }, [activeLanguage]);

  async function handleRegister() {
    if (password.length < 8) {
      alert(t("Password Must be at least 8 Characters Long"));
      return;
    }
    if (password !== confirmPassword) {
      alert(t("Passwords Do Not Match"));
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
        const detail = data.detail;
        if (typeof detail === "string") {
          alert(t(detail));
          return;
        }
        if (Array.isArray(detail)) {
          const errors = detail.map((error) => {
            const field = error.loc?.[error.loc.length - 1];
            const message = error.msg || "Invalid Value";
            if (
              field === "password" &&
              (
                error.type === "string_too_short" ||
                message.toLowerCase().includes("8")
              )
            ) {
              return t("Password Must be at least 8 Characters Long");
            }
            if (
              field === "name" &&
              error.type === "string_too_short"
            ) {
              return t("Name Must be at least 2 Characters Long");
            }
            if (field === "email") {
              return t("Enter a Valid Mail Address");
            }
            return message;
          });
          alert(errors.join("\n"));
          return;
        }
        alert(t("Registration Failed"));
      }
    } catch (error) {
      console.error(error);
      alert(t("Cannot Connect to Backend"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center auth-page px-5 py-12">
      <div className="absolute top-6 right-6 z-50">
        <LanguageSelector variant="auth" />
      </div>
      {/* Register Card */}
      <div className="w-full max-w-[520px] auth-card p-10 sm:p-12 text-white shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#66BB6A] to-[#2E7D32] flex items-center justify-center mb-6 shadow-xl shadow-emerald-950/60">
            <Sprout className="text-white" size={40} />
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl lg:text-[42px] font-bold text-white tracking-tight leading-tight">
            {t("Create Account")}
          </h1>

          <p className="font-body text-base text-slate-300 mt-3">
            {t("Join the AI Agricultural Advisory System")}
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRegister();
          }}
          className="space-y-5"
        >
          {/* Full Name */}
          <div className="relative">
            <User
              size={22}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#66BB6A]"
            />

            <input
              type="text"
              placeholder={t("Full Name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full auth-input pl-14 pr-5 text-base sm:text-lg text-white placeholder:text-slate-400 outline-none"
            />
          </div>

          {/* Email */}
          <div className="relative">
            <Mail
              size={22}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#66BB6A]"
            />

            <input
              type="email"
              placeholder={t("Email Address")}
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
              placeholder={t("Password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
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

          {/* Confirm Password */}
          <div className="relative">
            <Lock
              size={22}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#66BB6A]"
            />

            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("Confirm Password")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full auth-input pl-14 pr-14 text-base sm:text-lg text-white placeholder:text-slate-400 outline-none"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#66BB6A] transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          {/* Language */}
          <div className="relative">
            <Globe
              size={22}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#66BB6A]"
            />

            <select
              aria-label={t("Preferred Language")}
              value={preferredLanguage}
              onChange={(e) => {
                const nextLanguage = e.target.value as LanguageCode;
                setPreferredLanguage(nextLanguage);
                setActiveLanguage(nextLanguage);
              }}
              className="w-full auth-input pl-14 pr-5 text-base sm:text-lg text-white outline-none appearance-none cursor-pointer"
            >
              {APP_LANGUAGES.map((item) => (
                <option
                  key={item.code}
                  value={item.code}
                  className="bg-slate-900 text-white"
                >
                  {item.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full font-heading font-bold text-lg text-white rounded-full auth-btn transition-all duration-300 mt-3 ${loading ? "opacity-60 cursor-not-allowed" : ""
              }`}
          >
            {loading
              ? t("Creating account...")
              : t("Register")}
          </button>
        </form>

        {/* Login Link */}
        <p className="font-body text-center text-base text-slate-300 mt-8">
          {t("Already have an account?")}{" "}
          <a
            href="/login"
            className="font-bold text-[#66BB6A] hover:underline transition-colors ml-1"
          >
            {t("Login")}
          </a>
        </p>
      </div>
    </div>
  );
}