import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/cabinet", "/manager", "/master", "/admin"];

// Обновляет сессию и закрывает кабинеты от анонимов. Проверку РОЛИ делает сервер (requireRole) и RLS.
export async function middleware(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e) {
    // Например, не заданы переменные Supabase: не роняем весь сайт, кабинеты остаются закрытыми.
    console.error("middleware failed:", e instanceof Error ? e.message : e);
    if (PROTECTED.some((p) => req.nextUrl.pathname.startsWith(p))) {
      const url = req.nextUrl.clone(); url.pathname = "/login"; url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
}

async function handle(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user && PROTECTED.some((p) => req.nextUrl.pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)"] };
