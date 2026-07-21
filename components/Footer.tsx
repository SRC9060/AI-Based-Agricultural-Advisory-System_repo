export default function Footer() {
  return (
    <footer id="contact" className="footer">

      <div className="footer-container">

        {/* Project Summary */}
        <div className="footer-summary">

          <h2>🌾 AI Agricultural Advisory System</h2>

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