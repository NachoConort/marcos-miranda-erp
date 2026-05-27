import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      usuario: null,
      token: null,
      setAuth: (usuario, token) => set({ usuario, token }),
      logout: () => set({ usuario: null, token: null }),
      isAuthenticated: () => !!useAuthStore.getState().token,
    }),
    { name: 'erp-auth' }
  )
)

export default useAuthStore
