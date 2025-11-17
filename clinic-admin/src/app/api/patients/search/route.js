// app/api/patients/search/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../../utils/session"; // Sesuaikan path naik 3 level
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Handler untuk GET (Pencarian Pasien) ---
export async function GET(request) {
  try {
    // --- 1. Autentikasi & Otorisasi ---
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // --- 2. Parsing & Validasi Parameter ---
    const url = new URL(request.url); // Gunakan URL constructor
    const rawQuery = url.searchParams.get("q");
    const limitParam = url.searchParams.get("limit");

    const trimmedQuery = rawQuery ? rawQuery.trim() : "";

    // --- PERUBAHAN: Izinkan q kosong atau tidak ada ---
    if (!rawQuery || trimmedQuery === "") {
      return NextResponse.json([], { status: 200 }); // Kembalikan array kosong
    }
    // --- AKHIR PERUBAHAN ---

    // Validasi limit
    const limit = parseInt(limitParam);
    const finalLimit = isNaN(limit) || limit <= 0 ? 10 : Math.min(limit, 100); // Default 10, maks 100

    // --- 3. Query Database untuk Pencarian ---
    const patients = await prisma.patient.findMany({
      where: {
        full_name: {
          contains: trimmedQuery,
        },
      },
      select: {
        id: true,
        full_name: true,
        gender: true,
        date_of_birth: true,
        whatsapp_number: true,
        address: true,
        registration_date: true,
        referral_type_id: true,
        referral_id: true,
        referral_type: {
          select: {
            name: true,
          },
        },
        referred_by: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
      orderBy: {
        full_name: "asc",
      },
      take: finalLimit,
    });

    // --- 4. Respons Berhasil ---
    return NextResponse.json(patients, { status: 200 });
  } catch (error) {
    console.error("Error searching patients:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mencari pasien." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// --- Placeholder untuk metode HTTP lain jika diperlukan di /api/patients/search ---
// export async function POST(request) { ... } // Biasanya tidak digunakan untuk endpoint search
