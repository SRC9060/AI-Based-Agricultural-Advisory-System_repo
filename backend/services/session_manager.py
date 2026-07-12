class SessionManager:
    def __init__(self):
        self.session = {}

    def save_session(self, language, query, intent):
        self.session["language"] = language
        self.session["last_query"] = query
        self.session["last_intent"] = intent

    def get_session(self):
        return self.session


if __name__ == "__main__":
    session = SessionManager()

    session.save_session(
        language="en",
        query="My tomato has late blight and aphids.",
        intent="Crop Information"
    )

    print(session.get_session())