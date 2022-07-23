import { useCookies as cookies } from "@vueuse/integrations/useCookies";
import Cookies from "universal-cookie";
import { useSSRStore } from "~/store/ssr";

export const useCookies = () => {
  if (import.meta.env.SSR) {
    const req = useSSRStore().getRequest();
    return new Cookies(req?.headers?.cookie ?? "");
  } else {
    return cookies();
  }
};
