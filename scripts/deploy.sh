#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${SERVER_HOST:-192.168.0.63}" # 배포 대상 서버 IP 또는 호스트 기본값
SERVER_USER="${SERVER_USER:-ubuntu}" # 원격 접속 사용자 기본값
REMOTE_PATH="${REMOTE_PATH:-/srv/lalawon/app}" # 서버에 배포될 기본 경로
DOMAIN="${DOMAIN:-home.lala.dedyn.io}" # 서비스 도메인 기본값
API_PORT="${API_PORT:-8001}" # 백엔드 서비스 포트 기본값
SERVICE_NAME="${SERVICE_NAME:-lalawon-api}" # systemd 서비스 이름 기본값
SITE_NAME="${SITE_NAME:-lalawon}" # nginx 사이트 이름 기본값
API_ORIGIN="" # API_ORIGIN 환경변수 최종값을 저장
API_ORIGIN_SET="false" # --api-origin 옵션 제공 여부 플래그
ENABLE_SSL="${ENABLE_SSL:-false}" # HTTPS 설정 활성화 여부 기본값
CERTBOT_EMAIL="${CERTBOT_EMAIL:-you@example.com}" # certbot 등록 이메일 기본값
SUDO_PASS="${SUDO_PASS:-}" # 원격 sudo 비밀번호(선택)
SSH_PASS="${SSH_PASS:-}" # SSH 비밀번호(선택)
ENABLE_BACKUP="${ENABLE_BACKUP:-true}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_TIME="${BACKUP_TIME:-03:00}"
BACKUP_DIR="${BACKUP_DIR:-${REMOTE_PATH}/backups}"
BACKUP_SERVICE_NAME="${BACKUP_SERVICE_NAME:-${SERVICE_NAME}-backup}"

while [[ $# -gt 0 ]]; do # CLI 인자를 모두 소진할 때까지 반복
  case "$1" in # 현재 인자 키를 기반으로 분기
    --host) SERVER_HOST="$2"; shift 2 ;; # 서버 호스트 지정
    --user) SERVER_USER="$2"; shift 2 ;; # 원격 사용자 지정
    --path) REMOTE_PATH="$2"; shift 2 ;; # 배포 경로 지정
    --domain) DOMAIN="$2"; shift 2 ;; # 도메인 지정
    --api-port) API_PORT="$2"; shift 2 ;; # API 포트 지정
    --service-name) SERVICE_NAME="$2"; shift 2 ;; # systemd 서비스 이름 지정
    --site-name) SITE_NAME="$2"; shift 2 ;; # nginx 사이트 이름 지정
    --api-origin) API_ORIGIN="$2"; API_ORIGIN_SET="true"; shift 2 ;; # API_ORIGIN 직접 설정
    --enable-ssl) ENABLE_SSL="$2"; shift 2 ;; # HTTPS 활성화 설정
    --certbot-email) CERTBOT_EMAIL="$2"; shift 2 ;; # certbot 이메일 지정
    --sudo-pass) SUDO_PASS="$2"; shift 2 ;; # sudo 비밀번호 지정
    --ssh-pass) SSH_PASS="$2"; shift 2 ;; # SSH 비밀번호 지정
    --enable-backup) ENABLE_BACKUP="$2"; shift 2 ;;
    --backup-retention-days) BACKUP_RETENTION_DAYS="$2"; shift 2 ;;
    --backup-time) BACKUP_TIME="$2"; shift 2 ;;
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    *) shift 1 ;; # 알 수 없는 인자는 건너뜀
  esac
done

SERVER_NAME="${DOMAIN}" # nginx server_name 기본값을 도메인으로 설정
LISTEN_LINE="listen 80;" # 기본 listen 설정(도메인 있을 때)
if [[ "${DOMAIN}" == "your-domain.example" || -z "${DOMAIN}" ]]; then # 도메인이 기본값이거나 비어 있으면
  SERVER_NAME="${SERVER_HOST}" # server_name을 호스트 IP로 대체
  LISTEN_LINE="listen 80 default_server;" # 기본 서버로 listen 지정
fi
if [[ "${API_ORIGIN_SET}" != "true" ]]; then # --api-origin을 사용하지 않았다면
  if [[ "${SERVER_NAME}" == "${SERVER_HOST}" ]]; then # 도메인 대신 호스트 IP를 쓰는 경우
    API_ORIGIN="http://${SERVER_HOST}" # HTTP 기반으로 API_ORIGIN 설정
  else
    API_ORIGIN="https://${DOMAIN}" # 도메인을 사용하는 경우 HTTPS 기준으로 설정
  fi
fi

if [[ -z "${SERVER_HOST}" ]]; then # 필수 호스트 누락 검사
  echo "사용법: scripts/deploy.sh --host <SERVER_HOST> [--user <USER>] [--path <REMOTE_PATH>] [--domain <DOMAIN>] [--api-port <PORT>] [--api-origin <URL>] [--enable-ssl true|false] [--certbot-email <EMAIL>] [--enable-backup true|false] [--backup-retention-days <DAYS>] [--backup-time <HH:MM>] [--backup-dir <PATH>] [--sudo-pass <SUDO_PASSWORD>] [--ssh-pass <SSH_PASSWORD>]"
  exit 1 # 비정상 종료
fi

echo "프론트엔드 빌드 시작" # 로컬에서 프론트엔드 빌드 수행
npm ci # 의존성 깨끗이 설치
npm run build # 프로덕션 빌드 생성

remote="${SERVER_USER}@${SERVER_HOST}" # 사용자@호스트 형식으로 원격 주소 구성
if [[ -n "${SSH_PASS}" ]]; then # SSH 비밀번호가 제공되면
  if ! command -v sshpass >/dev/null 2>&1; then # sshpass 설치 여부 확인
    echo "SSH 비밀번호를 사용하려면 로컬에 sshpass가 필요합니다." # 안내 메시지 출력
    exit 1 # 없으면 중단
  fi
  SSH_CMD=(sshpass -p "${SSH_PASS}" ssh -o StrictHostKeyChecking=accept-new) # 비밀번호 기반 SSH 명령 구성
  SCP_CMD=(sshpass -p "${SSH_PASS}" scp -o StrictHostKeyChecking=accept-new) # 비밀번호 기반 SCP 명령 구성
else
  SSH_CMD=(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new) # 키 기반 SSH 명령 구성
  SCP_CMD=(scp -o StrictHostKeyChecking=accept-new) # 키 기반 SCP 명령 구성
fi

escape_squote() { # 단일 따옴표를 안전하게 이스케이프 처리
  printf "%s" "$1" | sed "s/'/'\\\\''/g" # ' -> '\'' 치환
}

if [[ -n "${SUDO_PASS}" ]]; then # sudo 비밀번호가 제공되면
  SUDO_PASS_ESCAPED="$(escape_squote "${SUDO_PASS}")" # 단일 따옴표 이스케이프
  run_sudo() { # 원격에서 비밀번호 입력을 포함한 sudo 실행 함수
    local cmd="$1"
    "${SSH_CMD[@]}" "${remote}" "SUDO_PASS='${SUDO_PASS_ESCAPED}'; printf '%s' \"\$SUDO_PASS\" | sudo -S -p '' bash -c $(printf '%q' "${cmd}")"
  }
fi

if ! "${SSH_CMD[@]}" "${remote}" "true" >/dev/null 2>&1; then # SSH 접속 테스트
  echo "SSH 인증에 실패했습니다. SSH 키를 설정하거나 --ssh-pass 옵션을 사용하세요." # 인증 실패 안내
  exit 1 # 실패 시 중단
fi

REMOTE_GROUP="$("${SSH_CMD[@]}" "${remote}" "id -gn '${SERVER_USER}'" 2>/dev/null || true)" # 원격 사용자 기본 그룹 조회
if [[ -z "${REMOTE_GROUP}" ]]; then # 그룹 조회 실패 시
  echo "원격 사용자 그룹을 확인하지 못했습니다. 사용자 '${SERVER_USER}'가 존재하는지 확인하세요." # 안내 메시지 출력
  exit 1 # 중단
fi
SERVICE_USER="${SERVER_USER}" # systemd 서비스 실행 사용자
SERVICE_GROUP="${REMOTE_GROUP}" # systemd 서비스 실행 그룹

if [[ -z "${SUDO_PASS}" ]]; then # sudo 비밀번호를 제공하지 않은 경우
  if ! "${SSH_CMD[@]}" "${remote}" "sudo -n true" >/dev/null 2>&1; then # 무비밀번호 sudo 가능 여부 확인
    echo "원격 sudo 비밀번호가 필요합니다. --sudo-pass 옵션을 사용하거나, 서버에서 NOPASSWD sudo를 설정하세요." # 안내 메시지 출력
    exit 1 # 불가능하면 중단
  fi
fi

echo "원격 디렉터리 준비: ${REMOTE_PATH}" # 서버 디렉터리 준비 안내
if [[ -n "${SUDO_PASS}" ]]; then # sudo 비밀번호 입력 방식 사용
  run_sudo "mkdir -p '${REMOTE_PATH}/dist' '${REMOTE_PATH}/api' '${REMOTE_PATH}/api/uploads' && sudo -S -p '' touch '${REMOTE_PATH}/api/app.db' && sudo -S -p '' chown -R '${SERVER_USER}:${REMOTE_GROUP}' '${REMOTE_PATH}'" # 디렉터리 생성 및 권한 설정
else
  "${SSH_CMD[@]}" "${remote}" "sudo mkdir -p '${REMOTE_PATH}/dist' '${REMOTE_PATH}/api' '${REMOTE_PATH}/api/uploads' && sudo touch '${REMOTE_PATH}/api/app.db' && sudo chown -R '${SERVER_USER}:${REMOTE_GROUP}' '${REMOTE_PATH}'" # 디렉터리 생성 및 권한 설정
fi

echo "정적 파일 전송" # 빌드된 프론트엔드 파일 업로드
"${SCP_CMD[@]}" -r dist/* "${remote}:${REMOTE_PATH}/dist/" # dist 전체 복사

echo "백엔드 코드 전송" # FastAPI 소스 및 의존성 파일 업로드
"${SCP_CMD[@]}" ./api/*.py "${remote}:${REMOTE_PATH}/api/" # 파이썬 소스 복사
"${SCP_CMD[@]}" ./api/requirements.txt "${remote}:${REMOTE_PATH}/api/requirements.txt" # requirements 복사

echo "서버 의존성 설치 및 가상환경 구성" # 원격 서버 패키지 설치 및 venv 구성
if [[ -n "${SUDO_PASS}" ]]; then # sudo 비밀번호 방식 사용
  run_sudo "apt-get update -y && sudo -S -p '' apt-get install -y python3 python3-venv nginx sqlite3"
else
  "${SSH_CMD[@]}" "${remote}" "sudo apt-get update -y && sudo apt-get install -y python3 python3-venv nginx sqlite3"
fi
"${SSH_CMD[@]}" "${remote}" "cd '${REMOTE_PATH}' && python3 -m venv .venv && . .venv/bin/activate && pip install -U pip && pip install -r api/requirements.txt" # venv 생성 및 의존성 설치

echo "업로드 디렉터리 권한 설정" # 업로드 폴더 접근 권한 부여
if [[ -n "${SUDO_PASS}" ]]; then # sudo 비밀번호 방식 사용
  run_sudo "chown -R '${SERVICE_USER}:${SERVICE_GROUP}' '${REMOTE_PATH}/api/uploads'" # 업로드 폴더 소유권 변경
else
  "${SSH_CMD[@]}" "${remote}" "sudo chown -R '${SERVICE_USER}:${SERVICE_GROUP}' '${REMOTE_PATH}/api/uploads'" # 업로드 폴더 소유권 변경
fi

echo "Systemd 서비스 생성" # 서비스 유닛 생성 및 재시작
UNIT="[Unit]
Description=Lalawon FastAPI Service
After=network.target

[Service]
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
WorkingDirectory=${REMOTE_PATH}
Environment=API_ORIGIN=${API_ORIGIN}
ExecStart=${REMOTE_PATH}/.venv/bin/python -m uvicorn api.main:app --host 127.0.0.1 --port ${API_PORT} --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
" # systemd 유닛 파일 본문 정의
TMP_DIR="scripts/.deploy_tmp" # 임시 파일 저장 경로
mkdir -p "${TMP_DIR}" # 임시 디렉터리 생성
echo "$UNIT" > "${TMP_DIR}/${SERVICE_NAME}.service" # 로컬에 유닛 파일 생성
"${SCP_CMD[@]}" "${TMP_DIR}/${SERVICE_NAME}.service" "${remote}:~/${SERVICE_NAME}.service" # 원격 홈으로 전송
if [[ -n "${SUDO_PASS}" ]]; then # sudo 비밀번호 방식 사용
  run_sudo "mv /home/${SERVER_USER}/${SERVICE_NAME}.service /etc/systemd/system/${SERVICE_NAME}.service && sudo -S -p '' systemctl daemon-reload && sudo -S -p '' systemctl enable ${SERVICE_NAME} && sudo -S -p '' systemctl restart ${SERVICE_NAME}" # 유닛 설치 및 재시작
else
  "${SSH_CMD[@]}" "${remote}" "sudo mv ~/${SERVICE_NAME}.service /etc/systemd/system/${SERVICE_NAME}.service && sudo systemctl daemon-reload && sudo systemctl enable ${SERVICE_NAME} && sudo systemctl restart ${SERVICE_NAME}" # 유닛 설치 및 재시작
fi

if [[ "${ENABLE_BACKUP}" == "true" ]]; then
  echo "백업 자동화 설정"
  ON_CALENDAR="*-*-* ${BACKUP_TIME}:00"
  if [[ "${BACKUP_TIME}" =~ ^[0-9]{2}:[0-9]{2}:[0-9]{2}$ ]]; then
    ON_CALENDAR="*-*-* ${BACKUP_TIME}"
  fi
  BACKUP_SCRIPT_LOCAL="${TMP_DIR}/${BACKUP_SERVICE_NAME}.sh"
  cat <<'BACKUP_SCRIPT' | sed -e "s|__REMOTE_PATH__|${REMOTE_PATH}|g" -e "s|__BACKUP_DIR__|${BACKUP_DIR}|g" -e "s|__RETENTION_DAYS__|${BACKUP_RETENTION_DAYS}|g" -e "s|__SERVICE_USER__|${SERVICE_USER}|g" -e "s|__SERVICE_GROUP__|${SERVICE_GROUP}|g" > "${BACKUP_SCRIPT_LOCAL}"
#!/usr/bin/env bash
set -euo pipefail
REMOTE_PATH="__REMOTE_PATH__"
BACKUP_DIR="__BACKUP_DIR__"
RETENTION_DAYS="__RETENTION_DAYS__"
SERVICE_USER="__SERVICE_USER__"
SERVICE_GROUP="__SERVICE_GROUP__"
TS="$(date +%Y%m%d-%H%M%S)"
TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "${TMP_DIR}"; }
trap cleanup EXIT
mkdir -p "${BACKUP_DIR}"
sqlite3 "${REMOTE_PATH}/api/app.db" ".backup '${TMP_DIR}/app-${TS}.sqlite'"
cp -a "${REMOTE_PATH}/api/uploads" "${TMP_DIR}/uploads"
tar -C "${TMP_DIR}" -czf "${BACKUP_DIR}/backup-${TS}.tar.gz" "app-${TS}.sqlite" "uploads"
chown "${SERVICE_USER}:${SERVICE_GROUP}" "${BACKUP_DIR}/backup-${TS}.tar.gz"
find "${BACKUP_DIR}" -name "backup-*.tar.gz" -type f -mtime +"${RETENTION_DAYS}" -delete
BACKUP_SCRIPT
  "${SCP_CMD[@]}" "${BACKUP_SCRIPT_LOCAL}" "${remote}:~/${BACKUP_SERVICE_NAME}.sh"
  if [[ -n "${SUDO_PASS}" ]]; then
    run_sudo "mkdir -p '${REMOTE_PATH}/scripts' '${BACKUP_DIR}' && sudo -S -p '' chown -R '${SERVICE_USER}:${SERVICE_GROUP}' '${REMOTE_PATH}/scripts' '${BACKUP_DIR}' && sudo -S -p '' mv /home/${SERVER_USER}/${BACKUP_SERVICE_NAME}.sh '${REMOTE_PATH}/scripts/${BACKUP_SERVICE_NAME}.sh' && sudo -S -p '' chmod 755 '${REMOTE_PATH}/scripts/${BACKUP_SERVICE_NAME}.sh' && sudo -S -p '' chown '${SERVICE_USER}:${SERVICE_GROUP}' '${REMOTE_PATH}/scripts/${BACKUP_SERVICE_NAME}.sh'"
  else
    "${SSH_CMD[@]}" "${remote}" "sudo mkdir -p '${REMOTE_PATH}/scripts' '${BACKUP_DIR}' && sudo chown -R '${SERVICE_USER}:${SERVICE_GROUP}' '${REMOTE_PATH}/scripts' '${BACKUP_DIR}' && sudo mv ~/${BACKUP_SERVICE_NAME}.sh '${REMOTE_PATH}/scripts/${BACKUP_SERVICE_NAME}.sh' && sudo chmod 755 '${REMOTE_PATH}/scripts/${BACKUP_SERVICE_NAME}.sh' && sudo chown '${SERVICE_USER}:${SERVICE_GROUP}' '${REMOTE_PATH}/scripts/${BACKUP_SERVICE_NAME}.sh'"
  fi
  BACKUP_UNIT="[Unit]
Description=Lalawon Backup Service
After=network.target

[Service]
Type=oneshot
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
WorkingDirectory=${REMOTE_PATH}
ExecStart=${REMOTE_PATH}/scripts/${BACKUP_SERVICE_NAME}.sh
"
  BACKUP_TIMER="[Unit]
Description=Lalawon Backup Timer

[Timer]
OnCalendar=${ON_CALENDAR}
Persistent=true
Unit=${BACKUP_SERVICE_NAME}.service

[Install]
WantedBy=timers.target
"
  echo "$BACKUP_UNIT" > "${TMP_DIR}/${BACKUP_SERVICE_NAME}.service"
  echo "$BACKUP_TIMER" > "${TMP_DIR}/${BACKUP_SERVICE_NAME}.timer"
  "${SCP_CMD[@]}" "${TMP_DIR}/${BACKUP_SERVICE_NAME}.service" "${remote}:~/${BACKUP_SERVICE_NAME}.service"
  "${SCP_CMD[@]}" "${TMP_DIR}/${BACKUP_SERVICE_NAME}.timer" "${remote}:~/${BACKUP_SERVICE_NAME}.timer"
  if [[ -n "${SUDO_PASS}" ]]; then
    run_sudo "mv /home/${SERVER_USER}/${BACKUP_SERVICE_NAME}.service /etc/systemd/system/${BACKUP_SERVICE_NAME}.service && mv /home/${SERVER_USER}/${BACKUP_SERVICE_NAME}.timer /etc/systemd/system/${BACKUP_SERVICE_NAME}.timer && sudo -S -p '' systemctl daemon-reload && sudo -S -p '' systemctl enable ${BACKUP_SERVICE_NAME}.timer && sudo -S -p '' systemctl restart ${BACKUP_SERVICE_NAME}.timer"
  else
    "${SSH_CMD[@]}" "${remote}" "sudo mv ~/${BACKUP_SERVICE_NAME}.service /etc/systemd/system/${BACKUP_SERVICE_NAME}.service && sudo mv ~/${BACKUP_SERVICE_NAME}.timer /etc/systemd/system/${BACKUP_SERVICE_NAME}.timer && sudo systemctl daemon-reload && sudo systemctl enable ${BACKUP_SERVICE_NAME}.timer && sudo systemctl restart ${BACKUP_SERVICE_NAME}.timer"
  fi
fi

echo "Nginx 설정 생성" # nginx 설정 파일 생성
NGINX_LOCAL="${TMP_DIR}/${SITE_NAME}.conf" # 로컬 임시 nginx 설정 경로
cat <<'NGINX_CONF' | sed -e "s|__SERVER_NAME__|${SERVER_NAME}|g" -e "s|__LISTEN__|${LISTEN_LINE}|g" -e "s|__REMOTE_PATH__|${REMOTE_PATH}|g" -e "s|__API_PORT__|${API_PORT}|g" > "${NGINX_LOCAL}" # 템플릿 변수 치환 후 저장
server {
    __LISTEN__
    server_name __SERVER_NAME__;

    root __REMOTE_PATH__/dist;
    index index.html;
    client_max_body_size 20M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:__API_PORT__;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:__API_PORT__;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_CONF
"${SCP_CMD[@]}" "${NGINX_LOCAL}" "${remote}:~/${SITE_NAME}.conf" # 원격 홈으로 전송
if [[ -n "${SUDO_PASS}" ]]; then # sudo 비밀번호 방식 사용
  run_sudo "mv /home/${SERVER_USER}/${SITE_NAME}.conf /etc/nginx/sites-available/${SITE_NAME} && sudo -S -p '' ln -sf /etc/nginx/sites-available/${SITE_NAME} /etc/nginx/sites-enabled/${SITE_NAME} && sudo -S -p '' nginx -t && sudo -S -p '' systemctl reload nginx" # 설정 반영 및 재로드
else
  "${SSH_CMD[@]}" "${remote}" "sudo mv ~/${SITE_NAME}.conf /etc/nginx/sites-available/${SITE_NAME} && sudo ln -sf /etc/nginx/sites-available/${SITE_NAME} /etc/nginx/sites-enabled/${SITE_NAME} && sudo nginx -t && sudo systemctl reload nginx" # 설정 반영 및 재로드
fi

if [[ "${ENABLE_SSL}" == "true" ]]; then # HTTPS 활성화 설정이 true이면
  echo "HTTPS 설정 적용" # HTTPS 설정 시작 안내
  if [[ -n "${SUDO_PASS}" ]]; then # sudo 비밀번호 방식 사용
    run_sudo "apt-get install -y certbot python3-certbot-nginx" # certbot 설치
    run_sudo "certbot --nginx -d ${DOMAIN} -m ${CERTBOT_EMAIL} --agree-tos --non-interactive || true" # 인증서 발급 시도
    run_sudo "systemctl reload nginx" # nginx 재로드
  else
    "${SSH_CMD[@]}" "${remote}" "sudo apt-get install -y certbot python3-certbot-nginx" # certbot 설치
    "${SSH_CMD[@]}" "${remote}" "sudo certbot --nginx -d ${DOMAIN} -m ${CERTBOT_EMAIL} --agree-tos --non-interactive || true" # 인증서 발급 시도
    "${SSH_CMD[@]}" "${remote}" "sudo systemctl reload nginx" # nginx 재로드
  fi
fi

echo "배포 완료" # 배포 완료 안내
