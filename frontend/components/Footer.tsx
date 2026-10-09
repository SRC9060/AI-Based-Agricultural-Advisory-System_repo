import Link from "next/link";

export default function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer-container">
        {/* Project Summary */}
        <div className="footer-summary">
          <div className="footer-title">🌾 AI Agricultural Advisory System</div>

          <p>
            Empowering farmers through AI-powered multilingual assistance,
            providing intelligent agricultural guidance through voice
            interaction, weather insights, crop support, market information
            and government scheme awareness.
          </p>

          <div className="footer-tag">
            🌱 Smart Farming • Powered by AI
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-contact">
          <h3>Quick Links</h3>

          <div className="flex flex-col gap-2 font-medium text-sm text-emerald-100/80">
            <Link href="#features" className="hover:text-white transition-colors">
              🌾 Smart Features
            </Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">
              ⚙️ How It Works
            </Link>
            <Link href="#why-choose-us" className="hover:text-white transition-colors">
              ⭐ Why Choose Us
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              🔐 Login
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              📝 Create Account
            </Link>
          </div>
        </div>

        {/* Contact */}
        <div className="footer-contact">
          <h3>Contact Us</h3>

          <div className="contact-item">
            <span>📧</span>
            <p>support@aiagriadvisory.com</p>
          </div>

          <div className="contact-item">
            <span>📍</span>
            <p>India</p>
          </div>

          <div className="contact-item">
            <span>🕐</span>
            <p>AI Assistance Available 24/7</p>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-bottom">
        <p>
          © 2026 AI Agricultural Advisory System. All Rights Reserved.
        </p>

        <p>
          Developed as part of the Infosys Springboard Internship Project 🌱
        </p>
      </div>
    </footer>
  );
}