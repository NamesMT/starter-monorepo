export default {
  providers: [
    {
      type: 'customJwt',
      issuer: process.env.CUSTOM_JWT_ISSUER!,
      jwks: process.env.CUSTOM_JWT_JWKS_URL!,
      applicationID: process.env.CUSTOM_JWT_CLIENT_ID!,
      algorithm: 'RS256',
    },
  ],
}
