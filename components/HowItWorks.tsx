export default function HowItWorks() {
  return (
    <section
    id="how-it-works"
      style={{
        padding: "90px 40px",
        background: "linear-gradient(135deg, #f8fff5 0%, #edf7e8 50%, #f8fff5 100%)",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontSize: "3.2rem",
          color: "#2d6a4f",
          marginBottom: "20px",
          fontWeight: "bold",
        }}
      >
        ⚙️ How It Works
      </h2>

      <p
        style={{
          color: "#4b6354",
          marginBottom: "60px",
          fontSize: "1.2rem",
          maxWidth: "700px",
          marginInline: "auto",
          lineHeight: "1.7",
        }}
      >
        Three simple steps to receive intelligent agricultural guidance using
        our AI-powered multilingual farming assistant.
      </p>

      <div className="steps-container">

        <div className="step-card">
          <div className="step-icon">🎤</div>

          <h3>Record Voice</h3>

          <p>
            Speak your farming query naturally in your preferred language.
          </p>
        </div>

        <div className="step-card">
          <div className="step-icon">🤖</div>

          <h3>AI Processing</h3>

          <p>
            AI performs speech recognition, language translation and intent
            detection to understand your farming needs.
          </p>
        </div>

        <div className="step-card">
          <div className="step-icon">🌾</div>

          <h3>Get Advice</h3>

          <p>
            Receive intelligent crop recommendations, weather alerts, market
            prices and government scheme information instantly.
          </p>
        </div>

      </div>
    </section>
  );
}