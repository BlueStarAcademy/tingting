# Railway 설정 — 따라하기 (BlueStarAcademy/tingting)

> 예상 시간: 15~20분  
> 완료 후 브라우저에서 TingTing 웹 앱 + PostgreSQL DB 사용 가능

---

## 체크리스트

- [ ] 1. Railway 프로젝트 + GitHub 연결
- [ ] 2. PostgreSQL 추가
- [ ] 3. tingting-api 배포 + Public URL
- [ ] 4. tingting-web 배포 + Public URL
- [ ] 5. CORS 연결 + 동작 확인

---

## 1. 프로젝트 만들기

1. [railway.app/new](https://railway.app/new) 접속
2. **Deploy from GitHub repo** 클릭
3. **BlueStarAcademy/tingting** 선택 (처음이면 GitHub 권한 허용)
4. 생성된 서비스 이름을 **`tingting-api`** 로 변경  
   (서비스 클릭 → 우측 상단 이름 또는 Settings)

> 첫 서비스는 API로 씁니다. Web은 4단계에서 **새 서비스**로 추가합니다.

---

## 2. PostgreSQL 추가

1. 프로젝트 캔버스(빈 공간) → **+ Create** 또는 **+ New**
2. **Database** → **Add PostgreSQL**
3. Postgres 서비스가 생기면 완료 (별도 설정 없음)

---

## 3. tingting-api 설정

`tingting-api` 서비스 클릭 → **Settings** 탭

### Build

| 필드 | 붙여넣을 값 |
|------|-------------|
| **Root Directory** | *(비워두기)* |
| **Build Command** | `npm install && npm run build:api` |
| **Start Command** | `npm run start:api` |

*(Railway UI에 Custom Build Command / Start Command 가 있다면 위 값 사용)*

### Variables

**+ New Variable** 로 아래 추가:

| Variable | 값 |
|----------|-----|
| `DATABASE_URL` | **Add Reference** → Postgres 서비스 → `DATABASE_URL` 선택 |
| `JWT_SECRET` | 아래 명령으로 생성한 32자+ 문자열 |
| `NODE_ENV` | `production` |

**JWT_SECRET 생성 (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

### Public URL

1. **Settings** → **Networking** → **Generate Domain**
2. URL 복사 (예: `https://tingting-api-production-a1b2.up.railway.app`)
3. 브라우저에서 **`(URL)/health`** 접속  
   → `{"ok":true,"service":"tingting-api"}` 이면 성공

### Deploy

**Deployments** 탭에서 최신 배포가 **Success** 인지 확인.  
실패 시 **View Logs** → `DATABASE_URL` / `Seeded N places` 확인.

---

## 4. tingting-web 설정

### 새 서비스 추가

1. 프로젝트 캔버스 → **+ Create** → **GitHub Repo**
2. **BlueStarAcademy/tingting** (같은 repo)
3. 서비스 이름: **`tingting-web`**

### Build

| 필드 | 값 |
|------|-----|
| **Build Command** | `npm install && npm run build:web` |
| **Start Command** | `npm run start:web` |

### Variables (⚠️ 빌드 전에 설정)

| Variable | 값 |
|----------|-----|
| `EXPO_PUBLIC_API_URL` | **3단계 API URL** (예: `https://tingting-api-production-a1b2.up.railway.app`) |

- 끝에 **`/` 없이** 입력
- `https://` 포함

### Public URL

1. **Networking** → **Generate Domain**
2. Web URL 복사 (예: `https://tingting-web-production-c3d4.up.railway.app`)

### Deploy

배포 Success 후 Web URL 브라우저에서 열기 → TingTing 로그인 화면

---

## 5. CORS 연결 (필수)

Web에서 로그인 시 CORS 오류가 나면:

1. **`tingting-api`** → **Variables**
2. 추가:
   ```
   CORS_ORIGIN=https://tingting-web-production-c3d4.up.railway.app
   ```
   *(본인 Web URL로 교체)*
3. API 서비스 **Redeploy** (Deployments → ⋮ → Redeploy)

---

## 6. 동작 확인

1. Web URL → **데모 모드** 클릭
2. 홈 화면 → 전국일주 진행도 표시
3. **+ 새 그룹** → 첫 그룹 FREE
4. 지도 탭 → 장소 목록

데이터는 Railway **PostgreSQL**에 저장됩니다 (데모 계정 포함).

---

## 자주 하는 실수

| 문제 | 원인 | 해결 |
|------|------|------|
| API 빌드 실패 | Start Command 미설정 | `npm run start:api` |
| Web 빌드 실패 | web deps | repo에 `.npmrc` legacy-peer-deps 있음 — redeploy |
| 로그인 네트워크 오류 | CORS | `CORS_ORIGIN` = Web URL |
| API URL 안 먹음 | Web만 redeploy 필요 | `EXPO_PUBLIC_API_URL` 변경 후 Web **재빌드** |
| health 502 | DB 미연결 | `DATABASE_URL` Reference 확인 |

---

## CLI로 설정 (선택)

```powershell
railway login
cd c:\project\TingTing
railway init          # 프로젝트 연결
railway add -d postgres
```

대시보드와 병행해도 됩니다.

---

## 다음 단계 (PWA / Web)

Railway Web URL을 연 뒤 브라우저에서 「체험하기」로 PWA 전체화면 실행을 확인하세요.
iPhone은 Safari → 공유 → 홈 화면에 추가 후 아이콘으로 실행하면 앱처럼 전체화면으로 뜹니다.
