import { defineStore } from "pinia";
import { ref, Ref } from "vue";
import { ssrLog } from "~/lib/composables/useLog";
import http from "http";

export const useSSRStore = defineStore("ssr", () => {
  const request: Ref<http.IncomingMessage | null> = ref(null);

  function setRequest(newRequest: http.IncomingMessage | null) {
    const tokenizedRequest = (newRequest?.headers?.cookie ?? "").includes("HangarAuth_REFRESH");

    ssrLog(`updating current ssr request tokenProvided=${tokenizedRequest} completed=${newRequest?.complete}`);
    if (!tokenizedRequest) ssrLog("cookies:", newRequest?.headers?.cookie);

    request.value = newRequest;
  }

  function getRequest(): http.IncomingMessage | null {
    return request.value;
  }

  return { setRequest, getRequest };
});
