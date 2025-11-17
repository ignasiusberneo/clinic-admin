// app/api/orders/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { Prisma, PrismaClient } from "@prisma/client";

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

function generateUniqueOrderNumber() {
  // 1. Ambil Timestamp (dalam milidetik)
  // Ini memberikan bagian yang berurutan secara kasar dan sangat unik.
  const timestamp = Date.now();

  // 2. Hasilkan 5 Digit Angka Acak
  // Angka acak antara 10000 (inklusif) dan 99999 (inklusif).
  // Ini memastikan selalu 5 digit.
  const minRandom = 10000;
  const maxRandom = 99999;
  const randomFiveDigits =
    Math.floor(Math.random() * (maxRandom - minRandom + 1)) + minRandom;

  // 3. Gabungkan menjadi format akhir
  const orderNumber = `ORD-${timestamp}-${randomFiveDigits}`;

  return orderNumber;
}
// --- Akhir Fungsi Bantuan ---

// --- Handler POST (Membuat Order Baru) ---
export async function POST(request) {
  let createdOrder = null;

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
    const { business_area_id, service_id, schedule_id, quantity } = body;

    // --- 3. Validasi Input ---
    if (!business_area_id || !service_id || !schedule_id || quantity == null) {
      return NextResponse.json(
        {
          error:
            "clinic_id, service_id, schedule_id, dan quantity wajib disertakan.",
        },
        { status: 400 } // Bad Request
      );
    }

    const parsedBusinessAreaId = parseInt(business_area_id);
    const parsedServiceId = parseInt(service_id);
    const parsedScheduleId = parseInt(schedule_id);
    const parsedQuantity = parseInt(quantity);

    if (
      isNaN(parsedBusinessAreaId) ||
      isNaN(parsedServiceId) ||
      isNaN(parsedScheduleId) ||
      isNaN(parsedQuantity)
    ) {
      return NextResponse.json(
        {
          error:
            "clinic_id, service_id, schedule_id, dan quantity harus berupa angka.",
        },
        { status: 400 } // Bad Request
      );
    }

    if (parsedQuantity <= 0) {
      return NextResponse.json(
        { error: "Quantity harus lebih besar dari 0." },
        { status: 400 } // Bad Request
      );
    }

    // --- 4. Ambil Detail Jadwal dan Harga Layanan dalam Transaction ---
    // Ini untuk mencegah race condition dan memastikan data konsisten saat update quota
    const transactionResult = await prisma.$transaction(async (tx) => {
      // a. Ambil jadwal dan pastikan valid
      const schedule = await tx.schedule.findUnique({
        where: {
          id: parsedScheduleId,
        },
        select: {
          id: true,
          product_id: true,
          business_area_id: true,
          start_time: true,
          end_time: true,
          max_quota: true,
          remaining_quota: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!schedule) {
        throw new Error(
          "Jadwal tidak ditemukan atau tidak aktif untuk klinik dan layanan yang dipilih."
        );
      }

      // b. Validasi quota
      if (parsedQuantity > schedule.remaining_quota) {
        throw new Error(
          `Quantity yang dipesan (${parsedQuantity}) melebihi kuota tersisa saat transaksi berjalan. Silakan coba lagi.`
        );
      }

      // c. Ambil harga layanan berdasarkan clinic_id dan service_id (product_id)
      const serviceRecord = await tx.service.findUnique({
        where: {
          id: parsedServiceId,
        },
        select: {
          id: true,
          price: true, // <-- Ambil harga dari service
          productService: {
            // Nama relasi yang benar
            select: {
              quantity: true,
              unit_type: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  tariff: true,
                  unit_conversion: true,
                  business_area_id: true,
                },
              },
            },
          },
        },
      });

      if (!serviceRecord) {
        throw new Error(
          `Harga layanan untuk clinic_id ${parsedClinicId} dan product_id ${parsedServiceId} tidak ditemukan.`
        );
      }

      const itemPrice = serviceRecord.price; // Ambil harga dari service

      // d. Kurangi remaining_quota jadwal
      const updatedSchedule = await tx.schedule.update({
        where: { id: parsedScheduleId },
        data: {
          remaining_quota: { decrement: parsedQuantity },
        },
        select: {
          id: true,
          remaining_quota: true,
        },
      });

      // e. Hitung total harga
      const totalPrice = parsedQuantity * itemPrice;
      const dp = parsedQuantity * 10000;

      const generatedId = generateUniqueOrderNumber();

      // f. Buat record order
      const newOrder = await tx.order.create({
        data: {
          id: generatedId,
          business_area_id: parsedBusinessAreaId,
          total_price: totalPrice,
          dp: dp,
          status: "BELUM_BAYAR", // Status awal
        },
        select: {
          id: true,
        },
      });

      const orderItemsData = serviceRecord.productService.map((item) => ({
        order_id: newOrder.id,
        product_id: item.product.id,
        product_business_area_id: item.product.business_area_id,
        schedule_id: item.product.type === "SERVICE" ? parsedScheduleId : null,
        quantity: parsedQuantity * item.quantity,
        unit_used: item.unit_type,
        price:
          item.unit_type === "LARGE"
            ? item.product.tariff
            : item.product.small_unit_tariff,
        service_id: parsedServiceId,
        service_price: serviceRecord.price,
        service_quantity: parsedQuantity,
      }));

      await tx.order_item.createMany({
        data: orderItemsData,
      });

      return {
        order: newOrder,
      };
    });

    createdOrder = transactionResult.order;

    // --- 5. Respons Berhasil ---
    // Gabungkan data order dan order_item jika perlu dikirim ke frontend
    const responsePayload = {
      ...createdOrder,
    };

    return NextResponse.json(responsePayload, { status: 201 }); // Created
  } catch (error) {
    console.error("Error creating order (POST):", error);

    // --- 6. Tangani Error Prisma ---
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Misalnya, jika ada constraint unik di order_item
        return NextResponse.json(
          {
            error:
              "Terjadi konflik data saat membuat order. Silakan coba lagi.",
          },
          { status: 409 } // Conflict
        );
      }
    }

    // --- 7. Tangani Error Custom dari Transaction ---
    if (error.message && error.message.includes("melebihi kuota tersisa")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 } // Bad Request
      );
    }
    if (error.message && error.message.includes("tidak ditemukan")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 } // Bad Request, karena input tidak valid (schedule atau service)
      );
    }

    // --- 8. Error Umum Server ---
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat membuat order." },
      { status: 500 } // Internal Server Error
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request) {
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

    // --- 2. Parsing Query Params (Opsional: untuk pencarian/filter) ---
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id"); // Filter berdasarkan ID order
    const scheduleId = searchParams.get("schedule_id");

    let whereClause = {}; // Klausa where untuk query Prisma

    if (orderId) {
      // Jika Anda ingin pencarian berdasarkan ID order (hanya satu order)
      whereClause.id = orderId; // ID order sekarang adalah string (cuid)
    }

    if (scheduleId) {
      whereClause.order_items = {
        some: {
          schedule_id: parseInt(scheduleId),
        },
      };
    }

    // --- 3. Query Database untuk Mendapatkan Daftar Order ---
    // Kita hanya ambil field-field dasar dan kliniknya
    // Jika Anda ingin menyertakan order_items atau order_payments, tambahkan include/select
    const orders = await prisma.order.findMany({
      where: whereClause, // Gunakan filter jika ada
      select: {
        id: true, // ID order (cuid)
        business_area_id: true,
        total_price: true,
        dp: true,
        status: true,
        attendance_status: true,
        created_at: true,
        updated_at: true,
        business_area: {
          select: {
            name: true,
            address: true, // Sertakan field lain dari clinic jika diperlukan
          },
        },
        // Anda bisa menambahkan include ini jika ingin menampilkan jumlah item atau detail lain dari order
        // order_items: {
        //   select: {
        //     id: true,
        //     // ... field lain dari order_item jika diperlukan ...
        //   }
        // }
      },
      orderBy: {
        created_at: "desc", // Urutkan berdasarkan waktu pembuatan terbaru
      },
    });

    // --- 4. Respons Berhasil ---
    return NextResponse.json(orders, { status: 200 }); // OK
  } catch (error) {
    console.error("Error fetching orders (GET):", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mengambil daftar order." },
      { status: 500 } // Internal Server Error
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler POST ---
