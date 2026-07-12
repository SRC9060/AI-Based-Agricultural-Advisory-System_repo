import speech_recognition as sr

recognizer = sr.Recognizer()

with sr.Microphone() as source:
    print("Speak now...")
    audio = recognizer.listen(source)

try:
    text = recognizer.recognize_google(audio)
    print("Recognized Text:", text)

except sr.UnknownValueError:
    print("Could not understand the audio.")

except sr.RequestError:
    print("Speech Recognition service unavailable.")