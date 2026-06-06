import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class DatabaseHelper:
    """
    식재료 데이터를 영구 보관하는 데이터베이스 헬퍼 클래스.
    현재는 로컬의 'ingredients.json' 파일에 저장하며, 
    추후 Firebase Firestore 연동 코드로 쉽게 이식이 가능하도록 독립적으로 설계되었습니다.
    """
    def __init__(self, file_name: str = "ingredients.json"):
        self.file_path = Path(__file__).parent / file_name
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """저장 파일이 없을 경우 빈 배열로 파일을 자동 초기화합니다."""
        if not self.file_path.exists():
            try:
                self.save_ingredients([])
                logger.info(f"[Database] {self.file_path.name} 파일 신규 생성 완료")
            except Exception as e:
                logger.error(f"[Database] 초기 파일 생성 중 에러: {e}")

    def load_ingredients(self) -> list[str]:
        """로컬 파일에서 저장된 식재료 목록을 읽어옵니다. 에러 발생 시 빈 배열을 반환합니다."""
        try:
            if self.file_path.exists():
                raw = self.file_path.read_text(encoding="utf-8")
                data = json.loads(raw)
                if isinstance(data, list):
                    return data
                logger.warning(f"[Database] {self.file_path.name} 파일 데이터가 리스트 형식이 아닙니다.")
        except Exception as e:
            logger.error(f"[Database] 식재료 로드 실패: {e}")
        return []

    def save_ingredients(self, ingredients: list[str]) -> None:
        """식재료 목록을 로컬 JSON 파일에 영구 저장합니다."""
        try:
            self.file_path.write_text(
                json.dumps(ingredients, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            logger.info(f"[Database] 식재료 데이터 저장 성공 (총 {len(ingredients)}개)")
        except IOError as e:
            logger.error(f"[Database] 파일 저장 중 입출력 에러: {e}")
            raise RuntimeError("식재료 데이터를 디스크에 저장하는 과정에서 오류가 발생했습니다.")
