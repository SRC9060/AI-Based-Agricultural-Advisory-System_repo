import requests
from config import Config


# ==========================================
# CURRENT WEATHER
# ==========================================

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


# ==========================================
# 5-DAY WEATHER FORECAST
# ==========================================

def get_forecast(city):
    """
    Fetch upcoming weather forecast.
    """

    url = "https://api.openweathermap.org/data/2.5/forecast"

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
                "error": data.get("message", "Unable to fetch forecast.")
            }

        forecast = []

        # OpenWeather provides forecast data every 3 hours.
        # We select approximately 12 PM for each day.
        for item in data["list"]:

            if "12:00:00" in item["dt_txt"]:

                forecast.append({
                    "date": item["dt_txt"].split(" ")[0],
                    "temperature": item["main"]["temp"],
                    "humidity": item["main"]["humidity"],
                    "weather": item["weather"][0]["description"],
                    "wind_speed": item["wind"]["speed"]
                })

        return {
            "city": data["city"]["name"],
            "forecast": forecast
        }

    except Exception as e:
        return {
            "error": str(e)
        }


# ==========================================
# TEST
# ==========================================

if __name__ == "__main__":

    city = input("Enter city name: ")

    print("\nCurrent Weather:\n")
    current = get_weather(city)
    print(current)

    print("\nWeather Forecast:\n")
    forecast = get_forecast(city)
    print(forecast)