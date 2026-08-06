from __future__ import annotations

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import Config


_retry = Retry(
    total=2,
    connect=2,
    read=2,
    backoff_factor=0.4,
    status_forcelist=(429, 500, 502, 503, 504),
    allowed_methods=frozenset({"GET"}),
)
_session = requests.Session()
_session.mount("https://", HTTPAdapter(max_retries=_retry))


def _location_candidates(city: str):
    cleaned = " ".join(str(city or "").strip().split())
    if not cleaned:
        return []
    candidates = [cleaned]
    if "," not in cleaned:
        candidates.append(f"{cleaned},IN")
    return candidates


def _fetch_openweather(endpoint: str, city: str):
    candidates = _location_candidates(city)
    if not candidates:
        return {
            "error": "Location not specified. Please enter a city or update your profile location.",
            "status_code": 400,
        }

    if not Config.OPENWEATHER_API_KEY:
        return {
            "error": "The weather service is not configured.",
            "status_code": 503,
        }

    last_message = "Location not found."
    for candidate in candidates:
        try:
            response = _session.get(
                f"https://api.openweathermap.org/data/2.5/{endpoint}",
                params={
                    "q": candidate,
                    "appid": Config.OPENWEATHER_API_KEY,
                    "units": "metric",
                },
                timeout=(8, 25),
            )
            try:
                data = response.json()
            except ValueError:
                data = {}

            if response.status_code == 200:
                return data
            last_message = str(
                data.get("message", "Unable to fetch weather information.")
            ).capitalize()
            if response.status_code != 404:
                return {
                    "error": last_message,
                    "status_code": (
                        429 if response.status_code == 429 else 503
                    ),
                }
        except requests.RequestException as error:
            print("OpenWeather request unavailable:", type(error).__name__)
            return {
                "error": (
                    "The live weather service is temporarily unavailable. "
                    "Please try again shortly."
                ),
                "status_code": 503,
            }

    return {
        "error": last_message,
        "status_code": 404,
    }


def get_weather(city):
    """Fetch current weather information."""
    data = _fetch_openweather("weather", city)
    if "error" in data:
        return data
    try:
        return {
            "city": data["name"],
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "weather": data["weather"][0]["description"],
            "wind_speed": data["wind"]["speed"],
        }
    except (KeyError, IndexError, TypeError):
        return {
            "error": "The weather service returned incomplete data.",
            "status_code": 503,
        }


def get_forecast(city):
    """Fetch the upcoming five-day weather forecast."""
    data = _fetch_openweather("forecast", city)
    if "error" in data:
        return data

    try:
        forecast = [
            {
                "date": item["dt_txt"].split(" ")[0],
                "temperature": item["main"]["temp"],
                "humidity": item["main"]["humidity"],
                "weather": item["weather"][0]["description"],
                "wind_speed": item["wind"]["speed"],
            }
            for item in data["list"]
            if "12:00:00" in item["dt_txt"]
        ]
        return {
            "city": data["city"]["name"],
            "forecast": forecast,
        }
    except (KeyError, IndexError, TypeError):
        return {
            "error": "The weather service returned incomplete forecast data.",
            "status_code": 503,
        }


if __name__ == "__main__":
    location = input("Enter city name: ")
    print("\nCurrent Weather:\n", get_weather(location))
    print("\nWeather Forecast:\n", get_forecast(location))
