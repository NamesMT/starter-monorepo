export interface UserAuthState {
  id: string
  firstName: string
  fullName: string
  email: string
  avatar?: string

  private: {
    accessToken: string
    refreshToken: string
    sessionId: string
  }
}
