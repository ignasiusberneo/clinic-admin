// app/api/schedules/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";
import { getUTCDayBoundaries } from "@/utils/api_helpers";

const prisma = new PrismaClient();

// --- Fungsi Bantuan untuk Otorisasi ---
async function checkAuthorization(sessionToken) {
  const user = await validateAndUpdateSession(sessionToken);

  if (!user) {
    return { authorized: false, user: null };
  }

  // Contoh logika otorisasi sederhana:
  // - Superadmin (role_id = 1) bisa mengakses semua.
  // - User biasa hanya bisa mengakses untuk kliniknya (jika ada clinic_id).
  // Untuk sekarang, kita izinkan semua user yang login.
  // if (user.role_id !== 1 && user.clinic_id !== ...) { ... }

  return { authorized: true, user };
}
// --- Akhir Fungsi Bantuan ---

// --- Handler GET (Mengambil daftar jadwal) ---
export async function GET(request) {
  try {
    // --- 1. Parsing URL dan Query Parameters ---
    const { searchParams } = new URL(request.url);
    const businessAreaId = searchParams.get("business_area_id");
    const productId = searchParams.get("product_id"); // ID dari tabel `product` (dikirim sebagai service_id dari FE)
    const dateStr = searchParams.get("date"); // Format: YYYY-MM-DD
    const timezone = searchParams.get("timezone");

    const { startBoundaryUTC, endBoundaryUTC } = getUTCDayBoundaries(
      dateStr,
      timezone
    );

    // --- 2. Validasi Parameter Wajib ---
    if (!businessAreaId || !productId || !dateStr) {
      return NextResponse.json(
        {
          error: "Parameter clinic_id, product_id, dan date wajib disertakan.",
        },
        { status: 400 } // Bad Request
      );
    }

    const parsedBusinessAreaId = parseInt(businessAreaId);
    const productIdForSchedule = parseInt(productId); // <-- Langsung gunakan service_id sebagai product_id

    if (isNaN(parsedBusinessAreaId) || isNaN(productIdForSchedule)) {
      return NextResponse.json(
        { error: "Parameter clinic_id dan service_id harus berupa angka." },
        { status: 400 } // Bad Request
      );
    }

    // --- 3. Validasi Format Tanggal (Sederhana) ---
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return NextResponse.json(
        { error: "Format tanggal tidak valid. Gunakan format YYYY-MM-DD." },
        { status: 400 } // Bad Request
      );
    }

    // --- 4. Autentikasi & Otorisasi ---
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Sesi tidak ditemukan." },
    //     { status: 401 }
    //   ); // Unauthorized
    // }

    // const { authorized, user } = await checkAuthorization(sessionToken);

    // if (!authorized) {
    //   return NextResponse.json(
    //     { error: "Forbidden: Akses ditolak." },
    //     { status: 403 }
    //   ); // Forbidden
    // }

    // --- 5. (Opsional) Validasi tambahan: Pastikan product_id valid untuk clinic_id ---
    // Komentar bagian ini jika Anda ingin mengizinkan pencarian jadwal untuk produk yang mungkin tidak aktif di klinik tersebut
    // const serviceExists = await prisma.service.findUnique({
    //   where: {
    //     clinic_id_product_id: {
    //       clinic_id: parsedBusinessAreaId,
    //       product_id: productIdForSchedule,
    //     },
    //   },
    // });

    // if (!serviceExists) {
    //   return NextResponse.json(
    //     {
    //       error: `Layanan dengan product_id ${productIdForSchedule} tidak ditemukan untuk klinik dengan id ${parsedBusinessAreaId}.`,
    //     },
    //     { status: 400 } // Bad Request karena input tidak valid
    //   );
    // }
    // --- Akhir Validasi tambahan (Dikomentari) ---

    // --- 6. Persiapan Filter Tanggal (BERDASARKAN ZONA WAKTU LOKAL SERVER) ---

    // --- 7. Query Database untuk Mendapatkan Jadwal ---
    const schedules = await prisma.schedule.findMany({
      where: {
        business_area_id: parsedBusinessAreaId,
        product_id: productIdForSchedule,
        start_time: {
          // Asumsikan start_time disimpan dalam zona waktu lokal server
          gte: startBoundaryUTC, // Lebih besar atau sama dengan awal hari lokal
          lt: endBoundaryUTC, // Kurang dari awal hari berikutnya lokal
        },
      },
      select: {
        id: true,
        business_area_id: true,
        product_id: true,
        product_business_area_id: true,
        start_time: true,
        end_time: true,
        max_quota: true,
        remaining_quota: true,
        service_id: true,
        created_at: true,
        updated_at: true,
        product: {
          select: {
            id: true,
            business_area_id: true,
            name: true,
            productVariants: {
              select: {
                id: true,
                product_id: true,
                product_business_area_id: true,
                name: true,
                price: true,
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: {
        start_time: "asc",
      },
    });

    // --- 8. Respons Berhasil ---
    return NextResponse.json(schedules, { status: 200 }); // OK
  } catch (error) {
    console.error("Error fetching schedules (GET):", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mengambil jadwal." },
      { status: 500 }
    ); // Internal Server Error
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler GET ---

// --- Handler POST (Menambah jadwal) ---
export async function POST(request) {
  let createdSchedules = [];
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
    const { business_area_id, product_id, target_date } = body;

    const foundService = await prisma.service.findFirst({
      where: {
        is_default: true,
        productService: {
          some: {
            // Kondisi untuk field 'productId' dan 'businessAreaId'
            // yang merupakan bagian dari Primary Key komposit 'product'
            product_id: parseInt(product_id),
            product_business_area_id: parseInt(business_area_id),
          },
        },
      },
      select: {
        // Tentukan field service mana yang ingin Anda ambil
        id: true,
        // Anda juga bisa menyertakan field lain dari model service
      },
      orderBy: {
        id: "asc",
      },
    });

    const scheduleTemplates = await prisma.schedule_template.findMany({
      where: {
        business_area_id: parseInt(business_area_id),
        product_id: parseInt(product_id),
      },
      select: {
        id: true,
        product_id: true,
        business_area_id: true,
        start_time_str: true,
        end_time_str: true,
        max_quota: true,
        is_end_time_next_day: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    const scheduleToCreate = scheduleTemplates.map((sched) => {
      const startTimeISO = new Date(
        `${target_date}T${sched.start_time_str}:00+07:00`
      );
      const endTimeISO = new Date(
        `${target_date}T${sched.end_time_str}:00+07:00`
      );
      if (sched.is_end_time_next_day) {
        endTimeISO.setDate(endTimeISO.getDate() + 1);
      }
      return {
        business_area_id: parseInt(sched.business_area_id),
        product_id: parseInt(sched.product_id),
        product_business_area_id: parseInt(sched.business_area_id),
        service_id: foundService.id,
        start_time: startTimeISO,
        end_time: endTimeISO,
        max_quota: parseInt(sched.max_quota),
        remaining_quota: parseInt(sched.max_quota),
      };
    });

    // --- 4. Gunakan transaction untuk membuat jadwal ---
    // --- PERBAIKAN: Definisikan objek data dan select secara terpisah ---

    // const selectClause = {
    //   // <-- Definisikan objek 'select' secara terpisah dan jelas
    //   id: true,
    //   product_id: true,
    //   start_time: true,
    //   end_time: true,
    //   max_quota: true,
    //   remaining_quota: true,
    //   created_at: true,
    //   updated_at: true,
    // };

    const createdSchedules = await prisma.schedule.createMany({
      data: scheduleToCreate,
    });
    // --- AKHIR PERUBAHAN ---

    // --- 5. Respons Berhasil ---
    return NextResponse.json({ status: 201 }); // Created
  } catch (error) {
    console.error("Error creating schedules (POST):", error);

    // --- 6. Tangani error khusus Prisma ---
    // Gunakan property `code` karena `instanceof` tidak bekerja
    if (typeof error.code === "string") {
      // a. Unique constraint violation (P2002)
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            error:
              "Jadwal duplikat ditemukan. Pastikan tidak ada jadwal dengan kombinasi klinik, produk, dan waktu mulai yang sama.",
            // details: error.message // Opsional untuk debugging internal
          },
          { status: 409 } // 409 Conflict
        );
      }
      // b. Constraint validation lainnya (P2002 bisa untuk berbagai constraint)
      // Tangani error Prisma lainnya berdasarkan `code` jika diperlukan
    } else {
      console.warn(
        "Caught error does not have a standard Prisma `code` property:",
        Object.keys(error)
      );
    }

    // --- 7. Error umum server ---
    console.error("Unexpected error in POST /api/schedules:");
    console.error("Error name:", error?.name);
    console.error("Error constructor name:", error?.constructor?.name);
    console.error("Full error object keys:", Object.keys(error));
    if (error?.stack) {
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error:
          "Internal Server Error: Terjadi kesalahan tidak terduga saat membuat jadwal.",
        // details: error.message // Opsional untuk debugging internal
      },
      { status: 500 } // Internal Server Error
    );
  } finally {
    await prisma.$disconnect();
  }
}
// export async function POST(request) {
//   let createdSchedules = [];
//   try {
//     // --- 1. Autentikasi & Otorisasi ---
//     // const sessionToken = (await cookies()).get("sessionToken")?.value;

//     // if (!sessionToken) {
//     //   return NextResponse.json(
//     //     { error: "Unauthorized: Sesi tidak ditemukan." },
//     //     { status: 401 }
//     //   );
//     // }

//     // const { authorized, user } = await checkAuthorization(sessionToken);

//     // if (!authorized) {
//     //   return NextResponse.json(
//     //     { error: "Forbidden: Akses ditolak." },
//     //     { status: 403 }
//     //   );
//     // }

//     // --- 2. Parsing Body Request ---
//     const body = await request.json();
//     const schedulesToCreate = Array.isArray(body.schedules)
//       ? body.schedules
//       : [body.schedules];
//     const { business_area_id, product_id } = body;

//     if (!schedulesToCreate || schedulesToCreate.length === 0) {
//       return NextResponse.json(
//         {
//           error: "Data jadwal wajib disertakan dalam format array atau objek.",
//         },
//         { status: 400 }
//       );
//     }

//     // --- 3. Validasi Setiap Jadwal dalam Array ---
//     for (const [index, sched] of schedulesToCreate.entries()) {
//       // a. Validasi field wajib ada
//       if (
//         sched.business_area_id == null ||
//         sched.product_id == null ||
//         !sched.start_time ||
//         !sched.end_time ||
//         sched.max_quota == null
//       ) {
//         return NextResponse.json(
//           {
//             error: `Jadwal pada indeks ${index} harus memiliki clinic_id, product_id, start_time, end_time, dan max_quota.`,
//           },
//           { status: 400 }
//         );
//       }

//       // b. Validasi tipe data angka
//       const businessAreaId = parseInt(sched.business_area_id);
//       const productId = parseInt(sched.product_id);
//       const maxQuota = parseInt(sched.max_quota);

//       if (isNaN(businessAreaId) || isNaN(productId) || isNaN(maxQuota)) {
//         return NextResponse.json(
//           {
//             error: `clinic_id, product_id, dan max_quota pada jadwal indeks ${index} harus berupa angka.`,
//           },
//           { status: 400 }
//         );
//       }

//       // c. Validasi format datetime
//       const startTime = new Date(sched.start_time);
//       const endTime = new Date(sched.end_time);

//       if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
//         return NextResponse.json(
//           {
//             error: `Format waktu tidak valid.).`,
//           },
//           { status: 400 }
//         );
//       }

//       // d. Validasi logika waktu
//       if (startTime >= endTime) {
//         return NextResponse.json(
//           {
//             error: `Waktu mulai harus sebelum waktu selesai untuk jadwal pada indeks ${index}.`,
//           },
//           { status: 400 }
//         );
//       }

//       // e. (Opsional) Validasi tambahan: Pastikan clinic_id dan product_id valid
//       // const clinicExists = await prisma.clinic.findUnique({
//       //   where: { id: businessAreaId },
//       // });
//       // if (!clinicExists) {
//       //   return NextResponse.json(
//       //     { error: `Klinik dengan id ${businessAreaId} tidak ditemukan.` },
//       //     { status: 400 }
//       //   );
//       // }
//       // const productExists = await prisma.product.findUnique({
//       //   where: { id: productId },
//       // });
//       // if (!productExists) {
//       //   return NextResponse.json(
//       //     { error: `Produk dengan id ${productId} tidak ditemukan.` },
//       //     { status: 400 }
//       //   );
//       // }
//     }

//     const foundService = await prisma.service.findFirst({
//       where: {
//         // Filter berdasarkan tabel relasi 'ServiceProduct'
//         productService: {
//           some: {
//             // Kondisi untuk field 'productId' dan 'businessAreaId'
//             // yang merupakan bagian dari Primary Key komposit 'product'
//             product_id: parseInt(product_id),
//             product_business_area_id: parseInt(business_area_id),
//           },
//         },
//       },
//       select: {
//         // Tentukan field service mana yang ingin Anda ambil
//         id: true,
//         name: true,
//         // Anda juga bisa menyertakan field lain dari model service
//       },
//       orderBy: {
//         id: "asc",
//       },
//     });

//     // --- 4. Gunakan transaction untuk membuat jadwal ---
//     // --- PERBAIKAN: Definisikan objek data dan select secara terpisah ---
//     const createDataArray = schedulesToCreate.map((sched) => ({
//       data: {
//         // <-- Hanya objek 'data'
//         business_area_id: parseInt(sched.business_area_id),
//         product_id: parseInt(sched.product_id),
//         product_business_area_id: parseInt(sched.business_area_id),
//         service_id: foundService.id,
//         start_time: new Date(sched.start_time), // Simpan dalam zona waktu lokal server
//         end_time: new Date(sched.end_time), // Simpan dalam zona waktu lokal server
//         max_quota: parseInt(sched.max_quota),
//         remaining_quota: parseInt(sched.max_quota), // Set remaining_quota = max_quota saat dibuat
//       },
//     }));

//     const selectClause = {
//       // <-- Definisikan objek 'select' secara terpisah dan jelas
//       id: true,
//       product_id: true,
//       start_time: true,
//       end_time: true,
//       max_quota: true,
//       remaining_quota: true,
//       created_at: true,
//       updated_at: true,
//     };

//     createdSchedules = await prisma.$transaction(
//       createDataArray.map((dataObj) =>
//         prisma.schedule.create({
//           ...dataObj, // <-- Spread objek 'data'
//           select: selectClause, // <-- Gunakan objek 'select' yang terpisah
//         })
//       )
//     );
//     // --- AKHIR PERUBAHAN ---

//     // --- 5. Respons Berhasil ---
//     return NextResponse.json(createdSchedules, { status: 201 }); // Created
//   } catch (error) {
//     console.error("Error creating schedules (POST):", error);

//     // --- 6. Tangani error khusus Prisma ---
//     // Gunakan property `code` karena `instanceof` tidak bekerja
//     if (typeof error.code === "string") {
//       // a. Unique constraint violation (P2002)
//       if (error.code === "P2002") {
//         return NextResponse.json(
//           {
//             error:
//               "Jadwal duplikat ditemukan. Pastikan tidak ada jadwal dengan kombinasi klinik, produk, dan waktu mulai yang sama.",
//             // details: error.message // Opsional untuk debugging internal
//           },
//           { status: 409 } // 409 Conflict
//         );
//       }
//       // b. Constraint validation lainnya (P2002 bisa untuk berbagai constraint)
//       // Tangani error Prisma lainnya berdasarkan `code` jika diperlukan
//     } else {
//       console.warn(
//         "Caught error does not have a standard Prisma `code` property:",
//         Object.keys(error)
//       );
//     }

//     // --- 7. Error umum server ---
//     console.error("Unexpected error in POST /api/schedules:");
//     console.error("Error name:", error?.name);
//     console.error("Error constructor name:", error?.constructor?.name);
//     console.error("Full error object keys:", Object.keys(error));
//     if (error?.stack) {
//       console.error("Error stack:", error.stack);
//     }

//     return NextResponse.json(
//       {
//         error:
//           "Internal Server Error: Terjadi kesalahan tidak terduga saat membuat jadwal.",
//         // details: error.message // Opsional untuk debugging internal
//       },
//       { status: 500 } // Internal Server Error
//     );
//   } finally {
//     await prisma.$disconnect();
//   }
// }
// --- Akhir Handler POST ---
