import { useAuthStore } from "~/store/auth";
import { useCookies } from "~/composables/useCookies";
import { useInternalApi } from "~/composables/useApi";
import { useAxios } from "~/composables/useAxios";
import { authLog } from "~/lib/composables/useLog";
import { HangarUser } from "hangar-internal";
import * as domain from "~/composables/useDomain";
import { Pinia } from "pinia";
import { AxiosError, AxiosRequestHeaders } from "axios";
import Cookies, { CookieSetOptions } from "universal-cookie";
import jwtDecode, { JwtPayload } from "jwt-decode";
import { HangarException } from "hangar-api";

interface TokenRequestResponse {
  token: string | null;
  refreshed: boolean;
  error?: HangarException;
}

const CookieOptions: CookieSetOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
};

class Auth {
  loginUrl(redirectUrl: string): string {
    if (redirectUrl.endsWith("?loggedOut")) {
      redirectUrl = redirectUrl.replace("?loggedOut", "");
    }
    return `/login?returnUrl=${import.meta.env.HANGAR_PUBLIC_HOST}${redirectUrl}`;
  }

  async logout() {
    location.replace(`/logout?returnUrl=${import.meta.env.HANGAR_PUBLIC_HOST}?loggedOut`);
  }

  validateToken(token: string) {
    if (!token) {
      return false;
    }
    const decoded = jwtDecode<JwtPayload>(token);
    if (!decoded.exp) {
      return false;
    }
    return decoded.exp * 1000 > Date.now() - 10 * 1000; // check against 10 seconds earlier to mitigate tokens expiring mid-request
  }

  _authException(...message: string[]): HangarException {
    return {
      httpError: {
        statusCode: 401,
        statusPhrase: "Forbidden",
      },
      message: "You must be logged in",
      messageArgs: message,
    };
  }

  async requestToken(forceRefetch = false): Promise<TokenRequestResponse> {
    const cookies = useCookies();
    const providedClientToken: string = cookies.get("HangarAuth");
    if (this.validateToken(providedClientToken) && !forceRefetch) {
      authLog("found existing token in cookies, returning");
      return { token: providedClientToken, refreshed: false };
    }

    authLog("current token not valid, fetching refresh token");
    const providedClientRefreshToken: string = cookies.get("HangarAuth_REFRESH");
    if (!providedClientRefreshToken) {
      authLog("client did not provide valid token or refresh token, erroring.");
      return { token: null, error: this._authException("no token or refresh token"), refreshed: false };
    }

    authLog("requesting new token from auth server using refresh token", providedClientRefreshToken);
    try {
      const headers: AxiosRequestHeaders = {};
      headers.cookie = `HangarAuth_REFRESH=${providedClientRefreshToken}`;

      const authServerResponse = await useAxios.get("/refresh", { headers: headers });
      if (!authServerResponse.headers["set-cookie"]) {
        authLog("auth server did not respond with set-cookie header");
        return { token: null, error: this._authException("auth server did not provide expected set-cookie headers"), refreshed: true };
      }

      const parsedAuthServerHeaders = new Cookies(authServerResponse.headers["set-cookie"]?.join("; "));

      const parsedAuthServerProvidedToken: string = parsedAuthServerHeaders.get("HangarAuth");
      if (!parsedAuthServerProvidedToken) {
        authLog("auth server's set-cookie header did not contain HangarAuth token", parsedAuthServerHeaders);
        return { token: null, error: this._authException("auth server did not provide token"), refreshed: true };
      }

      authLog("found refreshed token, updating token and refresh token in cookies");
      cookies.set("HangarAuth", parsedAuthServerProvidedToken, CookieOptions);
      cookies.set("HangarAuth_REFRESH", parsedAuthServerHeaders.get("HangarAuth_REFRESH"), CookieOptions);

      return { token: parsedAuthServerProvidedToken, refreshed: true };
    } catch (e) {
      authLog("failed to refresh token due to request failure", (e as AxiosError).message);
      return { token: null, error: this._authException((e as AxiosError).message), refreshed: true };
    }
  }

  async invalidate() {
    useAuthStore(this.usePiniaIfPresent()).$patch({
      user: null,
      authenticated: false,
    });
    await useAxios.get("/invalidate").catch(() => console.log("invalidate failed"));
    if (!import.meta.env.SSR) {
      useCookies().remove("HangarAuth_REFRESH", { path: "/" });
      useCookies().remove("HangarAuth", { path: "/" });
      authLog("Invalidated auth cookies");
    }
  }

  async updateUser(): Promise<void> {
    const user = await useInternalApi<HangarUser>("users/@me", true).catch(async (err) => {
      authLog("no user", err ?? "");
      return this.invalidate();
    });
    if (user) {
      authLog("patching " + user.name);
      const authStore = useAuthStore(this.usePiniaIfPresent());
      authStore.setUser(user);
      authStore.$patch({ authenticated: true });
      authLog("user is now " + authStore.user?.name);
    }
  }

  usePiniaIfPresent() {
    return import.meta.env.SSR ? domain.get<Pinia>("pinia") : null;
  }
}

export const useAuth = new Auth();
