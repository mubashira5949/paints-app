// Device-scoped UUID stored in localStorage. Generated once per browser
// profile; sent on every /auth/login so the backend can gate access until a
// Manager approves the device (spec §2.2).

const STORAGE_KEY = 'paints-app:client-id'

export function getClientId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
