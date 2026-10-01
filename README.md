# CommunityViewer 웹버전

[웹버전 열기](https://kwww-aniki.github.io/CommunityViewer-Web/)

Android 앱과 같은 게시판 목록을 사용하는 브라우저용 즐겨찾기 화면입니다. 별도 서버나 빌드 도구 없이 정적 파일로 실행됩니다.

- 사이트 → 구역 → 게시판 탐색과 검색
- 게시판 즐겨찾기, 직접 URL 추가, 순서 변경
- Android 앱의 `CommunityViewerFavorites` JSON 백업 파일 가져오기 및 내보내기
- 휴대폰 홈 화면에 추가할 수 있는 PWA

게시판을 누르면 원래 웹사이트가 새 탭에서 열립니다. Android 앱의 WebView 광고 숨김, 글자 크기 조절, 웹페이지 제스처는 웹버전에서 제공하지 않습니다. 즐겨찾기는 각 브라우저의 로컬 저장소에 저장됩니다.

로컬에서 확인하려면 저장소 루트에서 `python -m http.server 8000 -d web`을 실행하고 `http://localhost:8000`을 엽니다. `index.html`을 파일로 직접 열면 게시판 목록을 불러올 수 없습니다.

Android의 게시판 목록을 변경했다면 `python tools/export_web_catalog.py`를 실행해 `web/catalog.json`을 다시 생성합니다.

웹 파일은 별도의 공개 저장소인 [CommunityViewer-Web](https://github.com/kwww-aniki/CommunityViewer-Web)에 배포됩니다. Android 앱 저장소와 사용자의 개인 즐겨찾기 데이터는 이 공개 저장소에 포함되지 않습니다.
