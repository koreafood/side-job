#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

PYTHON_BIN="python3"
if [[ -x "${ROOT_DIR}/.venv/bin/python" ]]; then
  PYTHON_BIN="${ROOT_DIR}/.venv/bin/python"
elif [[ -x "${ROOT_DIR}/venv/bin/python" ]]; then
  PYTHON_BIN="${ROOT_DIR}/venv/bin/python"
fi

"${PYTHON_BIN}" -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

npm run dev &
FRONTEND_PID=$!

cleanup() {
  kill -TERM "${BACKEND_PID}" "${FRONTEND_PID}" 2>/dev/null || true
  wait "${BACKEND_PID}" "${FRONTEND_PID}" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

while true; do
  if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
    cleanup
    exit 1
  fi
  if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    cleanup
    exit 1
  fi
  sleep 1
done
