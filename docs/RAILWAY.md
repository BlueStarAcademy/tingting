# TingTing Railway 배포 가이드

[BlueStarAcademy/tingting](https://github.com/BlueStarAcademy/tingting) 저장소를 Railway에 **3개 서비스**로 배포합니다.

```
브라우저 → tingting-web (Expo Web)
              ↓ API
         tingting-api (Node.js)
              ↓
         PostgreSQL (Railway DB)
```

---

## 1단계: Railway 프로젝트 생성

1. [railway.app](https://railway.app) 로그인
2. **New Project** → **Deploy from GitHub repo**
3. **BlueStarAcademy/tingting** 선택

---

## 2단계: PostgreSQL 추가

1. 프로젝트 화면 → **+ New** → **Database** → **Add PostgreSQL**
2. Postgres 서비스 클릭 → **Variables** 탭에서 `DATABASE_URL` 확인

---

## 3단계: API 서비스 (tingting-api)

### 서비스 추가

1. **+ New** → **GitHub Repo** → 같은 `tingting` 저장소 선택
2. 서비스 이름: `tingting-api`

### Settings → Build

| 항목 | 값 |
|------|-----|
| **Root Directory** | `/` (기본) |
| **Build Command** | `npm install && npm run build:api` |
| **Start Command** | `npm run start:api` |

### Variables

| Variable | 값 |
|----------|-----|
| `DATABASE_URL` | Postgres 서비스 → **Add Reference** → `DATABASE_URL` |
| `JWT_SECRET` | 32자 이상 랜덤 문자열 (예: `openssl rand -hex 32`) |
| `SUPABASE_URL` | Supabase 프로젝트 URL (예: `https://xxx.supabase.co`) |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Settings → API → JWT Secret |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public key |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | *(4단계 Web URL 생성 후 입력)* |

### Public URL

1. **Settings** → **Networking** → **Generate Domain**
2. 예: `https://tingting-api-production-xxxx.up.railway.app`
3. `/health` 접속 시 `{"ok":true}` 확인

---

## 4단계: Web 서비스 (tingting-web)

### 서비스 추가

1. **+ New** → **GitHub Repo** → `tingting`
2. 서비스 이름: `tingting-web`

### Settings → Build

| 항목 | 값 |
|------|-----|
| **Build Command** | `npm install && npm run build:web` |
| **Start Command** | `npm run start:web` |

### Variables (빌드 시 주입)

| Variable | 값 |
|----------|-----|
| `EXPO_PUBLIC_API_URL` | 3단계 API Public URL (끝 `/` 없이) |
| `EXPO_PUBLIC_SITE_URL` | Web Public URL (예: `https://tingting-web-production-xxxx.up.railway.app`) |
| `PORT` | Railway가 자동 설정 (수동 입력 불필요) |

> **중요:** `EXPO_PUBLIC_API_URL`은 **빌드 타임** 변수입니다. API URL 변경 시 Web 서비스 **Redeploy** 필요.

### Public URL

1. **Generate Domain** → 예: `https://tingting-web-production-xxxx.up.railway.app`

### API CORS 업데이트

`tingting-api` Variables에서:

```
CORS_ORIGIN=https://tingting-web-production-xxxx.up.railway.app
```

API 서비스 **Redeploy**.

---

## 5단계: 사용하기

1. Web URL 브라우저에서 열기
2. **데모 모드** 또는 **회원가입** → PostgreSQL에 데이터 저장
3. 홈 → 그룹 생성 → 지도 → 방문 기록 → 퀘스트

---

## 로컬에서 Railway 연동 테스트

```powershell
# Postgres (Railway DATABASE_URL 복사)
$env:DATABASE_URL="postgresql://..."
$env:JWT_SECRET="local-dev-secret"
cd c:\project\TingTing
npm install
npm run build:api
npm run start:api

# 다른 터미널
cd c:\project\TingTing\apps\mobile
$env:EXPO_PUBLIC_API_URL="http://localhost:3000"
npx expo start --web
```

---

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| CORS 오류 | `CORS_ORIGIN` = Web URL 정확히 일치 (https 포함) |
| API 502 | Logs에서 `DATABASE_URL` / migrate 오류 확인 |
| 로그인 실패 | API `/health` 먼저 확인 |
| 빈 지도 | API 기동 시 `Seeded N places` 로그 확인 |
| Web 빌드 실패 | 로컬 `npm run build:web` 실행 후 오류 수정 |

---

## 비용

- Railway Hobby: 월 $5 크레딧 (3 서비스 + DB)
- 트래픽 증가 시 Usage 기반 과금

---

## 자동 배포

GitHub `main` 브랜치 push → Railway 3 서비스 자동 재배포.

Web만 API URL 변경 시: API Variables 수정 → Web **Redeploy** (재빌드).
