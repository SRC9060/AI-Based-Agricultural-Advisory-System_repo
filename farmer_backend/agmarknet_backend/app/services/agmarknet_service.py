from agmarknet_backend.app.client.agmarknet_client import AgmarknetClient
from agmarknet_backend.app.models.market_models import MarketResponse

client = AgmarknetClient()


def get_market_price(
    commodity: str,
    state: str,
    district: str,
) -> MarketResponse:

    response = client.get_market_prices(
        commodity=commodity,
        state=state,
        district=district,
        limit=1, 
    )
    
    records = response.get("records", [])

    if not records:
        raise ValueError("No market data found.")

    record = records[0]

    return MarketResponse(
        commodity=record["commodity"],
        state=record["state"],
        district=record["district"],
        market=record["market"],
        min_price=float(record["min_price"]),
        max_price=float(record["max_price"]),
        modal_price=float(record["modal_price"]),
        arrival_date=record["arrival_date"],
    )