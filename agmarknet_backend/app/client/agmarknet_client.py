import requests

from agmarknet_backend.app.config import (
    AGMARKNET_API_KEY,
    AGMARKNET_BASE_URL,
)


class AgmarknetClient: 

    def __init__(self):
        self.base_url = AGMARKNET_BASE_URL
        self.api_key = AGMARKNET_API_KEY

    def get_market_prices(
        self,
        commodity=None,
        state=None,
        district=None,
        limit=1,
    ):

        params = {
            "api-key": self.api_key,
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
            self.base_url,
            params=params,
            headers=headers,
            timeout=(10, 60),
        )

        response.raise_for_status()

        return response.json()