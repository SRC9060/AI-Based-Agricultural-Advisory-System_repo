import Link from "next/link";
import Navbar from "./Navbar";
import Features from "./Features";

export default function Hero() {
  return (
    <>
      <Navbar />

      <section className="hero">
        <h1>🌾 AI Agricultural Advisory System</h1>

        <p>
          Empowering Farmers with AI-powered Multilingual Agricultural
          Assistance
        </p>

        <div className="hero-buttons">
          <Link href="/login">
            <button>Login</button>
          </Link>

          <Link href="/register">
            <button>Register</button>
          </Link>
        </div>
      </section>

      <Features />
    </>
  );
}