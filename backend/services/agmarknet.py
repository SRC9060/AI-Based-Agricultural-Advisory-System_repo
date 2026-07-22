from models import MarketResponse
import requests
from config import Config

class AgmarknetClient:
    def get_market_prices(
        self,
        commodity=None,
        state=None,
        district=None,
        limit=1,
    ):
        params = {
            "api-key": Config.AGMARKNET_API_KEY,
            "format": "json",
            "limit": limit,
        }
        if commodity:
            params["filters[commodity]"] = commodity
        if state:
            params["filters[state.keyword]"] = state
        if district:
            params["filters[district]"] = district
        headers = {
            "User-Agent": "Mozilla/5.0"
        }
        response = requests.get(
            Config.AGMARKNET_BASE_URL,
            params=params,
            headers=headers,
            timeout=(10, 60),
        )
        response.raise_for_status()
        return response.json()
    
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