# deploy.sh 학습용 문서

이 문서는 `/scripts/deploy.sh`가 수행하는 모든 동작을 초보자도 이해할 수 있게 설명합니다. 실제 배포 자동화를 이해하고 수정할 수 있도록 흐름과 옵션, 생성되는 파일까지 상세히 정리했습니다.

## 1. 스크립트 개요

`deploy.sh`는 다음 작업을 자동으로 수행합니다.

1. 로컬에서 프론트 빌드 (`npm ci`, `npm run build`)
2. 서버에 정적 파일(dist)과 백엔드 코드 전송
3. 서버에 Python venv 및 의존성 설치
4. systemd 서비스 생성 및 실행
5. (옵션) 백업 서비스/타이머 설치
6. Nginx 설정 파일 생성 및 적용
7. (옵션) HTTPS 인증서 발급 및 적용

즉, 이 스크립트 하나로 빌드부터 웹서버 설정까지 자동으로 완료됩니다.

## 2. 주요 전제 조건

### 2.1 로컬 환경

- Node.js 설치 필요
- npm 사용 가능해야 함
- ssh 또는 sshpass 사용 가능

### 2.2 서버 환경

- Ubuntu/Debian 계열
- sudo 권한이 있는 사용자
- nginx 설치 가능
- systemd 사용 가능

## 3. 주요 변수와 기본값

스크립트 시작 부분에 기본값이 선언되어 있으며, 환경변수 또는 CLI 옵션으로 덮어쓸 수 있습니다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| SERVER_HOST | 192.168.0.63 | 서버 IP/호스트 |
| SERVER_USER | ubuntu | SSH 접속 사용자 |
| REMOTE_PATH | /srv/lalawon/app | 서버 배포 경로 |
| DOMAIN | home.lala.dedyn.io | 서비스 도메인 |
| API_PORT | 8001 | FastAPI 서버 포트 |
| SERVICE_NAME | lalawon-api | systemd 서비스명 |
| SITE_NAME | lalawon | nginx 사이트명 |
| ENABLE_SSL | false | HTTPS 적용 여부 |
| CERTBOT_EMAIL | you@example.com | SSL 이메일 |
| ENABLE_BACKUP | true | 백업 기능 사용 여부 |
| BACKUP_RETENTION_DAYS | 14 | 백업 보관 일수 |
| BACKUP_TIME | 03:00 | 백업 실행 시각 |
| BACKUP_DIR | /srv/lalawon/app/backups | 백업 저장 경로 |

## 4. CLI 옵션 설명

스크립트 실행 시 다음 옵션을 사용할 수 있습니다.

```bash
scripts/deploy.sh \
  --host 192.168.0.10 \
  --user ubuntu \
  --path /srv/lalawon/app \
  --domain example.com \
  --api-port 8001 \
  --api-origin https://example.com \
  --enable-ssl true \
  --certbot-email admin@example.com \
  --enable-backup true \
  --backup-retention-days 14 \
  --backup-time 03:00 \
  --backup-dir /srv/lalawon/app/backups \
  --sudo-pass "비밀번호" \
  --ssh-pass "비밀번호"
```

### 주의: 비밀번호 옵션

- `--ssh-pass`: SSH 비밀번호가 필요할 때 사용
- `--sudo-pass`: sudo 비밀번호가 필요할 때 사용

이 옵션들을 사용하면 비밀번호가 스크립트 기록에 남을 수 있으니 운영 환경에서는 SSH 키 사용을 권장합니다.

## 5. 실행 흐름 상세

### 5.1 입력 파싱

`while [[ $# -gt 0 ]]` 구문으로 CLI 옵션을 파싱하여 변수에 저장합니다.

### 5.2 API_ORIGIN 결정

`API_ORIGIN`은 백엔드가 업로드 URL을 절대 경로로 바꿀 때 사용됩니다.

- 도메인이 있으면 `https://도메인`
- 도메인이 없으면 `http://SERVER_HOST`
- `--api-origin`을 주면 그 값을 강제로 사용

### 5.3 로컬 빌드

```bash
npm ci
npm run build
```

로컬에서 프론트엔드 빌드를 먼저 수행합니다. 실패하면 배포가 중단됩니다.

### 5.4 SSH 준비

- SSH 비밀번호가 있으면 `sshpass` 사용
- 없으면 기본 SSH 키 인증 사용

서버 접속 테스트도 먼저 수행합니다.

### 5.5 원격 디렉터리 준비

- `/dist`, `/api`, `/api/uploads` 폴더 생성
- `api/app.db` 파일 생성
- 소유권 변경

### 5.6 정적 파일 전송

로컬 `dist/` 폴더 전체를 서버로 복사합니다.

### 5.7 백엔드 코드 전송

- `api/*.py` 파일 전송
- `api/requirements.txt` 전송

### 5.8 서버 의존성 설치

- Python, venv, nginx, sqlite 설치
- 서버에 `.venv` 생성 후 requirements 설치

### 5.9 systemd 서비스 생성

- `lalawon-api.service` 유닛 생성
- API_ORIGIN 환경변수 포함
- systemd 등록 후 enable/재시작

생성되는 서비스 파일 예시:

```
[Service]
WorkingDirectory=/srv/lalawon/app
Environment=API_ORIGIN=https://example.com
ExecStart=/srv/lalawon/app/.venv/bin/python -m uvicorn api.main:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
```

### 5.10 백업 자동화 (옵션)

- SQLite DB와 uploads 폴더를 tar.gz로 묶어 백업
- systemd service + timer 자동 등록
- `BACKUP_RETENTION_DAYS` 기준으로 오래된 백업 삭제

### 5.11 Nginx 설정

- 자동으로 nginx 설정 파일 생성
- `/api`, `/uploads`는 FastAPI로 프록시
- 나머지는 dist 정적 파일

생성되는 nginx 설정 예시:

```
location /api {
  proxy_pass http://127.0.0.1:8001;
}
location /uploads {
  proxy_pass http://127.0.0.1:8001;
}
```

### 5.12 HTTPS 적용 (옵션)

- ENABLE_SSL=true일 때 certbot 설치
- nginx 플러그인으로 인증서 발급
- nginx reload

## 6. 실패하기 쉬운 지점

- 로컬 빌드 실패 (`npm run build`)
- SSH 인증 실패 (키/비밀번호 문제)
- sudo 권한 부족
- nginx 설정 테스트 실패 (`nginx -t`)
- 포트 충돌 (API_PORT)

## 7. 학습 포인트 요약

이 스크립트는 다음 기술을 학습하는 좋은 예시입니다.

- Bash 옵션 파싱 (`case`, `shift`)
- SSH 자동화 (`ssh`, `scp`, `sshpass`)
- systemd 서비스 자동 생성
- nginx 설정 자동 배포
- SQLite 백업 자동화

## 8. 유지보수 팁

- API_PORT를 변경했으면 nginx 설정도 함께 재배포해야 합니다.
- 도메인을 바꿨으면 `API_ORIGIN`도 반드시 변경해야 합니다.
- 업로드 파일은 백업 대상이므로 주기 백업 유지가 중요합니다.
