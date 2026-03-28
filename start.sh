#!/usr/bin/env bash
# 엄격한 에러 처리 옵션을 활성화합니다.
set -euo pipefail
# 프로젝트 루트 경로를 계산합니다.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 백엔드 기본 포트를 정의합니다.
BACKEND_PORT=8000
# 자동 정리 플래그의 기본값을 비활성화합니다.
AUTO_KILL_PORT=0
# 첫 번째 인자가 자동 정리 옵션인지 확인합니다.
if [[ "${1:-}" == "--kill-port" ]]; then
  # 자동 정리 플래그를 활성화합니다.
  AUTO_KILL_PORT=1
fi
# 환경 변수로도 자동 정리 플래그를 활성화할 수 있게 합니다.
if [[ "${AUTO_KILL_PORT_8000:-0}" == "1" ]]; then
  # 환경 변수 요청을 반영해 자동 정리 플래그를 활성화합니다.
  AUTO_KILL_PORT=1
fi
# 지정 포트를 점유 중인 프로세스 목록 배열을 초기화합니다.
PORT_PIDS=()
# 지정 포트를 점유 중인 프로세스 ID를 한 줄씩 읽습니다.
while IFS= read -r pid; do
  # 빈 줄은 무시합니다.
  [[ -z "${pid}" ]] && continue
  # 수집한 프로세스 ID를 배열에 추가합니다.
  PORT_PIDS+=("${pid}")
# 포트 점유 프로세스 조회 결과를 반복문 입력으로 전달합니다.
done < <(lsof -tiTCP:"${BACKEND_PORT}" -sTCP:LISTEN 2>/dev/null || true)
# 포트를 점유 중인 프로세스가 있는지 확인합니다.
if (( ${#PORT_PIDS[@]} > 0 )); then
  # 사용자에게 포트 점유 사실을 안내합니다.
  echo "포트 ${BACKEND_PORT} 가 이미 사용 중입니다."
  # 점유 프로세스 상세 정보를 출력합니다.
  lsof -nP -iTCP:"${BACKEND_PORT}" -sTCP:LISTEN
  # 자동 정리 옵션이 활성화되었는지 확인합니다.
  if (( AUTO_KILL_PORT == 1 )); then
    # 점유 중인 프로세스를 종료합니다.
    kill "${PORT_PIDS[@]}"
    # 종료가 반영될 시간을 잠시 기다립니다.
    sleep 1
    # 종료 후에도 포트가 점유 중인지 다시 확인합니다.
    if lsof -tiTCP:"${BACKEND_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
      # 자동 정리 실패 메시지를 출력합니다.
      echo "포트 ${BACKEND_PORT} 정리에 실패했습니다."
      # 스크립트를 오류로 종료합니다.
      exit 1
    fi
    # 자동 정리 완료 메시지를 출력합니다.
    echo "포트 ${BACKEND_PORT} 점유 프로세스를 정리했습니다."
  else
    # 수동 재실행 방법을 안내합니다.
    echo "자동 정리를 원하면 ./start.sh --kill-port 로 실행하세요."
    # 환경 변수 기반 실행 방법도 함께 안내합니다.
    echo "또는 AUTO_KILL_PORT_8000=1 ./start.sh 로 실행할 수 있습니다."
    # 스크립트를 오류로 종료합니다.
    exit 1
  fi
fi
# 기존 개발 실행 스크립트를 호출합니다.
exec bash "${ROOT_DIR}/scripts/dev.sh"
