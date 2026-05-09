import os
import json
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 구형 google.generativeai 대신 신규 google.genai 사용
from google import genai
from google.genai import types

# .env 파일에서 환경 변수 로드 (현재 파일 위치 기준)
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI()

# Next.js 프론트엔드와의 CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 냉장고 재료 저장 리스트 (디폴트: 빈 상태)
ingredients_db = []

# 요청 데이터 형식
class Ingredient(BaseModel):
    name: str

class RecommendRequest(BaseModel):
    query: str = ""  # 선택적 검색어

# ─────────────────────────────────────────
# 재료 목록 조회
# ─────────────────────────────────────────
@app.get("/ingredients")
def get_ingredients():
    return ingredients_db

# ─────────────────────────────────────────
# 재료 추가
# ─────────────────────────────────────────
@app.post("/ingredients")
def add_ingredient(ingredient: Ingredient):
    ingredients_db.append(ingredient.name)
    return {
        "message": "재료 추가 완료",
        "ingredients": ingredients_db
    }

# ─────────────────────────────────────────
# Gemini API 설정 (환경 변수에서 키 로드)
# ─────────────────────────────────────────
API_KEY = os.getenv("GOOGLE_API_KEY", "")
if not API_KEY:
    raise RuntimeError("GOOGLE_API_KEY 환경 변수가 설정되어 있지 않습니다. Backend/.env 파일을 확인하세요.")

# 신규 SDK Client 생성
client = genai.Client(api_key=API_KEY)

# ─────────────────────────────────────────
# 레시피 추천 (Google Search 그라운딩 + 신규 SDK 문법)
# ─────────────────────────────────────────
@app.post("/recommend-recipes")
async def recommend_recipes(body: RecommendRequest):
    if not ingredients_db:
        raise HTTPException(status_code=400, detail="재료를 먼저 추가해주세요.")

    ingredients_str = ", ".join(ingredients_db)
    query_part = f"\n검색 키워드: {body.query}" if body.query.strip() else ""

    prompt = f"""
      당신은 전문 요리사입니다. 사용자가 가진 식재료 [{ingredients_str}]를 바탕으로 다음 작업을 수행하세요.{query_part}
      
      작업:
      1. 이 식재료들로 만들 수 있는 가장 인기 있는 레시피 3가지를 구글 검색을 통해 찾으세요.
      2. 각 레시피에 대해 실제 블로그 URL, 이미지 주소, 요리 설명을 수집하세요.
      3. 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 생략하세요.

      출력 형식:
      {{
        "recipes": [
          {{
            "title": "요리 이름",
            "ingredients": ["보유 재료"],
            "missingIngredients": ["부족한 재료"],
            "description": "상세한 레시피 설명",
            "link": "실제 블로그 주소",
            "imageUrl": "대표 이미지 주소"
          }}
        ]
      }}
    """

    try:
        # 신규 SDK 문법으로 구글 검색(google_search) 적용 및 응답 생성
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[{"google_search": {}}]
            )
        )
        text = response.text

        # JSON 블록 추출
        json_match = None
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            json_match = text[start:end]

        if not json_match:
            raise HTTPException(status_code=500, detail="AI 응답에서 JSON을 추출할 수 없습니다.")

        data = json.loads(json_match)
        return {"recipes": data.get("recipes", [])}

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI 응답 파싱 실패")
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="오늘의 무료 이용 한도를 모두 사용하셨습니다. 내일 다시 시도해 주세요."
            )
        raise HTTPException(status_code=500, detail=f"AI 추천 생성 실패: {error_msg}")