import { DateTime } from "luxon";

/**
 * Menghitung batas waktu UTC untuk 00:00:00 dan 00:00:00 hari berikutnya
 * berdasarkan tanggal YYYY-MM-DD dan zona waktu client.
 */
export function getUTCDayBoundaries(dateStr, timezone) {
  // 1. Buat DateTime Luxon dari string tanggal di zona waktu client yang ditentukan
  // Ini merepresentasikan 00:00:00 di hari yang diminta di zona waktu client.
  const startOfDayClient = DateTime.fromISO(dateStr, { zone: timezone });

  if (!startOfDayClient.isValid) {
    throw new Error("Format tanggal atau zona waktu tidak valid.");
  }

  // 2. Batas awal (00:00:00 di zona client, diubah ke UTC)
  // start_time >= [UTC yang setara dengan 00:00:00 Client]
  const startBoundaryUTC = startOfDayClient.toJSDate(); // Kembali ke objek Date JS/Prisma

  // 3. Batas akhir (00:00:00 hari berikutnya di zona client, diubah ke UTC)
  // start_time < [UTC yang setara dengan 00:00:00 Client hari berikutnya]
  const endBoundaryUTC = startOfDayClient.plus({ days: 1 }).toJSDate(); // Maju 1 hari

  return { startBoundaryUTC, endBoundaryUTC };
}
