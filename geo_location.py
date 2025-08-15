import requests

def get_geolocation():
    """Get approximate geo-location using IP-based lookup."""
    try:
        response = requests.get("https://ipinfo.io/json", timeout=5)
        data = response.json()
        loc = data.get("loc", "")
        city = data.get("city", "")
        region = data.get("region", "")
        country = data.get("country", "")
        return loc, f"{city}, {region}, {country}"
    except Exception:
        return "", "Location unavailable"
