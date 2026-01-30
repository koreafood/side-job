import { describe, expect, it, vi, afterEach } from 'vitest'
import { api, ApiError } from '@/lib/api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api', () => {
  it('health()는 ok:true를 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    const res = await api.health()
    expect(res.ok).toBe(true)
  })

  it('비정상 응답은 ApiError로 throw한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ detail: 'bad' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(api.health()).rejects.toBeInstanceOf(ApiError)
  })

  it('listSellers()는 /api/sellers를 호출한다', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.listSellers()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sellers',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('createAdminProduct()는 POST /api/admin/products로 전송한다', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'p1',
          sellerId: 's1',
          sellerName: 'S',
          name: 'N',
          description: 'D',
          priceJpy: 1,
          images: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.createAdminProduct({
      sellerId: 's1',
      name: 'N',
      description: 'D',
      priceJpy: 1,
      images: [{ url: 'u', sort: 1 }],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/products',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: expect.stringContaining('"sellerId":"s1"'),
      }),
    )
  })

  it('uploadAdminImage()는 multipart로 POST /api/admin/uploads를 호출한다', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ url: '/uploads/x.png', filename: 'x.png', contentType: 'image/png' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const file = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' })
    await api.uploadAdminImage(file)

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('updateAdminProduct()는 PUT /api/admin/products/:id 로 전송한다', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'p1',
          sellerId: 's1',
          sellerName: 'S',
          name: 'N',
          description: 'D',
          priceJpy: 1,
          images: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.updateAdminProduct('p1', {
      sellerId: 's1',
      name: 'N',
      description: 'D',
      priceJpy: 1,
      images: [{ url: 'u', sort: 1 }],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/products/p1',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('deleteAdminProduct()는 DELETE /api/admin/products/:id 를 호출한다', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await api.deleteAdminProduct('p1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/products/p1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('listProductOrders()는 GET /api/products/:id/orders 를 호출한다', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: 'ord_1',
            orderNo: 'ord_1',
            orderedAt: '2026-01-01T00:00:00Z',
            totalJpy: 1000,
            orderStatus: 'pending',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.listProductOrders('p1')
    expect(fetchMock).toHaveBeenCalledWith('/api/products/p1/orders', expect.anything())
  })

  it('createOrder()는 POST /api/orders로 주문 정보를 전송한다', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'ord_1', totalJpy: 1000, createdAt: new Date().toISOString() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.createOrder({
      customerName: '홍길동',
      customerPhone: '010-0000-0000',
      shippingAddress: '서울시 어딘가',
      recipientName: '홍길동',
      shippingMemo: '문앞',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/orders',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"customerName":"홍길동"') }),
    )
  })


  it('listAdminOrders()는 /api/admin/orders에 쿼리스트링을 붙여 호출한다', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.listAdminOrders({ q: 'abc', orderStatus: 'paid', page: 2, pageSize: 50 })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/orders?'),
      expect.objectContaining({ credentials: 'include' }),
    )
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toContain('q=abc')
    expect(url).toContain('orderStatus=paid')
    expect(url).toContain('page=2')
    expect(url).toContain('pageSize=50')
  })

  it('getAdminOrder()는 GET /api/admin/orders/:id 를 호출한다', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'o1',
          orderNo: 'o1',
          orderedAt: new Date().toISOString(),
          customerName: 'c',
          customerPhone: 'p',
          recipientName: 'r',
          recipientPhone: 'rp',
          shippingAddress1: 'a1',
          shippingAddress2: '',
          shippingMemo: '',
          totalJpy: 1,
          orderStatus: 'pending',
          paymentStatus: 'unpaid',
          shippingStatus: 'none',
          items: [],
          history: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.getAdminOrder('o1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/orders/o1',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('changeAdminOrderStatus()는 POST /api/admin/orders/:id/status 를 호출한다', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'o1',
          orderNo: 'o1',
          orderedAt: new Date().toISOString(),
          customerName: 'c',
          customerPhone: 'p',
          recipientName: 'r',
          recipientPhone: 'rp',
          shippingAddress1: 'a1',
          shippingAddress2: '',
          shippingMemo: '',
          totalJpy: 1,
          orderStatus: 'paid',
          paymentStatus: 'paid',
          shippingStatus: 'preparing',
          items: [],
          history: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.changeAdminOrderStatus('o1', { nextStatus: 'paid', reason: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/orders/o1/status',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('getPublicOrder()는 GET /api/orders/:id 를 호출한다', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'o1',
          orderNo: 'o1',
          orderedAt: new Date().toISOString(),
          totalJpy: 1,
          orderStatus: 'pending',
          productionSteps: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    await api.getPublicOrder('o1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/orders/o1',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('createProductionStep()는 POST /api/admin/orders/:id/production-steps 를 호출한다', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await api.createProductionStep('o1', { memo: 'm' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/orders/o1/production-steps',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('addProductionStepPhoto()는 POST /api/admin/production-steps/:stepId/photos 를 호출한다', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await api.addProductionStepPhoto('s1', { url: '/uploads/a.png' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/production-steps/s1/photos',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
