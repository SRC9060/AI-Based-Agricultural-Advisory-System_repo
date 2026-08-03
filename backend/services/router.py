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
        from services.agents.crop_agent import crop_agent

        return crop_agent(query)

    elif intent == "pest_control_query":
        from services.agents.pest_agent import pest_agent

        return pest_agent(query)

    elif intent == "weather_query":
        from services.agents.weather_agent import weather_agent

        return weather_agent(city)

    elif intent == "market_price_query":
        from services.agents.market_agent import market_agent

        return market_agent(
            commodity=commodity,
            state=state,
            district=district,
        )

    elif intent == "government_scheme_query":
        from services.agents.scheme_agent import scheme_agent

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

    if intent in [
    "crop_management_query",
    "pest_control_query",
    "government_scheme_query",
    ]:
        query = input("Enter query: ")

    elif intent == "weather_query":
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
