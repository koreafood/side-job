#!/usr/bin/env bash
set -euo pipefail
REMOTE_PATH="/srv/lalawon/app"
BACKUP_DIR="/srv/lalawon/app/backups"
RETENTION_DAYS="14"
SERVICE_USER="ubuntu"
SERVICE_GROUP="users"
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
