import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secure = isSecureRequest(req);

  // BUGFIX: sameSite was hardcoded to "none" while `secure` was computed from
  // the request. Browsers reject any `SameSite=None` cookie that is not also
  // `Secure` -- so over plain HTTP the session cookie was silently DROPPED by
  // the browser. Reproduced in a real Chromium session against
  // http://localhost:3000/login: the server answered auth.login with 200, but
  // the only cookies the browser kept were __csrf and _fbp -- no
  // app_session_id. The page therefore just sat on /login with no error to
  // show, because nothing had actually failed from its point of view.
  // (curl does not enforce this rule, which is why API-level testing passed.)
  //
  // "none" is still required over HTTPS: the Capacitor native app loads the
  // site cross-origin and needs the cookie sent on those requests. "lax" is the
  // correct fallback for plain-HTTP/same-origin use and is what makes local
  // development work at all.
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
