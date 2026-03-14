export function getAccessTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}