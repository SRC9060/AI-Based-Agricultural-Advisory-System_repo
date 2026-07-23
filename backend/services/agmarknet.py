from models import MarketResponse
import requests
from config import Config


class AgmarknetClient:

    def get_market_prices(
        self,
        commodity=None,
        state=None,
        district=None,
        limit=1000,
    ):

        # TEMPORARY DEBUG VERSION (NO FILTERS)
        params = {
            "api-key": Config.AGMARKNET_API_KEY,
            "format": "json",
            "limit": limit,
        }
        if commodity:
          params["filters[commodity]"] = commodity.strip()

        if state:
          params["filters[state]"] = state.strip()

        if district:
          params["filters[district]"] = district.strip()

        headers = {
            "User-Agent": "Mozilla/5.0"
        }

        response = requests.get(
            Config.AGMARKNET_BASE_URL,
            params=params,
            headers=headers,
            timeout=(10, 60),
        )

        print("\n========== REQUEST ==========")
        print("URL :", response.url)
        print("Params :", params)

        response.raise_for_status()

        data = response.json()

        print("\n========== API RESPONSE ==========")
        print(data)
        print("==================================")

        print("\n========== FIRST RECORDS ==========")

        records = data.get("records", [])

        if not records:
            print("No records returned from API.")
        else:
            for i, record in enumerate(records, start=1):
                print(f"\n----- Record {i} -----")
                print(record)

        print("==================================\n")

        return data


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
        limit=1000,
    )

    records = response.get("records", [])

    if not records:
        raise ValueError(
            f"No market data found for Commodity='{commodity}', State='{state}', District='{district}'"
        )

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

def get_market_options():
    response = client.get_market_prices(limit=1000)

    records = response.get("records", [])

    market_options = {}

    for record in records:
        commodity = record["commodity"].strip()
        state = record["state"].strip()
        district = record["district"].strip()

        market_options.setdefault(commodity, {})
        market_options[commodity].setdefault(state, set())
        market_options[commodity][state].add(district)

    # Convert sets to sorted lists
    for commodity in market_options:
        for state in market_options[commodity]:
            market_options[commodity][state] = sorted(
                list(market_options[commodity][state])
            )

    return market_options