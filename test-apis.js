const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) process.env[key.trim()] = value.trim();
});

const API_KEY = process.env.GOOGLE_API_KEY;
const SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const SEARCH_CX = process.env.GOOGLE_SEARCH_CX;

console.log("=== API 설정 확인 ===");
console.log("Gemini API Key:", API_KEY ? "로드됨" : "누락됨");
console.log("Search API Key:", SEARCH_API_KEY ? "로드됨" : "누락됨");
console.log("Search CX ID:", SEARCH_CX ? "로드됨" : "누락됨");

async function testGemini() {
  console.log("\n=== 1. Gemini API 테스트 ===");
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent("안녕! 아주 짧게 인사해줘.");
    console.log("✅ Gemini 연결 성공! 응답:", result.response.text().trim());
  } catch (error) {
    console.error("❌ Gemini 연결 에러:", error.message);
  }
}

async function testGoogleSearch() {
  console.log("\n=== 2. Google Custom Search API 테스트 ===");
  try {
    const query = "김치찌개 레시피";
    const url = `https://www.googleapis.com/customsearch/v1?key=${SEARCH_API_KEY}&cx=${SEARCH_CX}&q=${encodeURIComponent(query)}&num=1`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.error) {
      console.error("❌ Search API 에러 반환됨:", data.error.message);
    } else if (data.items && data.items.length > 0) {
      console.log("✅ Search API 연결 성공! 결과 갯수:", data.items.length);
      console.log("첫 번째 제목:", data.items[0].title);
      console.log("첫 번째 링크:", data.items[0].link);
    } else {
      console.log("⚠️ Search API 연결은 성공했으나 검색 결과가 0건입니다.");
      console.log("   -> CX 설정에서 '전체 웹 검색(Search the entire web)'이 꺼져있을 확률이 99%입니다.");
    }
  } catch (error) {
    console.error("❌ Search API 통신 에러:", error.message);
  }
}

async function run() {
  await testGemini();
  await testGoogleSearch();
}

run();
