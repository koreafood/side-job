import { describe, expect, it, vi } from 'vitest'
import { calculateCartTotal } from '@/lib/cart'

describe('calculateCartTotal', () => {
  it('qty=1일 때 basePrice + packagingFee를 계산한다', () => {
    const result = calculateCartTotal({
      packagingFee: 2000,
      basePrice: 20000,
      addPrice: 15000,
      deliveryFee: 3200,
      items: [{ modelId: 'm1', qty: 1 }],
    })
    expect(result.totalProductAmount).toBe(22000)
    expect(result.deliveryFee).toBe(3200)
    expect(result.grandTotal).toBe(25200)
  })

  it('qty=2일 때 basePrice + addPrice + packagingFee를 계산한다', () => {
    const result = calculateCartTotal({
      packagingFee: 2000,
      basePrice: 20000,
      addPrice: 15000,
      deliveryFee: 3200,
      items: [{ modelId: 'm1', qty: 2 }],
    })
    expect(result.totalProductAmount).toBe(37000)
    expect(result.deliveryFee).toBe(3200)
    expect(result.grandTotal).toBe(40200)
  })

  it('qty=3일 때 addPrice가 누적되어 적용된다', () => {
    const result = calculateCartTotal({
      packagingFee: 2000,
      basePrice: 20000,
      addPrice: 15000,
      deliveryFee: 3200,
      items: [{ modelId: 'm1', qty: 3 }],
    })
    expect(result.totalProductAmount).toBe(52000)
    expect(result.deliveryFee).toBe(3200)
    expect(result.grandTotal).toBe(55200)
  })

  it('모델별로 할인 규칙이 적용된다', () => {
    const result = calculateCartTotal({
      packagingFee: 1000,
      basePrice: 20000,
      addPrice: 15000,
      deliveryFee: 3200,
      items: [
        { modelId: 'a', qty: 2 },
        { modelId: 'b', qty: 1 },
      ],
    })
    expect(result.totalProductAmount).toBe(57000)
    expect(result.deliveryFee).toBe(3200)
    expect(result.grandTotal).toBe(60200)
  })

  it('60000원 이상이면 배송비가 0원이다', () => {
    const result = calculateCartTotal({
      packagingFee: 0,
      basePrice: 30000,
      addPrice: 30000,
      deliveryFee: 3200,
      items: [{ modelId: 'm1', qty: 2 }],
    })
    expect(result.totalProductAmount).toBe(60000)
    expect(result.deliveryFee).toBe(0)
    expect(result.grandTotal).toBe(60000)
  })

  it('qty가 0 이하이면 0원 처리하고 로그를 남긴다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const result = calculateCartTotal({
      packagingFee: 2000,
      basePrice: 20000,
      addPrice: 15000,
      deliveryFee: 3200,
      items: [{ modelId: 'm1', qty: 0 }],
    })
    expect(result.totalProductAmount).toBe(0)
    expect(result.deliveryFee).toBe(3200)
    expect(result.grandTotal).toBe(3200)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
