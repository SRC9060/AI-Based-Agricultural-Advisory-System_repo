import requests
from config import Config

def get_weather(city):
    """
    Fetch current weather information.
    """
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "q": city,
        "appid": Config.OPENWEATHER_API_KEY,
        "units": "metric"
    }
    try:
        response = requests.get(url, params=params)
        data = response.json()
        if response.status_code != 200:
            return {
                "error": data.get("message", "Unable to fetch weather.")
            }
        return {
            "city": data["name"],
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "weather": data["weather"][0]["description"],
            "wind_speed": data["wind"]["speed"]
        }
    except Exception as e:
        return {
            "error": str(e)
        }

if __name__ == "__main__":
    city = input("Enter city name: ")
    result = get_weather(city)
    print("\nWeather Details:\n")
    print(result)