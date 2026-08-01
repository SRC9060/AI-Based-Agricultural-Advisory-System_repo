const offlineConversationScript = `
(() => {
  const button = document.getElementById("offline-conversation-toggle");
  const section = document.getElementById("offline-conversation");
  const messagesContainer = document.getElementById("offline-messages");

  let checkingConnection = false;

  async function returnToAppWhenOnline() {
    if (!navigator.onLine || checkingConnection) return;
    checkingConnection = true;

    try {
      const response = await fetch(
        "/dashboard?online-check=" + Date.now(),
        { cache: "no-store" }
      );
      const responsePath = new URL(response.url).pathname;

      // When the network is still unavailable, Workbox returns /offline.
      // Redirect only after the real dashboard responds.
      if (response.ok && responsePath !== "/offline") {
        window.location.replace("/dashboard");
      }
    } catch {
      // Stay on the cached offline screen until the next connectivity check.
    } finally {
      checkingConnection = false;
    }
  }

  window.addEventListener("online", returnToAppWhenOnline);
  window.setInterval(returnToAppWhenOnline, 3000);
  returnToAppWhenOnline();

  if (!button || !section || !messagesContainer) return;

  let rendered = false;

  function renderCachedMessages() {
    if (rendered) return;
    rendered = true;
    messagesContainer.textContent = "";

    let messages = [];
    try {
      const cached = localStorage.getItem("agriadvisor_last_conversation");
      const parsed = cached ? JSON.parse(cached) : [];
      if (Array.isArray(parsed)) {
        messages = parsed.filter(
          (message) =>
            message &&
            (message.type === "user" || message.type === "ai") &&
            typeof message.text === "string"
        );
      }
    } catch {
      messages = [];
    }

    if (messages.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-center text-slate-600";
      empty.textContent = "No cached conversation is available yet.";
      messagesContainer.appendChild(empty);
      return;
    }

    for (const message of messages) {
      const item = document.createElement("div");
      item.className =
        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 " +
        (message.type === "user"
          ? "ml-auto bg-green-700 text-white"
          : "mr-auto bg-green-50 text-slate-800");
      item.textContent = message.text;
      messagesContainer.appendChild(item);
    }
  }

  button.addEventListener("click", () => {
    const willShow = section.hidden;
    if (willShow) renderCachedMessages();
    section.hidden = !willShow;
    button.textContent = willShow
      ? "Hide conversation"
      : "View last conversation";
    button.setAttribute("aria-expanded", String(willShow));
  });
})();
`;

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-green-50 p-6 text-center">
      <section className="mx-auto mt-[12vh] max-w-md rounded-3xl border border-green-200 bg-white p-8 shadow-lg">
        <div className="text-6xl" aria-hidden="true">
          🌾
        </div>
        <h1 className="mt-4 text-2xl font-bold text-green-900">
          You are offline
        </h1>
        <p className="mt-3 text-slate-600">
          AgriAdvisor can show cached screens and your last conversation, but it
          needs an internet connection for new AI, weather, market, and voice
          requests.
        </p>
        <p className="mt-4 font-semibold text-amber-700" role="status">
          Offline — reconnect to ask new questions.
        </p>
        <button
          id="offline-conversation-toggle"
          type="button"
          aria-controls="offline-conversation"
          aria-expanded="false"
          className="mt-6 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white"
        >
          View last conversation
        </button>
      </section>

      <section
        id="offline-conversation"
        aria-label="Last cached conversation"
        className="mx-auto mt-6 max-w-3xl rounded-3xl border border-green-200 bg-white p-5 text-left shadow-lg"
        hidden
      >
        <h2 className="text-center text-xl font-bold text-green-900">
          Last conversation
        </h2>
        <div id="offline-messages" className="mt-3 space-y-3" />
      </section>

      <script
        dangerouslySetInnerHTML={{ __html: offlineConversationScript }}
      />
    </main>
  );
}
