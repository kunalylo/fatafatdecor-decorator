from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import base64
import os
import io
import json as json_lib
import traceback
import asyncio
import requests as http_requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# CREDENTIALS
# /generate          → fal.ai FLUX models (fast, cheap, high quality)
# /analyze-decoration → OpenAI gpt-4o-mini vision (analysis only)
# ============================================================
FAL_KEY = os.environ.get("FAL_KEY", "")
os.environ["FAL_KEY"] = FAL_KEY  # fal_client reads FAL_KEY from env

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

def get_openai_client():
    from openai import OpenAI
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY env var not set")
    return OpenAI(api_key=OPENAI_API_KEY)


class GenerateRequest(BaseModel):
    prompt: str
    image_base64: Optional[str] = None


class AnalyzeRequest(BaseModel):
    image_base64: str
    name: str = ""


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ai_provider": "fal.ai FLUX",
        "fal_key_configured": bool(FAL_KEY),
        "analysis_provider": "openai gpt-4o-mini",
        "openai_key_configured": bool(OPENAI_API_KEY)
    }


@app.post("/generate")
async def generate_decoration(req: GenerateRequest):
    """Generate decoration image using fal.ai FLUX models. Returns image URL."""
    import fal_client
    try:
        if req.image_base64:
            # IMAGE EDITING — customer uploaded room photo
            # Upload base64 to fal.ai storage to get a URL, then run FLUX Pro Fill
            img_data = req.image_base64
            if ',' in img_data:
                img_data = img_data.split(',', 1)[1]
            image_bytes = base64.b64decode(img_data)
            image_file = io.BytesIO(image_bytes)
            image_file.name = "room.png"

            # Upload to fal storage → temporary URL for inference
            fal_image_url = await asyncio.to_thread(fal_client.upload, image_file, content_type="image/png")

            # FLUX Pro Fill — best for adding decorations to real room photos
            result = await asyncio.to_thread(
                fal_client.run,
                "fal-ai/flux-pro/v1/fill",
                arguments={
                    "prompt": req.prompt,
                    "image_url": fal_image_url,
                    "num_images": 1,
                    "safety_tolerance": "2",
                    "output_format": "jpeg"
                }
            )
        else:
            # TEXT-TO-IMAGE — generate full decorated room concept
            # FLUX Schnell — fastest model, 1-2 seconds, great quality
            result = await asyncio.to_thread(
                fal_client.run,
                "fal-ai/flux/schnell",
                arguments={
                    "prompt": req.prompt,
                    "image_size": "square_hd",
                    "num_images": 1,
                    "num_inference_steps": 4,
                    "output_format": "jpeg"
                }
            )

        output_url = result["images"][0]["url"]
        return {"image_url": output_url, "success": True}

    except Exception as e:
        print(f"fal.ai Generation Error:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-decoration")
async def analyze_decoration(req: AnalyzeRequest):
    """Analyze a decoration photo with GPT-4o-mini vision. Returns item list with INR prices."""
    try:
        client = get_openai_client()

        img_data = req.image_base64
        if ',' in img_data:
            img_data = img_data.split(',', 1)[1]
        data_url = f"data:image/jpeg;base64,{img_data}"

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert event decoration analyst for FatafatDecor India. Count ALL items accurately.

FIRST: Generate a unique creative kit name (e.g., "Rose Gold Birthday Glam Backdrop", "Enchanted Garden Party Setup").

CRITICAL COUNTING RULES:
- For BALLOONS: Count EVERY single balloon. Balloon walls can have 100-500+ balloons. Arches typically 80-350.
- Estimate large quantities: count one row x number of rows, or measure section x total area.
- Better to slightly overcount than undercount.

SCREENSHOT DETECTION:
- If the image has phone UI, status bar, or app interface, set "is_screenshot": true and ONLY analyze the decoration, ignore UI elements.

Categories: balloons / neon_signs / backdrop / props / lights / table_decor / banners / flowers / drapes / candles / streamers / confetti / centerpieces / garlands / ribbons / curtains / other

FATAFAT DECOR REAL PRICES (INR):
BALLOONS: Coloured Latex 10-12in Rs10-14, Pastel Rs18, Chrome Rs16, Mix Rs21, Confetti Rs33, Large 20in Rs78, Jumbo 36in Rs650
FOIL BALLOONS: Heart 12in Rs78, Letter/Number 16in Rs195, Letter 32in Rs260, Jumbo 40in Rs390, Teddy Bear Rs260
BACKDROPS: Net Large Rs650, Foil Curtain Rs455, White Net Set Rs462, Colour Net Rs520, Disco Rs5265
LIGHTING: LED Curtain Rs982, LED Candle Set Rs520
NEON SIGNS: Happy Birthday Rs2600, Lets Party Rs2600, Good Vibes Rs2990, Bride To Be Rs2600
PROPS: LED Letter Rs650, Paper Box Set Rs910, Artificial Flowers Rs1560

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "decoration_type": "Creative unique kit name",
  "is_screenshot": false,
  "color_theme": "dominant colors",
  "occasion_suggestion": "birthday/wedding/anniversary/party/baby_shower/corporate/engagement",
  "room_suggestion": "Living Room/Hall/Garden/Dining Room/Balcony",
  "difficulty": "easy/medium/hard",
  "setup_time_minutes": 60,
  "items": [
    {"name": "...", "category": "...", "color": "...", "size": "...", "quantity": 0, "estimated_unit_price": 0}
  ],
  "total_items_cost": 0,
  "suggested_labor_cost": 500,
  "suggested_travel_cost": 500,
  "suggested_final_price": 0,
  "notes": "setup tips"
}"""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Analyze this decoration image{(' named: ' + req.name) if req.name else ''}. Count ALL items accurately. Use FatafatDecor Indian market pricing."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url}
                        }
                    ]
                }
            ],
            max_tokens=2000
        )

        result_text = response.choices[0].message.content.strip()

        # Strip markdown fences if AI wrapped response in them
        if result_text.startswith("```"):
            lines = result_text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            result_text = "\n".join(lines)
        if result_text.lower().startswith("json"):
            result_text = result_text[4:]

        analysis = json_lib.loads(result_text.strip())
        analysis["success"] = True
        analysis["image_name"] = req.name
        return analysis

    except (ValueError, json_lib.JSONDecodeError) as e:
        print(f"JSON Parse Error: {e}")
        raw = result_text[:500] if 'result_text' in locals() else ""
        return {"success": False, "error": "Failed to parse AI response", "raw": raw}
    except Exception as e:
        print(f"Analysis Error:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
