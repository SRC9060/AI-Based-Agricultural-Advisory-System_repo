from services.agents.crop_agent import crop_agent
from services.agents.pest_agent import pest_agent
from services.agents.weather_agent import weather_agent
from services.agents.market_agent import market_agent
from services.agents.scheme_agent import scheme_agent


def route_query(
    intent,
    query=None,
    city=None,
    commodity=None,
    state=None,
    district=None,
):
    """
    Routes the user query to the appropriate agent based on intent.
    """

    if intent == "crop_management_query":
        return crop_agent(query)

    elif intent == "pest_control_query":
        return pest_agent(query)

    elif intent == "weather_query":
        return weather_agent(city)

    elif intent == "market_price_query":
        return market_agent(
            commodity=commodity,
            state=state,
            district=district,
        )

    elif intent == "government_scheme_query":
        return scheme_agent(query)

    else:
        return "Sorry, I couldn't identify the correct agent for this query."


if __name__ == "__main__":

    intent = input("Enter intent: ")

    query = None
    city = None
    commodity = None
    state = None
    district = None

    if intent in ["crop_advisory", "pest_control", "government_scheme"]:
        query = input("Enter query: ")

    elif intent == "weather":
        city = input("Enter city: ")

    elif intent == "market_price_query":
        commodity = input("Enter commodity: ")
        state = input("Enter state: ")
        district = input("Enter district: ")

    response = route_query(
        intent=intent,
        query=query,
        city=city,
        commodity=commodity,
        state=state,
        district=district,
    )

    print("\nResponse:\n")
    print(response)