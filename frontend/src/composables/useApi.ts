import type { AxiosError, AxiosRequestConfig } from "axios";
import qs from "qs";
import Cookies from "universal-cookie";
import { useAxios } from "~/composables/useAxios";
import { useCookies } from "~/composables/useCookies";
import { Ref } from "vue";
import { authLog, fetchLog } from "~/lib/composables/useLog";
import { isEmpty } from "lodash-es";
import { useAuth } from "~/composables/useAuth";

interface StatCookie {
  // TODO use or remove
  // eslint-disable-next-line camelcase
  hangar_stats: string;
  Path: string;
  "Max-Age": string;
  Expires: string;
  SameSite: true | false | "lax" | "strict" | "none" | undefined;
  Secure?: boolean;
}

function request<T>(url: string, method: AxiosRequestConfig["method"], data: object, headers: Record<string, string> = {}, retry = false): Promise<T> {
  const cookies = useCookies();
  return new Promise<T>((resolve, reject) => {
    return useAxios
      .request<T>({
        method,
        url: `/api/${url}`,
        headers,
        data: method?.toLowerCase() !== "get" ? data : {},
        params: method?.toLowerCase() === "get" ? data : {},
        paramsSerializer: (params) => {
          return qs.stringify(params, {
            arrayFormat: "repeat",
          });
        },
      })
      .then(({ data, headers }) => {
        // check for stats cookie
        if (headers["set-cookie"]) {
          const statString = headers["set-cookie"].find((c: string) => c.startsWith("hangar_stats"));
          if (statString) {
            const parsedCookies = new Cookies(statString);
            const statCookie = parsedCookies.get("hangar_stats");
            cookies.set("hangar_stats", statCookie); // TODO verify that this all works
          }
        }
        resolve(data);
      })
      .catch(async (error: AxiosError) => {
        const { trace, ...err } = error.response?.data as { trace: any };
        authLog("failed", err);
        // do we have an expired token?
        if (error.response?.status === 403) {
          if (retry) {
            // we failed on a retry, let's invalidate
            authLog("failed retry -> invalidate");
            await useAuth.invalidate();
            return reject(error);
          }
          // do we have a refresh token we could use?
          authLog("Auth instance: " + useAuth);
          const result = await useAuth.requestToken();
          if (result.token) {
            // retry
            authLog("Retrying request...");
            headers = { ...headers, Authorization: `HangarAuth ${result.token}` };
            authLog("using new token");
            try {
              const response = await request<T>(url, method, data, headers, true);
              return resolve(response);
            } catch (e) {
              return reject(e);
            }
          } else {
            authLog("Not retrying since refresh failed");
            await useAuth.invalidate();
            return reject(error);
          }
        }
        reject(error);
      });
  });
}

export async function useApi<T>(
  url: string,
  authed = true,
  method: AxiosRequestConfig["method"] = "get",
  data: object = {},
  headers: Record<string, string> = {}
): Promise<T> {
  fetchLog("useApi", url);
  return processAuthStuff(headers, authed, (headers) => request(`v1/${url}`, method, data, headers));
}

export async function useInternalApi<T = void>(
  url: string,
  authed = true,
  method: AxiosRequestConfig["method"] = "get",
  data: object = {},
  headers: Record<string, string> = {}
): Promise<T> {
  fetchLog("useInternalApi", url);
  return processAuthStuff(headers, authed, (headers) => request(`internal/${url}`, method, data, headers));
}

export async function processAuthStuff<T>(headers: Record<string, string>, authRequired: boolean, handler: (headers: Record<string, string>) => Promise<T>) {
  if (authRequired) {
    const tokenRequestResult = await useAuth.requestToken();
    if (tokenRequestResult.error) {
      throw tokenRequestResult.error;
    }

    if (tokenRequestResult.token) {
      headers = { ...headers, Authorization: `HangarAuth ${tokenRequestResult.token}` };
    }
  }

  return handler(headers);
}

export async function fetchIfNeeded<T>(func: () => Promise<T>, ref: Ref<T>) {
  if (!isEmpty(ref.value)) {
    return ref;
  }
  ref.value = await func();
  return ref;
}
