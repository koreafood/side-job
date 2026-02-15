# 운영/배포 가이드 (초보자용)

이 문서는 로컬 개발부터 운영 배포까지를 단계별로 설명합니다. 현재 저장소에 포함된 설정과 스크립트를 기준으로 작성되었습니다.

## 1. 실행 환경 요구사항

### 1.1 로컬 개발

- Node.js 18 이상
- Python 3.9 이상
- npm (또는 pnpm/yarn)

### 1.2 서버 운영

- Ubuntu/Debian 계열 서버 권장
- Nginx 또는 Caddy
- systemd 사용 가능 환경

## 2. 로컬 개발 방법

### 2.1 프론트엔드

```bash
npm install
npm run dev
```

- 기본 개발 서버: http://localhost:5173

### 2.2 백엔드

```bash
python -m venv venv
source venv/bin/activate
pip install -r api/requirements.txt
python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

- API 서버: http://localhost:8000
- 헬스 체크: http://localhost:8000/api/health

## 3. 환경 변수

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| API_ORIGIN | 업로드 URL을 절대 경로로 만들 때 사용 | http://localhost:8000 |
| VERCEL | Vercel 환경 여부 (1이면 /tmp 경로 사용) | 미설정 |

## 4. 배포 방식 선택

이 프로젝트는 2가지 배포 방식을 지원합니다.

1. **Vercel 배포**
2. **서버 배포 (Proxmox 또는 일반 VM)**  

---

## 5. Vercel 배포

### 5.1 설정 파일

`vercel.json`에서 다음이 정의되어 있습니다.

- FastAPI 서버: `api/main.py` → `@vercel/python`
- 프론트 빌드: `package.json` → `@vercel/static-build`
- 라우팅:
  - `/api/*`, `/uploads/*` → Python 서버로 전달
  - 그 외 → `index.html`

### 5.2 주의사항

- Vercel에서는 파일 시스템이 읽기 전용이므로 DB/업로드는 `/tmp` 경로 사용
- 업로드 파일은 휘발성일 수 있으므로 영속 저장이 필요하면 외부 스토리지 필요

---

## 6. 서버 배포 (Proxmox/VM)

### 6.1 기본 흐름

1. 서버 준비 (Ubuntu/Debian)
2. 프론트 빌드 → dist 생성
3. Python venv 설치 및 API 실행
4. Nginx/Caddy로 정적 파일 제공 + API 프록시
5. systemd로 백엔드 서비스 등록

### 6.2 참고 문서

- 기존 배포 문서: `deploy.md`

### 6.3 Caddy 예시

```caddy
example.com {
  root * /srv/lalawon/app/dist
  file_server

  reverse_proxy /api/* 127.0.0.1:8000
  reverse_proxy /uploads/* 127.0.0.1:8000
}
```

---

## 7. 자동 배포 스크립트 사용

스크립트: `scripts/deploy.sh`

### 7.1 주요 기능

- 로컬에서 프론트 빌드
- 서버로 dist, api 소스 전송
- Python venv 설치 및 의존성 설치
- systemd 서비스 생성/재시작
- 백업 자동화 옵션 제공

### 7.2 기본 실행 예시

```bash
scripts/deploy.sh --host 192.168.0.10 --user ubuntu --path /srv/lalawon/app --domain example.com
```

### 7.3 주요 옵션

| 옵션 | 설명 |
| --- | --- |
| --host | 서버 IP/호스트 |
| --user | 원격 사용자 |
| --path | 배포 경로 |
| --domain | 도메인 |
| --api-port | 백엔드 포트 |
| --api-origin | API_ORIGIN 강제 지정 |
| --enable-ssl | HTTPS 설정 여부 |
| --enable-backup | 백업 자동화 여부 |
| --backup-retention-days | 백업 보관 일수 |
| --backup-time | 백업 실행 시각 |

---

## 8. 로그 확인

### 8.1 백엔드(systemd)

```bash
journalctl -u lalawon-api -f
```

### 8.2 웹 서버 (Nginx/Caddy)

- Nginx: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- Caddy: `/var/log/caddy/` (환경에 따라 다를 수 있음)

---

## 9. 롤백 전략

### 9.1 프론트

- dist 폴더를 이전 빌드로 교체
- 또는 이전 배포 아티팩트 복구

### 9.2 백엔드

- 이전 소스 및 `api` 디렉터리로 복원
- systemd 재시작으로 서비스 재구동

### 9.3 DB

- 백업 파일(`api/app.db`, `api/uploads`) 복원
- 배포 스크립트의 백업 기능 활용 가능

---

## 10. 모니터링/운영 체크리스트

- `/api/health` 정상 응답 확인
- `/uploads/*` 경로 접근 확인
- DB 파일 및 업로드 디렉터리 권한 확인
- systemd 서비스 상태 확인
- 주기 백업 파일 생성 여부 확인
