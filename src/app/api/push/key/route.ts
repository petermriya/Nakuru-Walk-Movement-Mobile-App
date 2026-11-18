/** The public push key, for the service worker when it renews a subscription. */
export function GET() {
  return new Response(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "", { headers: { "content-type": "text/plain" } });
}
