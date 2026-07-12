import os
from dotenv import load_dotenv
from sarvamai import SarvamAI

load_dotenv()

client = SarvamAI(
    api_subscription_key=os.getenv("SARVAM_API_KEY")
)


def generate_response(question, knowledge):

    prompt = f"""
You are an AI Agricultural Assistant.

Rules:
1. Answer ONLY agriculture-related questions.
2. Use ONLY the knowledge provided below.
3. Do not make up information.
4. Explain the answer in simple language.

Farmer Question:
{question}

Knowledge:
{knowledge}
"""

    response = client.chat.completions(
        model="sarvam-105b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        reasoning_effort=None,
        temperature=0.2,
        max_tokens=300
    )

    return response.choices[0].message.content


if __name__ == "__main__":

    sample_question = "My tomato has late blight."

    sample_knowledge = """
Disease: Late Blight

Symptoms:
- Black spots on leaves
- Brown lesions

Treatment:
- Remove infected leaves
- Apply copper fungicide
- Avoid overhead irrigation
"""

    answer = generate_response(
        sample_question,
        sample_knowledge
    )

    print("\n===== Sarvam AI Response =====\n")
    print(answer)