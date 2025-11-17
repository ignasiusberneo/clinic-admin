// app/api/payment-methods/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Fungsi Bantuan untuk Otorisasi ---
// Fungsi ini bisa disesuaikan dengan kebijakan akses Anda.
// Misalnya, hanya superadmin yang bisa mengakses daftar metode pembayaran.
async function checkAuthorization(sessionToken) {
  const user = await validateAndUpdateSession(sessionToken);

  if (!user) {
    return { authorized: false, user: null };
  }

  // Contoh: Hanya superadmin (role_id = 1) yang bisa mengakses
  // if (user.role_id !== 1) {
  //   return { authorized: false, user };
  // }

  // Untuk sekarang, kita izinkan semua user yang login
  return { authorized: true, user };
}
// --- Akhir Fungsi Bantuan ---

// --- Handler GET (Mengambil daftar metode pembayaran) ---
export async function GET() {
  try {
    // --- 1. Autentikasi & Otorisasi ---
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Sesi tidak ditemukan." },
    //     { status: 401 }
    //   );
    // }

    // const { authorized, user } = await checkAuthorization(sessionToken);

    // if (!authorized) {
    //   return NextResponse.json(
    //     { error: "Forbidden: Akses ditolak." },
    //     { status: 403 }
    //   );
    // }

    // --- 2. Query Database untuk Mendapatkan Payment Methods ---
    // Ambil semua metode pembayaran
    const paymentMethods = await prisma.payment_method.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc", // Urutkan berdasarkan ID
      },
    });

    // --- 3. Respons Berhasil ---
    return NextResponse.json(paymentMethods, { status: 200 }); // OK
  } catch (error) {
    console.error("Error fetching payment methods (GET):", error);
    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan server saat mengambil daftar metode pembayaran.",
      },
      { status: 500 } // Internal Server Error
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler GET ---
