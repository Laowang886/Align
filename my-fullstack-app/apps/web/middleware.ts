//Before the request reaches the page, it can be "intercepted", "inspected", or "modified".
import { NextRequest, NextResponse } from "next/server"; //NextRequest used to read the request, NextResponse used to modify the response.

//"Public paths" are defined as pages that can be accessed without logging in. The rest of the website is considered a "protected area."
const PUBLIC_PATHS = ["/login", "/register"];

export function middleware(request: NextRequest) {
   //`nextUrl` is an enhanced URL object provided by Next.js. It is more convenient than the native URL object because it can directly recognize Next.js's routing rules
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  //Determine whether the page currently accessed by the user is a "public page" 
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // Not logged in, accessing a protected page → Redirecting to login
  if (!token && !isPublicPath) {
    const loginUrl = new URL("/login", request.url); //If not login, redirect to the login page, after login, redirect back to the originally requested page.
    loginUrl.searchParams.set("redirect", pathname); //Remember where you originally wanted to go.
    return NextResponse.redirect(loginUrl);
  }

  //Already logged in, but would like to access the login page again? → Go directly to the homepage
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  //The inspection passed, everything is normal, and permission is granted to proceed to its destination.
  return NextResponse.next();
}

// The matcher uses regular expressions. The logic here is: "Intercept all requests except those to a specific directory."
// ((?!...)): This is a negative lookahead assertion in regular expressions, meaning "match content that does not contain these values."
// Exclusion list (api|_next/static|_next/image|favicon.ico):
// api: Excludes all backend APIs (your login and data retrieval APIs will not be intercepted).
// _next/static: Excludes all static resources (such as compiled JS code and CSS style files).
// _next/image: Excludes image resources automatically optimized by Next.js.
// favicon.ico: Excludes the website's small icons.
// .*: Represents all remaining paths.

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};