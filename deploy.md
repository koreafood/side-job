# Proxmox 배포 가이드 (라라원단, Docker 없이)

이 문서는 현재 프로젝트(Vue/Vite 프론트 + FastAPI/SQLModel 백엔드)를 **Proxmox 서버**에 Docker 없이 배포하는 과정을 단계별로 정리합니다.

## 0) 배포 구성 요약

- 프론트: Vue 3 + Vite 빌드 결과(dist)를 웹 서버로 제공
- 백엔드: FastAPI(Uvicorn) + SQLite(`api/app.db`) + 업로드 파일(`api/uploads/`)
- 권장 아키텍처: **단일 VM(LXC도 가능) + Caddy(또는 Nginx) + systemd 서비스**
  - `https://도메인` → Caddy
  - `/` → 프론트 정적 파일(dist)
  - `/api/*`, `/uploads/*` → 127.0.0.1:8000(Uvicorn)으로 프록시

## 1) Proxmox에서 VM(또는 LXC) 준비

1. Ubuntu 22.04/24.04 또는 Debian 12 VM 생성
2. 권장 리소스: 2 vCPU, 2~4GB RAM, 20GB+ Disk
3. 네트워크: 고정 IP 또는 DHCP 예약, 도메인 A 레코드 설정(있다면)
4. 방화벽/UFW: `22, 80, 443` 허용

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install git curl ca-certificates ufw
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

## 2) 소스 배치

```bash
sudo mkdir -p /srv/lalawon
sudo chown -R $USER:$USER /srv/lalawon
cd /srv/lalawon
git clone <YOUR_REPO_URL> app
cd app
```

## 3) Node 설치 및 프론트 빌드

Node 18+ 권장(ubuntu는 노드소스 또는 nvm 사용). 예: nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 20
nvm use 20
cd /srv/lalawon/app
npm ci
npm run build
```

빌드 결과는 `dist/`에 생성됩니다.

## 4) Python venv 및 백엔드 준비

```bash
sudo apt -y install python3-venv
cd /srv/lalawon/app
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r api/requirements.txt
```

데이터 디렉터리 권한 확인:

```bash
mkdir -p api/uploads
touch api/app.db
```

## 5) Caddy 설치(HTTPS/프록시)

```bash
sudo apt -y install debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo tee /etc/apt/trusted.gpg.d/caddy-stable.asc
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt -y install caddy
```

도메인이 `example.com`일 때:

```bash
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
example.com {
  root * /srv/lalawon/app/dist
  file_server

  reverse_proxy /api/* 127.0.0.1:8000
  reverse_proxy /uploads/* 127.0.0.1:8000
}
EOF
sudo systemctl reload caddy
```

도메인이 없고 내부망만 사용할 경우:

```bash
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
:80 {
  root * /srv/lalawon/app/dist
  file_server

  reverse_proxy /api/* 127.0.0.1:8000
  reverse_proxy /uploads/* 127.0.0.1:8000
}
EOF
sudo systemctl reload caddy
```

## 6) systemd 서비스로 백엔드 실행

환경변수: 운영 도메인이 `https://example.com`이면 반드시 설정

```bash
sudo tee /etc/systemd/system/lalawon-api.service >/dev/null <<'EOF'
[Unit]
Description=Lalawon FastAPI
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/lalawon/app
Environment=API_ORIGIN=https://example.com
ExecStart=/srv/lalawon/app/.venv/bin/python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now lalawon-api
```

확인:

```bash
curl -s http://127.0.0.1:8000/api/health
```

## 7) 데이터/백업

- DB: `/srv/lalawon/app/api/app.db`
- 업로드: `/srv/lalawon/app/api/uploads/`

권장:
- Proxmox 스냅샷/백업 스케줄
- 주기적 파일 백업(rsync)으로 DB/업로드 보호

## 8) 운영 체크리스트

- [ ] 도메인 DNS 설정 또는 내부망 포트 노출
- [ ] 방화벽(22/80/443) 설정
- [ ] `API_ORIGIN` 설정(도메인 또는 내부망 URL)
- [ ] `/api/health` 응답 확인
- [ ] `/uploads/...` 접근 확인
- [ ] dist 정적 파일이 정상 제공되는지 확인

## 9) 주의사항

- 주문상세 번호(order_no)는 연도 단위 주문 수 기반으로 생성됩니다. 고트래픽 환경에서는 DB 유니크 제약과 재시도 로직이 필요할 수 있습니다.
