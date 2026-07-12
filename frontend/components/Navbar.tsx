export default function Navbar() {
  return (
    <nav
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 50px",
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      <h2 style={{ color: "#2d6a4f" }}>
        🌾 AI Agricultural Advisory System
      </h2>

      <div
        style={{
          display: "flex",
          gap: "25px",
          fontWeight: "bold",
          color: "#2d6a4f",
        }}
      >
        <span>Home</span>
        <span>Features</span>
        <span>About</span>
        <span>Contact</span>
      </div>
    </nav>
  );
}