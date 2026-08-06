sessions = {}

def create_session(user_id, language):
    if user_id not in sessions:
        sessions[user_id] = {
            "language": language,
            "conversation_history": []
        }

def add_message(user_id, message):    
    if user_id in sessions:
        sessions[user_id]["conversation_history"].append(message)

def get_session(user_id):
    return sessions.get(user_id)

def add_ai_message(user_id, message):
    if user_id in sessions:
        sessions[user_id]["conversation_history"].append(
            {
                "role": "assistant",
                "content": message
            }
        )

if __name__ == "__main__":
    create_session("farmer1", "kn")
    add_message("farmer1", "Crop disease problem")
    add_message("farmer1", "Need pesticide suggestion")
    session = get_session("farmer1")
    print("\nSession Details:")
    print(session)