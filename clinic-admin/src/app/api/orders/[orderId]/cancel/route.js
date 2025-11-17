// app/api/orders/[id]/cancel/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// --- Fungsi Bantuan untuk Otorisasi (Dibiarkan tidak berubah) ---
// ... (checkAuthorization function)
async function checkAuthorization(sessionToken, requestedOrderId) {
  const user = await validateAndUpdateSession(sessionToken);

  if (!user) {
    return { authorized: false, user: null };
  } // Otorisasi disederhanakan untuk contoh ini, namun perlu dipertimbangkan
  return { authorized: true, user };
}
// --- Akhir Fungsi Bantuan ---

// --- Handler PATCH (Cancel Order & Update Remaining Quota & Update Stock) ---
export async function PATCH(request, { params }) {
  try {
    // Ambil ID order dari params
    const { orderId } = await params;
    const id = orderId; // --- Autentikasi & Otorisasi ---

    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Sesi tidak ditemukan." },
    //     { status: 401 }
    //   );
    // }

    // Jika otorisasi diaktifkan:
    // if (!authorized) {
    // Di sini kita hanya melakukan validasi status awal, detail lengkap akan diambil dalam transaksi.
    const orderInitialCheck = await prisma.order.findUnique({
      where: { id },
      select: {
        status: true,
      },
    });

    if (!orderInitialCheck) {
      return NextResponse.json(
        { error: "Order tidak ditemukan." },
        { status: 404 }
      );
    } // Validasi status order sebelum cancel

    if (orderInitialCheck.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Order sudah dibatalkan.` },
        { status: 400 }
      );
    } // --- Gunakan transaction untuk memastikan konsistensi data ---

    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil ulang order dengan detail order_items dan product di dalam transaksi
      const orderInTx = await tx.order.findUnique({
        where: { id },
        select: {
          status: true,
          order_items: {
            select: {
              schedule_id: true,
              quantity: true,
              product_id: true,
              unit_used: true,
              product_business_area_id: true,
              product: {
                select: {
                  id: true,
                  business_area_id: true,
                  type: true, // Untuk cek ProductType
                  unit_conversion: true, // Untuk hitung kuantitas stok
                },
              },
            },
          },
        },
      });

      if (!orderInTx) {
        throw new Error("Order tidak ditemukan saat transaksi berjalan.");
      }

      if (orderInTx.status === "CANCELLED") {
        throw new Error("Order sudah dibatalkan saat transaksi berjalan.");
      } // 2. Update status order menjadi 'CANCELLED'

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          attendance_status: "NO_SHOW", // Asumsi NO_SHOW jika dibatalkan
        },
        select: {
          id: true,
          total_price: true,
          dp: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      }); // 3. Proses pengembalian kuota schedule DAN stok (untuk item GOODS)

      const updatePromises = orderInTx.order_items.map((item) => {
        const updates = []; // A. Kembalikan kuota schedule (hanya jika ada schedule_id)

        if (item.schedule_id) {
          updates.push(
            tx.schedule.update({
              where: { id: item.schedule_id },
              data: {
                remaining_quota: {
                  increment: item.quantity, // Tambahkan kembali quantity ke remaining_quota
                },
              }, // select: { id: true, remaining_quota: true }, // Opsional: untuk melihat hasil
            })
          );
        } // B. Kembalikan stok (hanya jika ProductType adalah 'GOOD')

        if (item.product.type === "GOOD") {
          // Perhitungan Stok: Kuantitas di order_item (Big Unit) * Unit Conversion = Small Unit Quantity
          // Jika unit_conversion null/0/1, anggap 1.
          const conversion = item.product.unit_conversion;
          const stockToReturn =
            item.unit_used === "LARGE"
              ? item.quantity * conversion
              : item.quantity;

          updates.push(
            tx.stock.update({
              where: {
                product_id_product_business_area_id: {
                  product_id: item.product_id,
                  product_business_area_id: item.product_business_area_id,
                },
              },
              data: {
                quantity: {
                  increment: stockToReturn, // Tambahkan kembali ke stok
                },
              }, // select: { id: true, quantity: true }, // Opsional: untuk melihat hasil
            })
          );
        }

        return updates; // Mengembalikan array of promises untuk item ini
      }); // Jalankan semua update secara paralel

      await Promise.all(updatePromises.flat()); // flat() untuk meratakan array of arrays

      return updatedOrder;
    }); // --- Respons Berhasil ---

    return NextResponse.json(result, { status: 200 }); // OK
  } catch (error) {
    console.error("Error cancelling order (PATCH):", error); // Tangani error dari dalam transaction

    if (
      error.message &&
      (error.message.includes("sudah dibatalkan") ||
        error.message.includes("tidak ditemukan saat transaksi"))
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 } // Bad Request
      );
    } // Tangani error khusus Prisma

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Contoh: Jika order tidak ditemukan saat update (P2025)
      if (error.code === "P2025") {
        return NextResponse.json(
          {
            error:
              "Order/Stock/Schedule tidak ditemukan atau sudah dibatalkan.",
          },
          { status: 404 } // Not Found
        );
      }
    } // Error umum server

    return NextResponse.json(
      { error: "Terjadi kesalahan server saat membatalkan order." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler PATCH ---
