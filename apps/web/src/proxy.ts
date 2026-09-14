import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'routine_session';
const PUBLIC_PATHS = ['/login', '/invite'];

/**
 * Швидкий фільтр за наявністю cookie — без запиту в API.
 * Справжню перевірку сесії робить серверний рендер (lib/session.ts):
 * протухла cookie доходить до сторінки й отримує редірект на /login звідти.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isPublic && !request.cookies.has(SESSION_COOKIE)) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
