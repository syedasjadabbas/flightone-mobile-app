import { CLIENT_PLATFORM } from "@/core/config/env";
import { peekDeviceId } from "@/core/auth/deviceId";

/** Headers every request carries, authenticated or not. */
export function clientHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "X-Client-Platform": CLIENT_PLATFORM };
  const deviceId = peekDeviceId();
  if (deviceId) headers["X-Device-Id"] = deviceId;
  return headers;
}
