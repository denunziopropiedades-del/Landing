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

  // Panel del módulo de selección de personal (independiente del panel inmobiliario).
  const isPostulantesLoginPage = request.nextUrl.pathname.startsWith("/postulantes/login");
  const isPostulantesRoute = request.nextUrl.pathname.startsWith("/postulantes");

  if (isPostulantesRoute && !isPostulantesLoginPage && !user) {
    const loginUrl = new URL("/postulantes/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/postulantes/:path*"],
};
