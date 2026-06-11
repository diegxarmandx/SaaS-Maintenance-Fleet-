export function isAuthorizedCronRequest(
  request: Pick<Request, "headers">,
  secret: string,
) {
  const authorization = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");

  return authorization === `Bearer ${secret}` || cronSecret === secret;
}
