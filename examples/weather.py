import asyncio
import signal

import aiohttp

API_URL = "https://api.weather.com/v1"
CACHE: dict[str, float] = {}


async def fetch_temp(session: aiohttp.ClientSession, city: str) -> float:
    if city in CACHE:
        return CACHE[city]
    async with session.get(f"{API_URL}/temp", params={"q": city}) as res:
        res.raise_for_status()
        data = await res.json()
    CACHE[city] = data["temp"]
    return data["temp"]


async def collect_reports(cities: list[str]) -> list[str]:
    reports = []
    async with aiohttp.ClientSession() as session:
        for city in cities:
            try:
                temp = await fetch_temp(session, city)
            except aiohttp.ClientResponseError:
                reports.append(f"{city}: 조회 실패")
                continue
            reports.append(format_report(city, temp))
    return reports


def format_report(city: str, temp: float) -> str:
    return f"{city}: {temp}°C"


def on_interrupt(signum, frame) -> None:
    CACHE.clear()
    raise SystemExit(1)


def main() -> None:
    signal.signal(signal.SIGINT, on_interrupt)
    cities = [c.strip() for c in input("도시 이름(쉼표 구분): ").split(",") if c.strip()]
    if cities:
        for line in asyncio.run(collect_reports(cities)):
            print(line)


if __name__ == "__main__":
    main()
