// app/api/schedules/[id]/route.js
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
//   // - User biasa hanya bisa mengakses untuk kliniknya (jika ada clinic_id).
//   // Untuk sekarang, kita izinkan semua user yang login.
//   // if (user.role_id !== 1 && user.clinic_id !== ...) { ... }

//   return { authorized: true, user };
// }
// --- Akhir Fungsi Bantuan ---

// --- Handler GET (Mengambil detail jadwal berdasarkan ID) ---
export async function GET(request, { params }) {
  // Gunakan params.id
  try {
    // Ambil ID dari params
    const { id } = await params; // <-- Sesuaikan dengan Next.js 15
    const scheduleId = parseInt(id);

    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: "ID jadwal tidak valid." },
        { status: 400 }
      );
    }

    // --- Autentikasi & Otorisasi ---
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

    // --- Query Database untuk Mendapatkan Detail Jadwal ---
    const schedule = await prisma.schedule.findUnique({
      where: {
        id: scheduleId,
      },
      select: {
        id: true,
        clinic_id: true,
        product_id: true,
        start_time: true,
        end_time: true,
        max_quota: true,
        remaining_quota: true,
        created_at: true,
        updated_at: true,
        clinic: {
          select: {
            name: true,
            address: true, // Sertakan field lain dari clinic jika diperlukan
          },
        },
        product: {
          select: {
            name: true,
            tariff: true, // Sertakan field lain dari product jika diperlukan
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Jadwal tidak ditemukan." },
        { status: 404 }
      );
    }

    // --- Query Database untuk Mendapatkan Daftar Medical Record untuk Jadwal Ini ---
    // const medicalRecords = await prisma.medical_record.findMany({
    //   where: {
    //     schedule_id: scheduleId,
    //   },
    //   select: {
    //     id: true,
    //     patient_id: true,
    //     schedule_id: true,
    //     tensi_darah_before: true,
    //     tensi_darah_after: true,
    //     denyut_nadi_before: true,
    //     denyut_nadi_after: true,
    //     kadar_oksigen_before: true,
    //     kadar_oksigen_after: true,
    //     is_assigned: true,
    //     created_at: true,
    //     updated_at: true,
    //     patient: { // Relasi ke patient
    //       select: {
    //         full_name: true,
    //         gender: true,
    //         date_of_birth: true,
    //         whatsapp_number: true,
    //         address: true,
    //         // Anda bisa menyertakan field lain dari patient jika diperlukan
    //       }
    //     }
    //   },
    //   orderBy: {
    //     patient_id: 'asc', // Urutkan berdasarkan ID pasien atau nama
    //   }
    // });

    // Gabungkan data schedule dan medical_records
    // const scheduleWithMedicalRecords = {
    //   ...schedule,
    //   medical_records: medicalRecords,
    // };

    // --- Respons Berhasil ---
    return NextResponse.json(schedule, { status: 200 }); // OK
  } catch (error) {
    console.error("Error fetching schedule details (GET):", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mengambil detail jadwal." },
      { status: 500 } // Internal Server Error
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler GET ---

// --- Handler PATCH (Contoh: Update remaining_quota) ---
export async function PATCH(request, { params }) {
  try {
    const { id } = await params; // <-- Sesuaikan dengan Next.js 15
    const scheduleId = parseInt(id);

    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: "ID jadwal tidak valid." },
        { status: 400 }
      );
    }

    // --- Autentikasi & Otorisasi ---
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

    const body = await request.json();
    const { quantity_to_subtract } = body; // Contoh: Kirim jumlah untuk dikurangi

    if (quantity_to_subtract == null || quantity_to_subtract <= 0) {
      return NextResponse.json(
        {
          error:
            "quantity_to_subtract wajib diisi dan harus lebih besar dari 0.",
        },
        { status: 400 }
      );
    }

    // Gunakan transaction untuk update quota
    const updatedSchedule = await prisma.$transaction(async (tx) => {
      const scheduleInTx = await tx.schedule.findUnique({
        where: { id: scheduleId },
        select: { remaining_quota: true },
      });

      if (!scheduleInTx) {
        throw new Error("Jadwal tidak ditemukan saat transaksi.");
      }

      if (quantity_to_subtract > scheduleInTx.remaining_quota) {
        throw new Error("Jumlah yang ingin dikurangi melebihi sisa kuota.");
      }

      return tx.schedule.update({
        where: { id: scheduleId },
        data: {
          remaining_quota: {
            decrement: quantity_to_subtract,
          },
        },
        select: {
          id: true,
          remaining_quota: true,
          max_quota: true,
          start_time: true,
          end_time: true,
          clinic_id: true,
          product_id: true,
        },
      });
    });

    return NextResponse.json(updatedSchedule, { status: 200 });
  } catch (error) {
    console.error("Error updating schedule quota (PATCH):", error);

    if (error.message && error.message.includes("melebihi sisa kuota")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Record tidak ditemukan saat update
        return NextResponse.json(
          { error: "Jadwal tidak ditemukan." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memperbarui jadwal." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler PATCH ---

// --- Handler DELETE (Contoh: Soft Delete) ---
// export async function DELETE(request, { params }) {
//   try {
//     const { id } = await params; // <-- Sesuaikan dengan Next.js 15
//     const scheduleId = parseInt(id);

//     if (isNaN(scheduleId)) {
//         return NextResponse.json({ error: 'ID jadwal tidak valid.' }, { status: 400 });
//     }

//     // --- Autentikasi & Otorisasi ---
//     const sessionToken = (await cookies()).get('sessionToken')?.value;

//     if (!sessionToken) {
//       return NextResponse.json({ error: 'Unauthorized: Sesi tidak ditemukan.' }, { status: 401 });
//     }

//     const { authorized, user } = await checkAuthorization(sessionToken);

//     if (!authorized) {
//       return NextResponse.json({ error: 'Forbidden: Akses ditolak.' }, { status: 403 });
//     }

//     // Update schedule untuk menandai sebagai dihapus (misalnya dengan field is_deleted)
//     // Kita asumsikan model schedule memiliki field is_deleted Boolean @default(false)
//     const updatedSchedule = await prisma.schedule.update({
//       where: { id: scheduleId },
//        {
//         is_deleted: true, // Atau field lain yang menandai deleted
//       },
//       select: {
//         id: true,
//         is_deleted: true,
//       }
//     });

//     return NextResponse.json({ message: 'Jadwal berhasil dihapus.', updatedSchedule }, { status: 200 });

//   } catch (error) {
//     console.error('Error deleting schedule (DELETE):', error);

//     if (error instanceof PrismaClientKnownRequestError) {
//       if (error.code === 'P2025') { // Record tidak ditemukan saat update
//         return NextResponse.json({ error: 'Jadwal tidak ditemukan.' }, { status: 404 });
//       }
//     }

//     return NextResponse.json(
//       { error: 'Terjadi kesalahan server saat menghapus jadwal.' },
//       { status: 500 }
//     );
//   } finally {
//     await prisma.$disconnect();
//   }
// }
// --- Akhir Handler DELETE ---
