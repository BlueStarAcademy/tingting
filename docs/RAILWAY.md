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
| `COUPLE_USER1_EMAIL` / `COUPLE_USER1_PASSWORD` / `COUPLE_USER1_NAME` | 첫 번째 계정 |
| `COUPLE_USER2_EMAIL` / `COUPLE_USER2_PASSWORD` / `COUPLE_USER2_NAME` | 두 번째 계정 |
| `KAKAO_REST_API_KEY` | [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 앱 키 → REST API 키 |

- 두 계정은 서버가 시작될 때 **없으면** 생성됩니다. 이미 있는 계정의 비밀번호는 덮어쓰지 않으니, 이후 변경은 앱 **설정 → 비밀번호 변경**에서 하세요.
- 카카오 키가 없으면 장소 검색만 꺼지고 직접 입력은 그대로 됩니다.

## 5. 데이터베이스 마이그레이션

서버 시작 시 `apps/api/migrations/*.sql`을 순서대로 한 번씩 적용합니다 (`schema_migrations` 테이블로 기록).

> `100_couple_schema.sql`은 예전 상업용 테이블을 **모두 삭제**하고 커플 전용 스키마를 새로 만듭니다. 기존 데이터가 필요하면 첫 배포 전에 백업하세요.

## 6. 앱 연결

- EAS 빌드/업데이트 시 `EXPO_PUBLIC_API_URL`을 API 공개 주소로 설정 (`apps/mobile/eas.json`의 env)
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
