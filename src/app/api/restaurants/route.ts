import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/restaurants
 *
 * 카카오 로컬 키워드 검색 API를 서버사이드에서 프록시합니다.
 * REST API 키를 클라이언트에 노출하지 않기 위해 이 라우트를 통해 호출합니다.
 *
 * 쿼리 파라미터 (카카오 로컬 API와 동일):
 *   - query: 검색 키워드 (예: "한식", "저렴한 일식")
 *   - x: 경도 (longitude)
 *   - y: 위도 (latitude)
 *   - radius: 반경 (미터, 최대 20000)
 *   - category_group_code: FD6 (음식점 고정)
 *   - sort: distance | accuracy
 *   - size: 결과 수 (최대 15)
 */
export async function GET(request: NextRequest) {
  // REST API 키 (서버 환경변수 — NEXT_PUBLIC_ 불필요)
  const restApiKey = process.env.KAKAO_REST_API_KEY;

  if (!restApiKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  // 클라이언트로부터 받은 쿼리 파라미터를 그대로 카카오 API로 전달
  const searchParams = request.nextUrl.searchParams;

  const kakaoUrl = new URL(
    "https://dapi.kakao.com/v2/local/search/keyword.json"
  );

  // 허용된 파라미터만 전달 (보안)
  const allowedParams = [
    "query",
    "x",
    "y",
    "radius",
    "category_group_code",
    "sort",
    "size",
    "page",
  ];
  allowedParams.forEach((key) => {
    const value = searchParams.get(key);
    if (value) kakaoUrl.searchParams.set(key, value);
  });

  try {
    const kakaoRes = await fetch(kakaoUrl.toString(), {
      headers: {
        // 카카오 로컬 API 인증: REST API 키 사용
        Authorization: `KakaoAK ${restApiKey}`,
      },
      // Next.js 서버 컴포넌트 캐시 비활성화 (실시간 검색)
      cache: "no-store",
    });

    if (!kakaoRes.ok) {
      const errorText = await kakaoRes.text();
      console.error(
        `[API Route] 카카오 로컬 API 오류: ${kakaoRes.status}`,
        errorText
      );
      return NextResponse.json(
        {
          error: `카카오 API 오류 (${kakaoRes.status})`,
          detail: errorText,
        },
        { status: kakaoRes.status }
      );
    }

    const data = await kakaoRes.json();

    // CORS 헤더 설정 (localhost 개발 환경)
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("[API Route] 서버 오류:", error);
    return NextResponse.json(
      { error: `서버 내부 오류: ${error?.message || error}` },
      { status: 500 }
    );
  }
}
