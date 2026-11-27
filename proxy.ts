import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Sin Supabase configurado no hay auth real: dejamos pasar (modo demo).
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/admin/login");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute && !isLoginPage && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario revisor (demo para Meta): solo Mensajes y Plantillas.
  if (user && (user.app_metadata as { rol?: string } | undefined)?.rol === "revisor") {
    const p = request.nextUrl.pathname;
    const permitido = isLoginPage || p.startsWith("/admin/mensajes") || p.startsWith("/admin/plantillas");
    if (!permitido) return NextResponse.redirect(new URL("/admin/mensajes", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
