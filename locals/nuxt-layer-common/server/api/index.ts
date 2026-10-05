import { proxyToBackend } from '../utils/proxyToBackend'

// Serves bare `/api`, which the catch-all does not match (it is the backend health check).
export default defineEventHandler(e => proxyToBackend(e))
