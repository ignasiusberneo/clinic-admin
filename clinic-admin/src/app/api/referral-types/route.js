// app/api/referral-types/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session"; // Sesuaikan path jika perlu
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Handler untuk GET (Mengambil semua referral_type) ---
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

    // const user = await validateAndUpdateSession(sessionToken);

    // if (!user) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Akses ditolak." },
    //     { status: 401 }
    //   );
    // }

    // --- 2. Query Database ---
    // Ambil semua referral_type, diurutkan berdasarkan id
    const referralTypes = await prisma.referral_type.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    // --- 3. Respons Berhasil ---
    return NextResponse.json(referralTypes, { status: 200 });
  } catch (error) {
    console.error("Error fetching referral types:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mengambil data jenis rujukan." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// --- Placeholder untuk handler lain jika diperlukan di masa depan ---
// export async function POST(request) { ... }
// export async function PUT(request, { params }) { ... }
// export async function DELETE(request, { params }) { ... }
