export type CartModelItem = {
  modelId: string
  qty: number
}

export type CartTotalResult = {
  totalProductAmount: number
  deliveryFee: number
  grandTotal: number
}

export function calculateCartTotal(input: {
  packagingFee: number
  basePrice: number
  addPrice: number
  deliveryFee?: number
  items: CartModelItem[]
}): CartTotalResult {
  const totalProductAmount = input.items.reduce((acc, item) => {
    if (item.qty <= 0) {
      console.warn('Invalid qty', { modelId: item.modelId, qty: item.qty })
      return acc
    }
    const modelAmount =
      item.qty === 1
        ? input.basePrice + input.packagingFee
        : input.basePrice + (item.qty - 1) * input.addPrice + input.packagingFee
    return acc + modelAmount
  }, 0)

  const configuredFee = Number(import.meta.env?.VITE_DELIVERY_FEE ?? 3200)
  const defaultFee = Number.isFinite(configuredFee) ? configuredFee : 3200
  const deliveryFee = totalProductAmount >= 60000 ? 0 : (input.deliveryFee ?? defaultFee)
  return {
    totalProductAmount,
    deliveryFee,
    grandTotal: totalProductAmount + deliveryFee,
  }
}
