/**
 * 유틸리티 함수 모듈
 * - 역할: CSS 클래스 병합 등 전역적으로 사용되는 헬퍼 함수 제공
 * - 주요 기능:
 *   - cn: tailwindcss 클래스 병합 (clsx + tailwind-merge)
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * CSS 클래스 병합 함수
 * - 목적: 조건부 클래스(clsx)와 Tailwind 클래스 충돌 해결(tailwind-merge)을 동시에 처리
 * - 입력: ...inputs (클래스 문자열, 객체, 배열 등)
 * - 출력: 병합된 클래스 문자열
 * - 예시: cn("p-4", isActive && "bg-blue-500", "p-2") -> "bg-blue-500 p-2" (p-4는 덮어씌워짐)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
