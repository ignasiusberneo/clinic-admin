// app/api/employee-positions/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Fungsi Bantuan untuk Otorisasi ---
// Kita asumsikan hanya user yang login bisa melihat daftar posisi
// async function checkAuthorization(sessionToken) {
//   const user = await validateSession(sessionToken);

//   if (!user) {
//     return { authorized: false, user: null };
//   }

//   // Contoh logika otorisasi sederhana:
//   // - Superadmin (role_id = 1) bisa mengakses semua.
//   // - User biasa hanya bisa mengakses posisi jika diperlukan.
//   // Untuk sekarang, kita izinkan semua user yang login.
//   // if (user.role_id !== 1) { ... }

//   return { authorized: true, user };
// }
// --- Akhir Fungsi Bantuan ---

// --- Handler GET (Mengambil daftar employee_position) ---
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessAreaId = searchParams.get("business_area_id");
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

    // --- 2. Query Database untuk Mendapatkan Daftar Employee Position ---
    const positions = await prisma.employee_title.findMany({
      where: {
        business_area_id: parseInt(businessAreaId),
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc", // Urutkan berdasarkan nama
      },
    });

    // --- 3. Respons Berhasil ---
    return NextResponse.json(positions, { status: 200 }); // OK
  } catch (error) {
    console.error("Error fetching employee positions (GET):", error);
    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan server saat mengambil daftar posisi karyawan.",
      },
      { status: 500 } // Internal Server Error
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler GET ---

// --- Placeholder untuk handler lain jika diperlukan di masa depan ---
// export async function POST(request) { ... }
// export async function PUT(request, { params }) { ... }
// export async function DELETE(request, { params }) { ... }
