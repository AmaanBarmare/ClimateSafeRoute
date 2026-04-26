"""OpenAI gpt-5-mini route-tradeoff explanation.

Falls back to a deterministic template if the API call fails so the user
always sees something useful in the side panel.
"""
import os

from openai import OpenAI

from app.schemas.route import RouteStats

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM_PROMPT = """You are a helpful urban climate assistant.
You explain pedestrian route tradeoffs clearly and concisely to everyday users.
Focus on practical impact: temperature, shade, flood risk. Avoid technical jargon.
Write in plain English. Two to three sentences maximum.
Do not use bullet points, lists, or markdown formatting in your response."""


def generate_explanation(shortest: RouteStats, climate: RouteStats) -> str:
    user_prompt = f"""Compare these two pedestrian routes in NYC and explain the tradeoff:

Shortest route:
- Walking time: {shortest.duration_min:.0f} minutes ({shortest.distance_m:.0f}m)
- Heat vulnerability score: {shortest.heat_score:.0f}/100 (higher = hotter streets)
- Flood risk score: {shortest.flood_score:.0f}/100 (higher = more risk)
- Tree canopy coverage: {shortest.canopy_pct:.0f}%

Climate-smart route:
- Walking time: {climate.duration_min:.0f} minutes ({climate.distance_m:.0f}m)
- Heat vulnerability score: {climate.heat_score:.0f}/100
- Flood risk score: {climate.flood_score:.0f}/100
- Tree canopy coverage: {climate.canopy_pct:.0f}%

Explain the tradeoff to a pedestrian deciding which route to take. Be specific about the differences."""

    try:
        # gpt-5-mini is a reasoning model. With default reasoning_effort it can
        # consume the entire token budget on hidden reasoning and emit no
        # visible text. "minimal" keeps reasoning short for this simple summary.
        response = client.chat.completions.create(
            model="gpt-5-mini",
            reasoning_effort="minimal",
            max_completion_tokens=600,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        text = (response.choices[0].message.content or "").strip()
        if not text:
            print(f"[llm] empty content; finish_reason={response.choices[0].finish_reason}")
            return _fallback(shortest, climate)
        return text
    except Exception as exc:
        print(f"[llm] OpenAI call failed, using fallback: {exc!r}")
        return _fallback(shortest, climate)


def _fallback(shortest: RouteStats, climate: RouteStats) -> str:
    time_diff = climate.duration_min - shortest.duration_min
    heat_diff = shortest.heat_score - climate.heat_score
    return (
        f"The climate-smart route takes {time_diff:.0f} extra minutes "
        f"but reduces heat exposure by {heat_diff:.0f} points and increases "
        f"tree canopy from {shortest.canopy_pct:.0f}% to {climate.canopy_pct:.0f}%."
    )
