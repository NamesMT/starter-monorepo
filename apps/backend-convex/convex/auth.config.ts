/* eslint-disable node/prefer-global/process */
export default {
  providers: [
    {
      type: 'customJwt',
      issuer: process.env.CUSTOM_JWT_ISSUER!,
      jwks: process.env.CUSTOM_JWT_JWKS_URL!,
      algorithm: 'RS256',
    },
  ],
}
