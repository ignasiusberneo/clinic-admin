// utils/session.js
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// --- Fungsi Bantu: Tidur (Sleep) ---
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// --- Akhir Fungsi Bantu ---

// --- Fungsi Bantu: Membuat Session Token Baru ---
export async function createUserSession(userId, expires) {
  // Buat session token acak
  const sessionToken =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  try {
    // Simpan session ke database
    const session = await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires,
      },
      select: {
        id: true,
        sessionToken: true,
        userId: true,
        expires: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            username: true,
            role_id: true,
            business_area_id: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });

    // Kembalikan session token yang dibuat
    return sessionToken;
  } catch (error) {
    console.error("Error creating user session:", error);
    throw new Error("Gagal membuat session pengguna.");
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Fungsi Bantu: Membuat Session Token Baru ---

export async function validateSessionOnly(sessionToken) {
  if (!sessionToken) {
    return null; // Session token tidak ada
  }

  try {
    // 1. Cari session berdasarkan token
    const sessionRecord = await prisma.session.findUnique({
      where: { sessionToken },
      select: {
        expires: true,
        user: {
          select: {
            id: true,
            username: true,
            role_id: true,
            clinic_id: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });

    // 2. Jika session tidak ditemukan
    if (!sessionRecord) {
      return null;
    }

    // 3. Jika session sudah kadaluarsa
    const now = new Date();
    if (sessionRecord.expires < now) {
      // Opsional: Hapus session yang kadaluarsa secara asynchronous untuk 'kebersihan'
      // prisma.session.delete({ where: { sessionToken } }).catch(console.error);
      return null;
    }

    // 4. Session valid, kembalikan data user
    return sessionRecord.user;
  } catch (error) {
    // Tangani error koneksi atau error Prisma lainnya
    console.error("Error during session validation:", error);
    // Dalam kasus error database, kita anggap sesi tidak valid demi keamanan
    return null;
  }
}

// --- Fungsi Bantu: Validasi & Perbarui Session dengan Transaction dan Retry ---
export async function validateAndUpdateSession(sessionToken) {
  if (!sessionToken) {
    return null; // Session token tidak ada
  }

  const maxRetries = 3; // Maksimal 3 kali percobaan
  let retries = 0;

  // Hitung waktu expires baru (misalnya 1 jam dari sekarang) di luar loop
  // Nilai ini konstan untuk setiap percobaan.
  const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
  const newExpires = new Date(Date.now() + ONE_DAY_IN_MS);

  while (retries < maxRetries) {
    try {
      // --- Gunakan prisma.$transaction dengan satu operasi Update Kondisional ---
      const result = await prisma.$transaction(
        async (tx) => {
          // Coba perbarui session HANYA jika:
          // 1. sessionToken cocok
          // 2. session BELUM kadaluarsa (expires > waktu saat ini)
          const updatedSession = await tx.session
            .update({
              where: {
                sessionToken: sessionToken,
                expires: {
                  gt: new Date(), // Sesi harus masih berlaku (lebih besar dari waktu sekarang)
                },
              },
              data: {
                expires: newExpires, // Perbarui waktu kadaluarsa
              },
              select: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    role_id: true,
                    business_area_id: true,
                    role: {
                      select: {
                        name: true,
                        rolePermissions: {
                          select: {
                            permission: {
                              select: {
                                name: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            })
            // Tangani kasus ketika record tidak ditemukan (P2025)
            // Ini terjadi jika sessionToken tidak ada ATAU sudah kadaluarsa (karena kondisi `gt: new Date()`)
            .catch((e) => {
              if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === "P2025") {
                  return null; // Session tidak valid/kadaluarsa, anggap hasilnya null
                }
              }
              throw e; // Lempar error lain
            });

          // Jika session tidak ditemukan/tidak valid/kadaluarsa, kembalikan null
          if (!updatedSession) {
            return null;
          }

          // Kembalikan data user dari session yang berhasil diperbarui
          return updatedSession.user;
        }
        // Catatan: isolationLevel tidak perlu diatur, menggunakan default Read Committed sudah cukup
        // karena kita sudah memvalidasi dan mengunci baris dalam satu operasi Update.
      );

      // Jika transaksi berhasil, kembalikan hasilnya
      return result;
    } catch (error) {
      // --- Tangani error Deadlock/Write Conflict (P2034) dengan Retry Logic ---
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        retries++;
        console.warn(
          `Write conflict or deadlock (P2034) on session update attempt ${retries}. Retrying...`
        );

        if (retries < maxRetries) {
          // Tunggu sejenak sebelum retry (simple exponential backoff)
          await sleep(50 * retries);
        } else {
          console.error(
            "Max retries reached for session update. Throwing error.",
            error
          );
          throw error; // Lempar error jika sudah mencapai max retries
        }
      } else {
        // Lempar error lainnya (termasuk error non-Prisma)
        console.error(
          "Non-retryable error in validateAndUpdateSession:",
          error
        );
        throw error;
      }
    }
  }

  // Baris ini secara teknis tidak tercapai karena error akan dilempar di dalam loop,
  // tetapi ini adalah safety net jika ada kasus edge.
  throw new Error("Gagal memperbarui session setelah beberapa percobaan.");
}
// --- Akhir Fungsi Bantu: Validasi & Perbarui Session dengan Transaction dan Retry ---

// --- Fungsi Bantu: Hapus Session ---
export async function deleteSession(sessionToken) {
  try {
    await prisma.session.deleteMany({
      where: { sessionToken },
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    // Opsional: Lempar error atau tangani sesuai kebutuhan
    // throw new Error("Gagal menghapus session pengguna.");
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Fungsi Bantu: Hapus Session ---
