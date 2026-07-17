import wave

audio = wave.open("output_audio/output.wav", "rb")

print("Channels:", audio.getnchannels())
print("Sample Width:", audio.getsampwidth())
print("Frame Rate:", audio.getframerate())
print("Number of Frames:", audio.getnframes())

duration = audio.getnframes() / audio.getframerate()
print("Duration:", duration, "seconds")

audio.close()