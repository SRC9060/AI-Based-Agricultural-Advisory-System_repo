export default function WhyChooseUs() {
  return (
    <section
      style={{
        padding: "100px 40px",
        background: "linear-gradient(to bottom,#ffffff,#eef7ff)",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontSize: "3rem",
          color: "#1565c0",
          marginBottom: "15px",
        }}
      >
        ⭐ Why Choose Us
      </h2>

      <p
        style={{
          color: "#666",
          fontSize: "1.15rem",
          marginBottom: "70px",
        }}
      >
        Smart technology built to empower every farmer with fast,
        multilingual and reliable agricultural assistance.
      </p>

      <div className="choose-container">

        <div className="choose-card">
          <div className="choose-icon">⚡</div>

          <h3>Fast AI Responses</h3>

          <p>
            Receive instant AI-powered recommendations for all your farming
            queries.
          </p>
        </div>

        <div className="choose-card">
          <div className="choose-icon">🌍</div>

          <h3>Multilingual Support</h3>

          <p>
            Communicate naturally in Telugu, Tamil, Hindi, English and more.
          </p>
        </div>

        <div className="choose-card">
          <div className="choose-icon">📈</div>

          <h3>Live Agricultural Data</h3>

          <p>
            Weather forecasts, crop prices and government schemes in one place.
          </p>
        </div>

        <div className="choose-card">
          <div className="choose-icon">🛡️</div>

          <h3>Trusted AI Guidance</h3>

          <p>
            Accurate recommendations using AI with agricultural knowledge.
          </p>
        </div>

      </div>
    </section>
  );
}