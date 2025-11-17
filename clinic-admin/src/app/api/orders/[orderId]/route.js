// app/api/orders/[id]/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Fungsi Bantuan untuk Otorisasi ---
async function checkAuthorization(sessionToken, requestedOrderId) {
  const user = await validateAndUpdateSession(sessionToken);

  if (!user) {
    return { authorized: false, user: null };
  }

  // Contoh logika otorisasi sederhana:
  // - Superadmin (role_id = 1) bisa mengakses semua.
  // - User biasa hanya bisa mengakses order dari kliniknya sendiri (jika ada clinic_id).
  // Untuk sekarang, kita izinkan semua user yang login.
  // if (user.role_id !== 1) {
  //   const order = await prisma.order.findUnique({
  //     where: { id: requestedOrderId },
  //     select: { clinic_id: true }
  //   });
  //   if (order && user.clinic_id !== order.clinic_id) {
  //     return { authorized: false, user };
  //   }
  // }

  return { authorized: true, user };
}
// --- Akhir Fungsi Bantuan ---

// --- Handler GET (Mengambil detail order) ---
export async function GET(request, { params }) {
  try {
    // Ambil ID order dari params
    const { orderId } = await params;
    const id = orderId;

    // --- Autentikasi & Otorisasi ---
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Sesi tidak ditemukan." },
    //     { status: 401 }
    //   );
    // }

    // const { authorized, user } = await checkAuthorization(sessionToken, id);

    // if (!authorized) {
    //   return NextResponse.json(
    //     { error: "Forbidden: Akses ditolak." },
    //     { status: 403 }
    //   );
    // }

    // --- Query Database untuk Mendapatkan Detail Order ---
    const order = await prisma.order.findUnique({
      where: {
        id: orderId, // ID order sekarang adalah string (cuid)
      },
      select: {
        id: true,
        business_area_id: true,
        total_price: true,
        dp: true, // Sertakan DP untuk referensi
        status: true,
        attendance_status: true,
        created_at: true,
        updated_at: true,
        business_area: {
          select: {
            name: true,
          },
        },
        // Ambil item-item order dan data jadwal terkait
        order_items: {
          select: {
            id: true,
            schedule_id: true,
            quantity: true,
            price: true,
            is_assigned: true,
            created_at: true,
            updated_at: true,
            product_id: true,
            product_business_area_id: true,
            product: {
              select: {
                name: true,
                type: true,
                big_unit_name: true,
                small_unit_name: true,
              },
            },
            schedule: {
              select: {
                start_time: true,
                end_time: true,
                max_quota: true,
                remaining_quota: true,
              },
            },
          },
        },
        order_payment: {
          select: {
            id: true,
            payment_method_id: true,
            amount: true,
            created_at: true,
            updated_at: true,
            payment_method: {
              select: {
                name: true, // Ambil nama metode pembayaran
              },
            },
          },
          orderBy: {
            created_at: "asc", // Urutkan pembayaran berdasarkan waktu pembuatan
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan." },
        { status: 404 }
      );
    }

    // --- Hitung Total Pembayaran ---
    const totalPaid = order.order_payment.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    // --- Hitung Sisa Pembayaran ---
    const remainingBalance = order.total_price - totalPaid;

    // --- Respons Berhasil ---
    // Gabungkan data order dengan informasi tambahan (totalPaid, remainingBalance)
    const orderWithPaymentInfo = {
      ...order,
      total_paid: totalPaid, // <-- Tambahkan field total_pembayaran
      remaining_balance: remainingBalance, // <-- Tambahkan field sisa_pembayaran
    };

    return NextResponse.json(orderWithPaymentInfo, { status: 200 });
  } catch (error) {
    console.error("Error fetching order details (GET):", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mengambil detail order." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler GET ---
