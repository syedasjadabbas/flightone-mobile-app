import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

/** A4 in points: what printToFileAsync lays the page out on. */
const A4 = { width: 595, height: 842 };

const safe = (s: string) => s.replace(/[^A-Za-z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "ticket";

/**
 * Render the e-ticket HTML to a PDF named like "FlightOne-eTicket-ABC123.pdf"
 * (in the app's cache) and return its uri.
 */
export async function makeTicketPdf(html: string, name: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html, ...A4 });
  const fileName = `${safe(name)}.pdf`;
  try {
    const target = new File(Paths.cache, fileName);
    if (target.exists) target.delete();
    await new File(uri).move(target);
    return target.uri;
  } catch {
    return uri; // keep the generated name if renaming isn't possible
  }
}

/**
 * Open the share sheet for the PDF: "Save to Files", AirDrop, WhatsApp, Mail, Print…
 * (on iOS the UTI makes apps treat it as a PDF document).
 */
export async function sharePdf(uri: string, title: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn't available on this device.");
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: title });
}

/** Straight to the system print dialog (AirPrint / Android print). */
export async function printTicket(html: string): Promise<void> {
  await Print.printAsync({ html, ...(Platform.OS === "ios" ? {} : A4) });
}
