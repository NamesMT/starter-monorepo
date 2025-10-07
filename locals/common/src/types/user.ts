export interface UserAuthState {
  id: string
  firstName: string
  fullName: string
  email: string
  avatar?: string

  tokens: {
    accessToken: string
  }
}
