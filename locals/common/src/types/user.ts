import type { UserType } from '@kinde-oss/kinde-typescript-sdk'

export interface UserProfileType extends UserType {
  // Note: `name` and `sub` exists in Kinde UserType but is not typed
  name: string
  sub: string
}
