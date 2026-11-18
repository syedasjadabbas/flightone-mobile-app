/**
 * Incremental Server-Sent Events parser for Ava's stream
 * (`data: {json}\n\n` per event). Feed it decoded text chunks as they arrive;
 * it returns every complete event and keeps the partial tail for the next chunk.
 */
export function createSseParser<T = unknown>() {
  let buffer = "";

  return function push(chunk: string): T[] {
    buffer += chunk.replace(/\r\n/g, "\n");
    const events: T[] = [];
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const data = raw
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data || data === "[DONE]") continue;
      try {
        events.push(JSON.parse(data) as T);
      } catch {
        /* skip a malformed event rather than end the stream */
      }
    }
    return events;
  };
}
