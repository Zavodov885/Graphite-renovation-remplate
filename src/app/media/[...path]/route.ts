// Фото галереи отдаются через собственный домен: браузер не обращается к Supabase напрямую и кеширует картинки.
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const rel = path.join("/");
  if (!/^[A-Za-z0-9_\-./]{3,200}$/.test(rel) || rel.includes("..")) return new Response("Not found", { status: 404 });
  const up = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/${rel}`);
  if (!up.ok || !up.body) return new Response("Not found", { status: 404 });
  return new Response(up.body, { headers: { "Content-Type": up.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
}
