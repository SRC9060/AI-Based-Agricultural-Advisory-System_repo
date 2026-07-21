from agmarknet_backend.app.services.agmarknet_service import get_market_price


def market_agent(commodity, state, district):
    """
    Handles market price queries using the AGMARKNET backend.
    Returns a plain text response for the chatbot.
    """
    try:
        response = get_market_price(
            commodity=commodity,
            state=state,
            district=district
        )

        return (
            f"The modal price of {response.commodity} in {response.market}, "
            f"{response.district}, {response.state} is ₹{response.modal_price:.0f} per quintal. "
            f"The minimum price is ₹{response.min_price:.0f} and the maximum price is ₹{response.max_price:.0f}."
        )

    except Exception as e:
        return str(e)


if __name__ == "__main__":
    commodity = input("Commodity: ")
    state = input("State: ")
    district = input("District: ")

    print(market_agent(commodity, state, district))