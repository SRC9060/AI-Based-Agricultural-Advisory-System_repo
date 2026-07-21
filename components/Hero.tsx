import Link from "next/link";
import Navbar from "./Navbar";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import WhyChooseUs from "./WhyChooseUs";
import Footer from "./Footer";

export default function Hero() {
  return (
    <>
      <Navbar />

      <section id="home" className="hero">

        <div className="hero-overlay">

          <div className="hero-content">

            <span className="tag">
              🌱 AI Powered Smart Farming
            </span>

            <h1>
              AI Agricultural Advisory System
            </h1>

            <p>
              A multilingual AI assistant that helps farmers through voice,
              crop disease detection, weather advisory, market prices,
              government schemes and intelligent recommendations.
            </p>

            <div className="hero-buttons">

              <Link href="/login">
                <button className="primaryBtn">
                  🚀 Get Started
                </button>
              </Link>

              <Link href="/register">
                <button className="secondaryBtn">
                  Create Account
                </button>
              </Link>

            </div>

            <div className="hero-stats">

              <div>
                <h2>10+</h2>
                <p>Languages</p>
              </div>

              <div>
                <h2>24/7</h2>
                <p>AI Assistant</p>
              </div>

              <div>
                <h2>100%</h2>
                <p>Voice Support</p>
              </div>

            </div>

          </div>

        </div>

      </section>

      <Features />
      <HowItWorks />
      <WhyChooseUs />
      <Footer />

    </>
  );
}