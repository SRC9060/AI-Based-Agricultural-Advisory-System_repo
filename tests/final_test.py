from agmarknet_backend.app.services.agmarknet_service import get_market_price


result = get_market_price(
    commodity="Wheat",
    state="Uttar Pradesh",
    district="Balrampur",
)

print(result.model_dump())