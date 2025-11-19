import { NextResponse } from "next/server";
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
    const { business_area_id, products } = body;

    const parsedBusinessAreaId = parseInt(business_area_id);

    // --- 4. Ambil Detail Jadwal dan Harga Layanan dalam Transaction ---
    // Ini untuk mencegah race condition dan memastikan data konsisten saat update quota
    const transactionResult = await prisma.$transaction(async (tx) => {
      // e. Hitung total harga
      const totalPrice = products.reduce((accumulator, item) => {
        // Asumsi: item.price sudah membawa harga satuan yang benar
        // (sudah disesuaikan dengan orderUnitType di sisi frontend/middleware).
        const unitPrice = item.price;

        // Subtotal = Harga Satuan * Kuantitas
        const subtotal = unitPrice * item.orderQuantity;

        // Tambahkan subtotal ke total berjalan
        return accumulator + subtotal;
      }, 0);
      const dp = 0;

      const generatedId = generateUniqueOrderNumber();

      // f. Buat record order
      const newOrder = await tx.order.create({
        data: {
          id: generatedId,
          business_area_id: parsedBusinessAreaId,
          total_price: totalPrice,
          dp: dp,
          status: "BELUM_LUNAS", // Status awal
        },
        select: {
          id: true,
        },
      });

      const orderItemsData = products.map((item) => ({
        order_id: newOrder.id,
        product_id: item.productId,
        product_business_area_id: item.businessAreaId,
        schedule_id: null,
        quantity: item.orderQuantity,
        unit_used: item.orderUnitType,
        price: item.price,
      }));

      await tx.order_item.createMany({
        data: orderItemsData,
      });

      for (const item of products) {
        const parsedProductId = parseInt(item.productId);
        const parsedBusinessAreaId = parseInt(item.businessAreaId);
        const quantityToReduce =
          item.orderUnitType === "LARGE"
            ? item.orderQuantity * item.unitConversion
            : item.orderQuantity;

        // 3. Lakukan Pembaruan Stok
        await tx.stock.update({
          where: {
            // Group the two unique fields under the composite key name
            product_id_product_business_area_id: {
              product_id: parsedProductId,
              product_business_area_id: parsedBusinessAreaId,
            },
          },
          data: {
            // Menggunakan operasi penambahan/pengurangan atomik dari Prisma
            // yang lebih aman dari race condition daripada mengambil dan menyimpan kembali.
            quantity: {
              decrement: quantityToReduce,
            },
          },
        });
      } // Akhir iterasi pengurangan stok

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
