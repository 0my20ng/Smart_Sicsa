"""
create_food.py
──────────────
Smart Sicsa 백엔드 메인 FastAPI 애플리케이션.
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Path as FPath, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from google import genai
from google.genai import types

# 프롬프트 및 데이터베이스 모듈 임포트
from .prompts import build_recipe_analysis_prompt

import requests
from bs4 import BeautifulSoup

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# .env 로드
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# 무상태(Stateless) 백엔드: DB를 사용하지 않고 요청 바디의 데이터를 사용합니다.

# ─────────────────────────────────────────
# Pydantic 모델 정의
# ─────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = Field(examples=["ok"], description="서버 상태 (ok / degraded)")
    version: str = Field(examples=["1.0.0"], description="API 버전")
    ingredients_count: int = Field(examples=[5], description="현재 저장된 재료 수")

class IngredientListResponse(BaseModel):
    ingredients: List[str] = Field(examples=[["달걀", "김치", "두부"]], description="저장된 재료 목록")
    count: int = Field(examples=[3], description="재료 총 개수")

class IngredientMutateResponse(BaseModel):
    message: str = Field(examples=["'달걀' 추가 완료"], description="처리 결과 메시지")
    ingredients: List[str] = Field(examples=[["달걀", "김치"]], description="변경 후 전체 재료 목록")

class RecipeItem(BaseModel):
    title: str = Field(examples=["돼지고기 김치찌개 황금레시피"], description="요리 이름")
    ingredients: List[str] = Field(examples=[["돼지고기", "김치", "두부"]], description="보유 재료 목록")
    missingIngredients: List[str] = Field(default=[], examples=[["대파", "새우젓"]], description="부족하여 추가 구매가 필요한 재료 목록")
    description: str = Field(examples=["얼큰하고 깊은 맛의 김치찌개입니다."], description="요리 소개 및 핵심 조리법 요약")
    link: Optional[str] = Field(default=None, examples=["https://blog.naver.com/example/123456"], description="원본 블로그 포스팅 URL")
    imageUrl: Optional[str] = Field(default=None, examples=["https://example.com/image.jpg"], description="요리 완성 사진 URL")

class RecipeListResponse(BaseModel):
    recipes: List[RecipeItem] = Field(description="AI 추천 레시피 목록")
    count: int = Field(examples=[3], description="추천된 레시피 수")
    recommendedMenus: Optional[List[str]] = Field(default=None, description="추천된 요리 메뉴 리스트")

class ErrorResponse(BaseModel):
    detail: str = Field(examples=["재료를 먼저 입력해주세요."], description="오류 메시지")

class IngredientRequest(BaseModel):
    name: str = Field(examples=["달걀"], description="추가할 재료 이름", min_length=1, max_length=50)

class RecommendRequest(BaseModel):
    query: str = Field(default="", examples=["매운 요리"], description="추가 검색 키워드")
    ingredients: List[str] = Field(default=[], examples=[["달걀", "김치"]], description="전달하는 보유 재료 목록")

# ─────────────────────────────────────────
# FastAPI 초기화
# ─────────────────────────────────────────
app = FastAPI(
    title="🎓 Smart Sicsa API",
    description="Google Gemini AI + Google Search 그라운딩 기반 실시간 레시피 추천 백엔드 API",
    version="1.0.0",
)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini API 클라이언트 초기화
API_KEY = os.getenv("GOOGLE_API_KEY", "")
if not API_KEY:
    raise RuntimeError("GOOGLE_API_KEY 환경 변수가 설정되어 있지 않습니다.")

try:
    client = genai.Client(api_key=API_KEY)
    logger.info("Gemini API 클라이언트 초기화 완료")
except Exception as e:
    raise RuntimeError(f"Gemini API 클라이언트 초기화 실패: {e}")

# ─────────────────────────────────────────
# 라우터 엔드포인트 정의
# ─────────────────────────────────────────

@app.get("/health", tags=["system"], response_model=HealthResponse)
def health_check():
    """서버 상태 모니터링용"""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        ingredients_count=0, # Stateless이므로 항상 0 반환
    )

# 프론트엔드가 Firestore를 직접 관리하므로 기존 /ingredients CRUD API는 제거되었습니다.

@app.post("/recommend-recipes", tags=["recipes"], response_model=RecipeListResponse)
def recommend_recipes(body: RecommendRequest):
    """실시간 구글 검색 API 및 스크래핑 기반 RAG 레시피 추천"""
    # 프론트엔드가 요청 바디로 전송한 재료만 사용 (Stateless)
    effective_ingredients = body.ingredients

    if not effective_ingredients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="재료를 먼저 입력해주세요. 냉장고 재료를 추가한 후 검색해 보세요.",
        )

    ingredients_str = ", ".join(effective_ingredients)
    query_part = body.query.strip() if body.query.strip() else ""

    # [Fallback Mock 정의]
    def run_mock_fallback(reason: str):
        logger.warning(f"Mock Fallback 실행 이유: {reason}")
        mock_items = [
            RecipeItem(
                title=f"[예시] {body.query or '김치찌개'} 황금레시피 (검색 연결 확인 필요)",
                ingredients=effective_ingredients,
                missingIngredients=["돼지고기", "대파"],
                description=f"검색 과정 중 오류가 발생하여 임시 예시를 노출합니다. ({reason})",
                link="https://www.10000recipe.com/",
                imageUrl="https://via.placeholder.com/150/orange/white?text=MockRecipe"
            )
        ]
        return RecipeListResponse(recipes=mock_items, count=1, recommendedMenus=[body.query or "김치찌개"])

    try:
        # [Step 1: Gemini 구글 검색 호출 대신 5가지 메뉴 이름 추출]
        logger.info(f"[Recommend API] Step 1: Gemini 메뉴 추천 호출 | 재료: [{ingredients_str}] | 키워드: '{query_part}'")
        
        search_prompt = f"""
사용자 보유 식재료: [{ingredients_str}]
추가 요청사항: [{query_part}]

역할: 당신은 냉장고 파먹기 요리 전문가입니다. 사용자의 식재료와 요청사항을 고려해 추천할 만한 대표 요리 5가지를 선정해 주세요.
태스크:
구글 검색(google_search)을 사용하여 위의 식재료와 요청사항에 가장 어울리는 요리 5가지를 찾고, 각 요리별로 참고할 수 있는 가장 정확하고 대표적인 한국 요리 레시피 블로그 포스팅 또는 웹사이트의 실제 URL 링크를 1개씩(총 5개) 반드시 찾아서 나열해 주세요.
주의사항: 
1. 제공된 모든 식재료를 전부 활용해야만 하는 것은 아닙니다.
"""

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=search_prompt,
                config=types.GenerateContentConfig(
                    tools=[{"google_search": {}}]
                ),
            )
        except Exception as e:
            logger.warning(f"[Recommend API] lite 모델 Google Search 호출 실패, flash로 폴백 시도: {e}")
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=search_prompt,
                config=types.GenerateContentConfig(
                    tools=[{"google_search": {}}]
                ),
            )

        google_sources = []
        try:
            if hasattr(response, 'candidates') and response.candidates:
                metadata = response.candidates[0].grounding_metadata
                if metadata and hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                    for chunk in metadata.grounding_chunks:
                        if hasattr(chunk, 'web') and chunk.web:
                            google_sources.append({
                                "title": chunk.web.title,
                                "link": chunk.web.uri
                            })
            logger.info(f"[Recommend API] Google Grounding에서 진짜 소스 {len(google_sources)}개 추출 성공")
        except Exception as ex:
            logger.error(f"[Recommend API] Metadata 소스 추출 실패: {ex}")

        if not google_sources:
            return run_mock_fallback("구글 검색 결과 소스를 가져오지 못했습니다. (Grounding 실패)")

        recipes = []
        recommended_menus = []
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        has_429_error = False

        # 상위 최대 5개의 구글 검색 결과 처리
        for idx, src in enumerate(google_sources[:5]):
            link = src["link"]
            title_guess = src["title"]
            logger.info(f"[{idx+1}/5] 스크래핑 시도: {link}")
            
            body_text = ""
            final_url = link
            thumbnail = "https://via.placeholder.com/150/green/white?text=Recipe"
            
            try:
                # 리다이렉션 따라가기
                page_res = requests.get(link, headers=headers, timeout=5)
                if page_res.status_code == 200:
                    final_url = page_res.url
                    soup = BeautifulSoup(page_res.text, "html.parser")
                    
                    # 불필요 태그 제거
                    for s in soup(["script", "style", "iframe", "header", "footer", "nav", "noscript"]):
                        s.extract()
                    
                    # 네이버 블로그 / 만개의레시피 등 타겟 텍스트 추출
                    if "blog.naver.com" in final_url:
                        body_text = soup.select_one(".se-main-container, .se-viewer")
                        body_text = body_text.get_text(separator=" ") if body_text else soup.get_text(separator=" ")
                    elif "10000recipe.com" in final_url:
                        body_text = soup.select_one("#contents_area, .view2_summary")
                        body_text = body_text.get_text(separator=" ") if body_text else soup.get_text(separator=" ")
                    else:
                        body_text = soup.get_text(separator=" ")
                    
                    body_text = " ".join(body_text.split())[:2500] # 최대 2500자 제한
                    
                    # 메타 태그에서 이미지 추출 시도 (og:image)
                    og_image = soup.find("meta", property="og:image")
                    if og_image and og_image.get("content"):
                        thumbnail = og_image.get("content")
            except Exception as ex:
                logger.warning(f"스크래핑 실패 ({link}): {ex}")
                body_text = "본문 추출 실패"

            try:
                # [Step 2: AI 상세 분석 및 조리 과정 요약]
                analysis_prompt = build_recipe_analysis_prompt(ingredients_str, body_text, title_guess)
                try:
                    analysis_res = client.models.generate_content(
                        model="gemini-2.5-flash-lite",
                        contents=analysis_prompt,
                    )
                except Exception as e:
                    logger.warning(f"lite 모델 상세 분석 실패, flash로 폴백 시도: {e}")
                    analysis_res = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=analysis_prompt,
                    )
                
                analysis_text = analysis_res.text
                clean_analysis_json = analysis_text.replace("```json", "").replace("```", "").strip()
                a_start = clean_analysis_json.find("{")
                a_end = clean_analysis_json.rfind("}") + 1
                
                analysis_data = json.loads(clean_analysis_json[a_start:a_end])
                
                recipe_title = analysis_data.get("title", title_guess)
                description = analysis_data.get("description", "조리 과정 요약이 없습니다.")
                
                recommended_menus.append(recipe_title)
                recipes.append(
                    RecipeItem(
                        title=recipe_title,
                        ingredients=effective_ingredients,
                        missingIngredients=analysis_data.get("actualMissingIngredients", []),
                        description=description,
                        link=final_url,
                        imageUrl=thumbnail
                    )
                )
            except Exception as item_ex:
                logger.error(f"아이템 분석 중 에러 ({title_guess}): {item_ex}")
                if "429" in str(item_ex) or "RESOURCE_EXHAUSTED" in str(item_ex):
                    has_429_error = True
                continue

        if not recipes:
             if has_429_error:
                 raise HTTPException(
                     status_code=429,
                     detail="API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
                 )
             return run_mock_fallback("추천 레시피 생성 실패")

        logger.info(f"[Recommend API] 최종 {len(recipes)}개 RAG 기반 레시피 카드 생성 완료!")
        return RecipeListResponse(recipes=recipes, count=len(recipes), recommendedMenus=recommended_menus)

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"JSON 파싱 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 응답 파싱 실패",
        )
    except Exception as e:
        logger.error(f"서버 에러 발생: {e}")
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"추천 처리 중 알 수 없는 에러가 발생했습니다: {error_msg}"
        )