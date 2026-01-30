import { ref } from 'vue'
import { api } from '@/lib/api'

const isAdmin = ref<boolean>(false)

async function refresh() {
  try {
    const s = await api.getAdminSession()
    isAdmin.value = !!s.isAdmin
    if (isAdmin.value) localStorage.setItem('isAdmin', '1')
    else localStorage.removeItem('isAdmin')
  } catch {
    const ls = localStorage.getItem('isAdmin')
    isAdmin.value = ls === '1'
  }
}

async function login(password: string) {
  const s = await api.loginAdmin(password)
  isAdmin.value = !!s.isAdmin
  if (isAdmin.value) localStorage.setItem('isAdmin', '1')
}

export function useAdminStore() {
  return {
    isAdmin,
    refresh,
    login,
  }
}
