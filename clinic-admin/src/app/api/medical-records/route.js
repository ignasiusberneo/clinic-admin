// app/api/medical-records/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Fungsi Bantuan untuk Otorisasi ---
// async function checkAuthorization(sessionToken) {
//   const user = await validateSession(sessionToken);

//   if (!user) {
//     return { authorized: false, user: null };
//   }

//   // Contoh logika otorisasi sederhana:
//   // - Superadmin (role_id = 1) bisa mengakses semua.
//   // - User biasa hanya bisa mengakses untuk kliniknya (jika ada clinic_id).
//   // Untuk sekarang, kita izinkan semua user yang login.
//   // if (user.role_id !== 1 && user.clinic_id !== ...) { ... }

//   return { authorized: true, user };
// }
// --- Akhir Fungsi Bantuan ---

// --- Handler GET (Mengambil daftar medical_record berdasarkan schedule_id) ---
export async function GET(request) {
  try {
    // --- 1. Parsing URL dan Query Parameters ---
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("schedule_id");

    // --- 2. Validasi Parameter Wajib ---
    if (!scheduleId) {
      return NextResponse.json(
        { error: "Parameter schedule_id wajib disertakan." },
        { status: 400 } // Bad Request
      );
    }

    const parsedScheduleId = parseInt(scheduleId);

    if (isNaN(parsedScheduleId)) {
      return NextResponse.json(
        { error: "Parameter schedule_id harus berupa angka." },
        { status: 400 } // Bad Request
      );
    }

    // --- 3. Autentikasi & Otorisasi ---
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Sesi tidak ditemukan." },
    //     { status: 401 }
    //   );
    // }

    // const { authorized, user } = await checkAuthorization(sessionToken);

    // if (!authorized) {
    //   return NextResponse.json({ error: 'Forbidden: Akses ditolak.' }, { status: 403 });
    // }

    // --- 4. Query Database untuk Mendapatkan Daftar Medical Record ---
    const medicalRecords = await prisma.medical_record.findMany({
      where: {
        schedule_id: parsedScheduleId,
      },
      select: {
        id: true,
        patient_id: true,
        schedule_id: true,
        tensi_darah_before: true,
        tensi_darah_after: true,
        denyut_nadi_before: true,
        denyut_nadi_after: true,
        kadar_oksigen_before: true,
        kadar_oksigen_after: true,
        created_at: true,
        updated_at: true,
        patient: {
          // Relasi ke patient
          select: {
            full_name: true,
            gender: true,
            date_of_birth: true,
            whatsapp_number: true,
            address: true,
            // Anda bisa menyertakan field lain dari patient jika diperlukan
          },
        },
      },
      orderBy: {
        patient_id: "asc", // Urutkan berdasarkan ID pasien atau nama
      },
    });

    // --- 5. Respons Berhasil ---
    return NextResponse.json(medicalRecords, { status: 200 }); // OK
  } catch (error) {
    console.error("Error fetching medical records (GET):", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mengambil daftar rekam medis." },
      { status: 500 } // Internal Server Error
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler GET ---

// --- Placeholder untuk handler lain (POST, PUT, etc.) ---
// export async function POST(request) { ... }
// export async function PUT(request, { params }) { ... } // Jika Anda ingin meng-update satu record
