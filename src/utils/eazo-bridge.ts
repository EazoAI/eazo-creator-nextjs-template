const BRIDGE_CHANNEL = "eazo:open-bridge";
const BRIDGE_VERSION = 1;
const BRIDGE_TIMEOUT_MS = 5000;

export function requestBridgeApi(
  method: string,
  params: Record<string, unknown> = {}
): Promise<Record<string, string>> {
  const requestId = crypto.randomUUID();
  console.log("[eazo-bridge] sending request", { method, params, requestId });

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      console.error("[eazo-bridge] timeout waiting for response", { method, requestId });
      reject(new Error(`Bridge timeout: no response for "${method}" after ${BRIDGE_TIMEOUT_MS}ms`));
    }, BRIDGE_TIMEOUT_MS);

    function onMessage(event: MessageEvent) {
      const msg = event.data;
      console.log("[eazo-bridge] received message", msg);

      if (
        !msg ||
        msg.channel !== BRIDGE_CHANNEL ||
        msg.type !== "response" ||
        msg.requestId !== requestId
      ) {
        return;
      }
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);

      if (msg.ok) {
        console.log("[eazo-bridge] resolved", { method, result: msg.result });
        resolve(msg.result as Record<string, string>);
      } else {
        console.error("[eazo-bridge] rejected", { method, error: msg.error });
        reject(new Error(msg.error ?? "Bridge error"));
      }
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage(
      {
        channel: BRIDGE_CHANNEL,
        type: "request",
        requestId,
        version: BRIDGE_VERSION,
        method,
        params,
      },
      "*"
    );
  });
}
