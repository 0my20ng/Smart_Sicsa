import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# React 연결 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 냉장고 재료 저장 리스트
ingredients_db = ["팽이버섯", "양배추", "계란"]

# 요청 데이터 형식
class Ingredient(BaseModel):
    name: str

# 재료 목록 가져오기
@app.get("/ingredients")
def get_ingredients():
    return ingredients_db

# 재료 추가
@app.post("/ingredients")
def add_ingredient(ingredient: Ingredient):
    ingredients_db.append(ingredient.name)
    return {
        "message": "재료 추가 완료",
        "ingredients": ingredients_db
    }

# Gemini API 설정 (발급받은 API 키 입력)
genai.configure(api_key="AIzaSyCi6bXoDAbPQZ183LP_cVRAlHz54BIF9-s")
model = genai.GenerativeModel('gemini-1.5-flash')

@app.get("/recommend-recipes")
async def recommend_recipes():
    ingredients_str = ", ".join(ingredients_db)
    
    # AI에게 '정확도(match_rate)'를 포함한 리스트 요청
    prompt = f"""
    내 냉장고 재료: {ingredients_str}
    
    위 재료를 기반으로 대학생이 할 수 있는 레시피들을 최대한 많이 제안해줘.
    결과는 반드시 아래 JSON 형식의 리스트로만 응답해:
    [
      {{
        "id": 1,
        "title": "요리이름",
        "ingredients": ["재료1", "재료2"],
        "match_rate": 95, 
        "description": "설명"
      }}
    ]
    * match_rate는 내 냉장고 재료와 레시피 재료가 얼마나 일치하는지 나타내는 0~100 사이의 숫자야.
    * 정확도가 높은 순서대로 정렬해서 보내줘.
    * 재료2까지만 쓰긴 했지만, 더 많은 재료들을 표기해줘. 내가 현재 보유하고 있는 재료는 앞쪽에 나타내줘.
    """

    try:
        response = model.generate_content(prompt)
        result_text = response.text.replace("```json", "").replace("```", "").strip()
        import json
        return json.loads(result_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail="AI 추천 생성 실패")