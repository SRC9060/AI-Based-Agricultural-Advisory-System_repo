from __future__ import annotations

from copy import deepcopy

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import Config
from models import MarketResponse


class MarketServiceUnavailable(RuntimeError):
    """Raised when the live AGMARKNET provider cannot be reached."""


# These values are selections only, never prices. They keep the search form
# usable during a temporary data.gov.in outage without presenting stale or
# fabricated market rates.
FALLBACK_MARKET_OPTIONS = {
    "Paddy(Common)": {
        "Karnataka": [
            "Bagalkot",
            "Ballari",
            "Belagavi",
            "Bengaluru Rural",
            "Davanagere",
            "Hassan",
            "Koppal",
            "Mandya",
            "Mysuru",
            "Raichur",
            "Shivamogga",
            "Tumakuru",
        ],
    },
    "Maize": {
        "Karnataka": [
            "Bagalkot",
            "Belagavi",
            "Bengaluru Rural",
            "Chitradurga",
            "Davanagere",
            "Haveri",
            "Koppal",
            "Mysuru",
            "Shivamogga",
        ],
    },
    "Tomato": {
        "Karnataka": [
            "Bagalkot",
            "Belagavi",
            "Bengaluru Rural",
            "Chikkaballapura",
            "Kolar",
            "Mandya",
            "Mysuru",
            "Ramanagara",
            "Tumakuru",
        ],
    },
    "Onion": {
        "Karnataka": [
            "Bagalkot",
            "Belagavi",
            "Bengaluru Rural",
            "Chitradurga",
            "Davanagere",
            "Gadag",
            "Haveri",
        ],
    },
    "Potato": {
        "Karnataka": [
            "Bengaluru Rural",
            "Chikkaballapura",
            "Hassan",
            "Kolar",
        ],
    },
    "Banana": {
        "Karnataka": [
            "Bagalkot",
            "Belagavi",
            "Chikkaballapura",
            "Mysuru",
            "Shivamogga",
        ],
    },
    "Brinjal": {
        "Karnataka": [
            "Bagalkot",
            "Bengaluru Rural",
            "Kolar",
            "Mandya",
            "Mysuru",
        ],
    },
    "Green Chilli": {
        "Karnataka": [
            "Bagalkot",
            "Belagavi",
            "Bengaluru Rural",
            "Dharwad",
            "Haveri",
            "Mysuru",
        ],
    },
}


def get_fallback_market_options():
    return deepcopy(FALLBACK_MARKET_OPTIONS)


class AgmarknetClient:
    def __init__(self):
        retry = Retry(
            total=2,
            connect=2,
            read=2,
            backoff_factor=0.4,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset({"GET"}),
        )
        self.session = requests.Session()
        self.session.mount("https://", HTTPAdapter(max_retries=retry))

    def get_market_prices(
        self,
        commodity=None,
        state=None,
        district=None,
        limit=1000,
    ):
        if not Config.AGMARKNET_BASE_URL or not Config.AGMARKNET_API_KEY:
            raise MarketServiceUnavailable(
                "The live AGMARKNET service is not configured."
            )

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

        try:
            response = self.session.get(
                Config.AGMARKNET_BASE_URL,
                params=params,
                headers={"User-Agent": "AgriAdvisor/1.0"},
                timeout=(8, 30),
            )
            response.raise_for_status()
            data = response.json()
        except (requests.RequestException, ValueError) as error:
            # Never log the request URL because it contains the API key.
            print(
                "AGMARKNET request unavailable:",
                type(error).__name__,
            )
            raise MarketServiceUnavailable(
                "The live AGMARKNET service is temporarily unavailable."
            ) from error

        if not isinstance(data, dict):
            raise MarketServiceUnavailable(
                "The live AGMARKNET service returned an invalid response."
            )
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
            f"No market data found for Commodity='{commodity}', "
            f"State='{state}', District='{district}'"
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
        commodity = str(record.get("commodity", "")).strip()
        state = str(record.get("state", "")).strip()
        district = str(record.get("district", "")).strip()
        if not commodity or not state or not district:
            continue
        market_options.setdefault(commodity, {})
        market_options[commodity].setdefault(state, set())
        market_options[commodity][state].add(district)

    for commodity in market_options:
        for state in market_options[commodity]:
            market_options[commodity][state] = sorted(
                market_options[commodity][state]
            )

    if not market_options:
        raise MarketServiceUnavailable(
            "The live AGMARKNET service returned no market selections."
        )
    return market_options
