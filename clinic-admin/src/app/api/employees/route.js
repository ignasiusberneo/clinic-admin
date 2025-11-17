// app/api/employees/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Fungsi Bantuan untuk Otorisasi ---
// async function checkAuthorization(sessionToken) {
//   const user = await validateSession(sessionToken);

//   if (!user) {
//     return { authorized: false, user: null };
//   }

//   // Contoh logika otorisasi sederhana:
//   // - Superadmin (role_id = 1) bisa mengakses semua.
//   // Untuk sekarang, kita izinkan semua user yang login.
//   // if (user.role_id !== 1 && user.clinic_id !== ...) { ... }

//   return { authorized: true, user };
// }
// --- Akhir Fungsi Bantuan ---

// --- Handler GET (Mengambil daftar karyawan) ---
export async function GET(request) {
  try {
    // --- 1. Parsing URL dan Query Parameters ---
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q"); // Parameter untuk pencarian nama
    // Anda bisa menambahkan parameter lain seperti clinic_id jika diperlukan

    // --- 2. Autentikasi & Otorisasi ---
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

    // --- 3. Bangun Klausa Where untuk Query ---
    let whereClause = {};

    // Jika ada query pencarian, tambahkan kondisi pencarian nama
    if (q) {
      whereClause.full_name = {
        contains: q.trim(), // Gunakan contains untuk pencarian substring
      };
    }

    // Anda bisa menambahkan filter lain di sini jika diperlukan

    // --- 4. Query Database untuk Mendapatkan Daftar Karyawan ---
    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: {
        nip: true,
        nik: true,
        full_name: true,
        gender: true,
        date_of_birth: true,
        address: true,
        whatsapp_number: true,
        business_area_id: true,
        employee_title_id: true,
        user_id: true,
        created_at: true,
        updated_at: true,
        business_area: {
          select: {
            name: true,
            address: true, // Sertakan field lain dari clinic jika diperlukan
          },
        },
        employee_title: {
          select: {
            name: true, // Sertakan field lain dari employee_position jika diperlukan
          },
        },
        user: {
          select: {
            username: true, // Sertakan field lain dari user jika diperlukan
          },
        },
      },
      orderBy: {
        full_name: "asc", // Urutkan berdasarkan nama
      },
    });

    // --- 5. Respons Berhasil ---
    return NextResponse.json(employees, { status: 200 }); // OK
  } catch (error) {
    console.error("Error fetching employees (GET):", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mengambil daftar karyawan." },
      { status: 500 }
    ); // Internal Server Error
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler GET ---

// --- Handler POST (Menambah karyawan) ---
export async function POST(request) {
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

    // --- 2. Parsing Body Request ---
    const body = await request.json();
    const {
      nip,
      nik,
      full_name,
      gender,
      date_of_birth,
      address,
      whatsapp_number,
      business_area_id,
      employee_title_id,
    } = body;

    // --- 3. Validasi Input ---
    if (!nip || !nik || !full_name || !gender || !date_of_birth) {
      return NextResponse.json(
        {
          error: "nip, nik, full_name, gender, dan date_of_birth wajib diisi.",
        },
        { status: 400 } // Bad Request
      );
    }

    const parsedBusinessAreaId = business_area_id
      ? parseInt(business_area_id)
      : null; // Bisa null

    // Validasi format tanggal (sederhana)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date_of_birth)) {
      return NextResponse.json(
        {
          error: "Format tanggal lahir tidak valid. Gunakan format YYYY-MM-DD.",
        },
        { status: 400 } // Bad Request
      );
    }

    const dob = new Date(date_of_birth);
    if (isNaN(dob.getTime())) {
      return NextResponse.json(
        { error: "Tanggal lahir tidak valid." },
        { status: 400 } // Bad Request
      );
    }

    // --- 4. (Opsional) Validasi tambahan: Pastikan clinic_id dan employee_position_id valid ---
    // Jika clinic_id disediakan
    if (parsedBusinessAreaId) {
      const businessAreaExists = await prisma.business_area.findUnique({
        where: { id: parsedBusinessAreaId },
      });

      if (!businessAreaExists) {
        return NextResponse.json(
          {
            error: `Lokasi dengan id ${parsedBusinessAreaId} tidak ditemukan.`,
          },
          { status: 400 } // Bad Request
        );
      }
    }

    const positionExists = await prisma.employee_title.findUnique({
      where: { id: employee_title_id },
    });

    if (!positionExists) {
      return NextResponse.json(
        {
          error: `Posisi karyawan dengan id ${employee_title_id} tidak ditemukan.`,
        },
        { status: 400 } // Bad Request
      );
    }
    // --- Akhir Validasi tambahan ---

    // --- 5. Buat record karyawan baru di database ---
    const newEmployee = await prisma.employee.create({
      data: {
        // <-- Tambahkan 'data'
        nip,
        nik,
        full_name,
        gender,
        date_of_birth: dob,
        address: address || null, // Simpan sebagai null jika string kosong
        whatsapp_number: whatsapp_number || null, // Simpan sebagai null jika string kosong
        business_area_id: parsedBusinessAreaId, // Bisa null
        employee_title_id: employee_title_id, // Bisa null
      },
      select: {
        nip: true,
        nik: true,
        full_name: true,
        gender: true,
        date_of_birth: true,
        address: true,
        whatsapp_number: true,
        business_area_id: true,
        employee_title_id: true,
        created_at: true,
        updated_at: true,
        business_area: {
          select: {
            name: true,
            address: true,
          },
        },
        employee_title: {
          select: {
            name: true,
          },
        },
      },
    });

    // --- 6. Respons Berhasil ---
    return NextResponse.json(newEmployee, { status: 201 }); // Created
  } catch (error) {
    console.error("Error creating employee (POST):", error);

    // Tangani error Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Contoh: Unique constraint violation (P2002)
      if (error.code === "P2002") {
        if (error.meta?.target?.includes("nip")) {
          return NextResponse.json(
            { error: "NIP sudah digunakan." },
            { status: 400 } // Bad Request
          );
        }
        if (error.meta?.target?.includes("nik")) {
          return NextResponse.json(
            { error: "NIK sudah digunakan." },
            { status: 400 } // Bad Request
          );
        }
      }
    }

    // Error umum server
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat menambahkan karyawan." },
      { status: 500 } // Internal Server Error
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler POST ---
