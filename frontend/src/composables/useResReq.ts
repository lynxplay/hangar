import { useSSRStore } from "~/store/ssr";

export const useRequest = () => {
  if (import.meta.env.SSR) {
    const request = useSSRStore().getRequest();
    if (request) {
      return request;
    }

    console.error("request null! request:", request);
    console.trace();
    return null;
  }

  console.error("useRequest called on client?!");
  console.trace();
  return null;
};
