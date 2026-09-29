# TingTing Railway 배포 가이드 (우리 둘 전용)

Railway 프로젝트 하나에 **API 서비스 + PostgreSQL + Volume**만 둡니다. 웹 서비스는 없습니다.

```
안드로이드/iOS 앱 → tingting-api (Node.js, 사진 파일은 Volume /data/uploads)
                        ↓
                  PostgreSQL (Railway DB)
```

---

## 1. PostgreSQL

1. 프로젝트 → **+ New** → **Database** → **Add PostgreSQL**

## 2. API 서비스 (tingting-api)

1. **+ New** → **GitHub Repo** → `tingting` 저장소
2. 빌드/시작 명령은 `nixpacks.toml` / `railway.api.toml` 기준 (`npm run build:api`, `npm run start:api`)
3. **Settings → Networking → Generate Domain** 으로 공개 주소 생성
4. `/health` 접속 시 `{"ok":true, "coupleAccounts":2, "kakaoSearch":true}` 확인

## 3. Volume (사진 저장소)

1. `tingting-api` 서비스 → **+ New Volume** (또는 서비스 우클릭 → Attach Volume)
2. Mount path: `/data/uploads`
3. Variables에 `UPLOADS_DIR=/data/uploads`

> Volume이 없으면 재배포할 때마다 사진 파일이 사라집니다.

## 4. Variables (tingting-api)

| Variable | 값 |
|----------|-----|
| `DATABASE_URL` | Postgres → **Add Reference** → `DATABASE_URL` |
| `JWT_SECRET` | 32자 이상 랜덤 문자열 (`openssl rand -hex 32`) |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `*` |
| `PUBLIC_API_URL` | 2단계에서 만든 공개 주소 (끝 `/` 없이) |
| `UPLOADS_DIR` | `/data/uploads` |
| `APP_KEY` | 랜덤 문자열. 앱의 `EXPO_PUBLIC_APP_KEY`와 **같은 값** |
| `COUPLE_USER1_NAME` / `COUPLE_USER2_NAME` | (선택) 처음 만들 두 사람 이름. 기본값 `나` / `너` |
| `KAKAO_REST_API_KEY` | [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 앱 키 → REST API 키 |
| `MYBOX_TOKEN` | (선택) [MYBOX Open API](https://developers.mybox.naver.com/) 개인 액세스 토큰. 설정하면 사진을 마이박스에 백업 |
| `MYBOX_FOLDER_NAME` | (선택) 마이박스 백업 폴더 이름. 기본값 `TingTing 사진 백업` |

- 로그인은 없습니다. 앱을 처음 열 때 "누구세요?"에서 한 번 고르면 이후엔 바로 홈으로 들어갑니다.
- 두 사람은 서버가 시작될 때 **없으면** 생성됩니다. 이름은 앱 **설정 → 내 이름**에서 바꾸세요.
- `APP_KEY`가 없으면 API 주소를 아는 누구나 들어올 수 있으니 꼭 설정하세요.
- 카카오 키가 없으면 장소 검색만 꺼지고 직접 입력은 그대로 됩니다.
- 마이박스 백업: 볼륨의 사진 중 아직 백업되지 않은 것을 업로드 직후·서버 시작 시·30분마다 `MYBOX_FOLDER_NAME/YYYY-MM/`에 올립니다. 앱에서 사진을 지워도 마이박스 사본은 남습니다. 토큰이 만료되면 `/health`의 `myboxBackup.lastError`에 표시되고, 새 토큰을 넣으면 밀린 사진부터 이어서 올립니다.

## 5. 데이터베이스 마이그레이션

서버 시작 시 `apps/api/migrations/*.sql`을 순서대로 한 번씩 적용합니다 (`schema_migrations` 테이블로 기록).

> `100_couple_schema.sql`은 예전 상업용 테이블을 **모두 삭제**하고 커플 전용 스키마를 새로 만듭니다. 기존 데이터가 필요하면 첫 배포 전에 백업하세요.

## 6. 앱 연결

- EAS 빌드/업데이트 시 `EXPO_PUBLIC_API_URL`을 API 공개 주소로 설정 (`apps/mobile/eas.json`의 env)
- `EXPO_PUBLIC_APP_KEY`는 저장소에 커밋하지 말고 따로 넣습니다
  - OTA 업데이트: GitHub repo **Settings → Secrets → Actions**에 `APP_KEY`
  - EAS 빌드: `eas env:create --name EXPO_PUBLIC_APP_KEY --value <값> --environment preview --environment production`
- 기존 `tingting-web` 서비스가 있다면 Railway에서 삭제해도 됩니다.

---

## 로컬 개발

```powershell
npm run sync:env        # Railway 변수 → .env (선택)
npm run dev:api         # API :3000 (UPLOADS_DIR=apps/api/uploads)
npm run mobile          # Expo (apps/mobile/.env의 EXPO_PUBLIC_API_URL 사용)
```

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| API 502 | Logs에서 `DATABASE_URL` / migrate 오류 확인 |
| 로그인 실패 | `/health`의 `coupleAccounts`가 2인지, 이메일 오타 확인 |
| 장소 검색 503 | `KAKAO_REST_API_KEY` 설정 후 재배포 |
| 사진이 사라짐 | Volume 마운트(`/data/uploads`)와 `UPLOADS_DIR` 확인 |
| 사진 주소가 http:// 로 나옴 | `PUBLIC_API_URL`을 https 주소로 설정 |
