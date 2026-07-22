from services.weather_service import get_weather


def weather_agent(city):
    """
    Handles weather-related queries.
    """
    return get_weather(city)


if __name__ == "__main__":
    city = input("Enter city name: ")

    response = weather_agent(city)

    print("\nWeather Details:\n")
    print(response)