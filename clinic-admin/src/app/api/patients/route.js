// app/api/patients/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { Prisma, PrismaClient } from "@prisma/client";
// --- Impor error Prisma yang spesifik ---
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
// --- Akhir Impor ---

const prisma = new PrismaClient();

// --- Fungsi Bantuan untuk Otorisasi ---
async function checkSuperAdmin(sessionToken) {
  const user = await validateAndUpdateSession(sessionToken);

  if (!user) {
    return { authorized: false, user: null };
  }

  // Contoh logika otorisasi sederhana:
  // - Superadmin (role_id = 1) bisa mengakses semua pasien.
  // - User biasa hanya bisa mengakses pasien dari kliniknya sendiri (jika ada clinic_id).
  // Untuk sekarang, kita izinkan semua user yang login.
  // if (user.role_id !== 1 && user.clinic_id !== parseInt(requestedClinicId)) {
  //   return { authorized: false, user };
  // }

  return { authorized: true, user };
}
// --- Akhir Fungsi Bantuan ---

// --- Handler untuk GET (Pencarian Pasien) ---
export async function GET(request) {
  try {
    // --- 1. Autentikasi & Otorisasi ---
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // --- 2. Parsing URL dan Query Parameters ---
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q"); // Kata kunci pencarian
    const limitParam = searchParams.get("limit"); // Batas hasil

    // --- 3. Validasi & Penanganan Query Kosong ---
    // Jika q tidak ada atau string kosong (setelah trim), kembalikan array kosong
    const trimmedQuery = query ? query.trim() : "";
    if (!query || trimmedQuery === "") {
      console.log(
        "Query parameter `q` kosong atau tidak ada. Mengembalikan array kosong."
      );
      return NextResponse.json([], { status: 200 }); // <-- Kembalikan 200 OK dengan array kosong
    }

    // --- 4. Validasi & Parsing Limit ---
    const limit = parseInt(limitParam);
    const finalLimit = isNaN(limit) || limit <= 0 ? 10 : Math.min(limit, 100); // Default 10, maks 100

    // --- 5. Query Database untuk Pencarian ---
    console.log(
      `Mencari pasien dengan query: '${trimmedQuery}', limit: ${finalLimit}`
    );

    const patients = await prisma.patient.findMany({
      where: {
        full_name: {
          contains: trimmedQuery, // Gunakan query yang sudah di-trim
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
        // Sertakan relasi jika diperlukan
        referral_type: {
          select: {
            name: true,
          },
        },
        referred_by: {
          // Pasien yang merujuk
          select: {
            id: true,
            full_name: true,
          },
        },
      },
      orderBy: {
        full_name: "asc", // Urutkan berdasarkan nama
      },
      take: finalLimit, // Gunakan limit yang sudah divalidasi
    });

    console.log(`Ditemukan ${patients.length} pasien.`);
    // --- 6. Respons Berhasil ---
    return NextResponse.json(patients, { status: 200 });
  } catch (error) {
    console.error("Error searching patients (GET):", error);
    // Tangani error validasi Prisma jika diperlukan
    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        { error: "Bad Request: Format parameter pencarian tidak valid." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mencari pasien." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler GET ---

// --- Handler untuk POST (Menambah Pasien) ---
export async function POST(request) {
  try {
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // const { authorized, user } = await checkSuperAdmin(sessionToken);

    // if (!authorized) {
    //   return NextResponse.json(
    //     { error: "Forbidden: Superadmin only" },
    //     { status: 403 }
    //   );
    // }

    const body = await request.json();
    const {
      full_name,
      gender,
      date_of_birth,
      whatsapp_number,
      address,
      referral_type_id,
      referral_id, // ID pasien perujuk (opsional)
    } = body;

    // --- Validasi Input ---
    if (!full_name || !gender || !date_of_birth || !referral_type_id) {
      return NextResponse.json(
        {
          error:
            "full_name, gender, date_of_birth, dan referral_type_id wajib diisi.",
        },
        { status: 400 }
      );
    }

    const parsedReferralTypeId = parseInt(referral_type_id);
    let parsedReferralId = null; // Default ke null

    // --- Validasi referral_id ---
    // Hanya proses referral_id jika ada dan bukan string kosong/null
    if (
      referral_id !== undefined &&
      referral_id !== null &&
      referral_id !== ""
    ) {
      // Coba parsing ke integer
      parsedReferralId = parseInt(referral_id, 10);

      // Validasi apakah hasil parsing adalah angka yang valid dan positif
      if (isNaN(parsedReferralId) || parsedReferralId <= 0) {
        return NextResponse.json(
          { error: "referral_id harus berupa angka bulat positif yang valid." },
          { status: 400 }
        );
      }

      // --- Validasi tambahan: Pastikan pasien perujuk (referral_id) ada ---
      const referringPatientExists = await prisma.patient.findUnique({
        where: { id: parsedReferralId },
      });

      if (!referringPatientExists) {
        return NextResponse.json(
          {
            error: `Pasien perujuk dengan id ${parsedReferralId} tidak ditemukan.`,
          },
          { status: 400 } // Bad Request karena input pengguna tidak valid
        );
      }
      // --- Akhir Validasi tambahan ---
    }
    // Jika referral_id tidak disediakan, kosong, null, atau tidak valid, parsedReferralId tetap null.
    // Ini akan menyebabkan Prisma menyimpan NULL ke kolom referral_id, yang diperbolehkan karena nullable.
    // --- Akhir Validasi referral_id ---

    if (isNaN(parsedReferralTypeId)) {
      return NextResponse.json(
        { error: "referral_type_id harus berupa angka." },
        { status: 400 }
      );
    }

    const dob = new Date(date_of_birth);
    if (isNaN(dob.getTime())) {
      return NextResponse.json(
        { error: "Format date_of_birth tidak valid (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    // Validasi apakah referral_type ada
    const referralTypeExists = await prisma.referral_type.findUnique({
      where: { id: parsedReferralTypeId },
    });

    if (!referralTypeExists) {
      return NextResponse.json(
        {
          error: `Jenis rujukan dengan id ${parsedReferralTypeId} tidak ditemukan.`,
        },
        { status: 400 }
      );
    }

    // --- Buat Pasien Baru ---
    const newPatient = await prisma.patient.create({
      data: {
        // <-- Tambahkan 'data'
        full_name: full_name.trim(),
        gender: gender.trim(),
        date_of_birth: dob,
        whatsapp_number: whatsapp_number ? whatsapp_number.trim() : null,
        address: address ? address.trim() : null,
        referral_type_id: parsedReferralTypeId,
        referral_id: parsedReferralId, // Bisa null
        // registration_date akan diisi otomatis oleh @default(now())
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
    });

    return NextResponse.json(newPatient, { status: 201 });
  } catch (error) {
    console.error("Error creating patient (POST):", error);

    // --- Tangani error khusus Prisma ---
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Contoh: Unique constraint violation (P2002)
      if (error.code === "P2002") {
        // Ini bisa terjadi jika ada duplikasi berdasarkan constraint unik
        // Misalnya: @@unique([full_name, date_of_birth]) jika ada
        return NextResponse.json(
          {
            error:
              "Conflict: Pasien dengan nama dan tanggal lahir tersebut sudah ada.",
            // details: error.message, // Opsional: sertakan detail error untuk debugging internal
          },
          { status: 409 } // 409 Conflict
        );
      }
    }

    // Tangani error validasi Prisma (misalnya struktur data salah)
    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("Prisma Validation Error Details:", error.message);
      return NextResponse.json(
        {
          error:
            "Bad Request: Data pasien tidak valid. Mohon periksa kembali format dan isi data Anda.",
          // details: error.message, // Opsional: sertakan detail error untuk debugging internal
        },
        { status: 400 } // 400 Bad Request
      );
    }
    // --- Akhir Tangani error khusus Prisma ---

    return NextResponse.json(
      { error: "Terjadi kesalahan server saat membuat pasien." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler POST ---

// --- Placeholder untuk handler API lainnya ---
// export async function PUT(request, { params }) { ... }
// export async function DELETE(request, { params }) { ... }
