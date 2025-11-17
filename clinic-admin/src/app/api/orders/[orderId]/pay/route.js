// app/api/orders/[id]/pay/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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

// --- Handler PATCH (Bayar Order) ---
// app/api/orders/[id]/pay/route.js
// ... (kode sebelumnya seperti checkAuthorization, dsb.)

export async function PATCH(request, { params }) {
  try {
    // Ambil ID order dari params
    const { orderId } = await params;
    const id = orderId;

    // Ambil body request
    const body = await request.json();
    const { payment_method_id, amount, type } = body; // Tambahkan 'type'

    // Validasi dasar
    if (!payment_method_id || amount == null) {
      return NextResponse.json(
        { error: "payment_method_id dan amount wajib diisi." },
        { status: 400 }
      );
    }

    const parsedOrderId = id; // ID order sekarang adalah string (cuid)
    const parsedPaymentMethodId = parseInt(payment_method_id);
    const parsedAmount = parseInt(amount);

    if (
      isNaN(parsedPaymentMethodId) ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "payment_method_id harus berupa angka, amount harus berupa angka positif.",
        },
        { status: 400 }
      );
    }

    // ... (autentikasi & otorisasi) ...

    // Ambil order sebelum update
    const orderBeforeUpdate = await prisma.order.findUnique({
      where: { id: parsedOrderId },
      select: {
        id: true,
        status: true,
        total_price: true,
        dp: true,
        // ... (field lain yang mungkin diperlukan) ...
      },
    });

    if (!orderBeforeUpdate) {
      return NextResponse.json(
        { error: "Order tidak ditemukan." },
        { status: 404 }
      );
    }

    // Hitung total pembayaran yang sudah ada (dari tabel order_payment)
    const existingPayments = await prisma.order_payment.aggregate({
      where: { order_id: parsedOrderId },
      _sum: { amount: true },
    });
    const totalPaidSoFar = existingPayments._sum.amount || 0;

    // Validasi jumlah pembayaran terhadap sisa
    const remainingBalance = orderBeforeUpdate.total_price - totalPaidSoFar;
    if (parsedAmount > remainingBalance) {
      return NextResponse.json(
        {
          error: `Jumlah pembayaran (${parsedAmount}) melebihi sisa pembayaran (${remainingBalance}).`,
        },
        { status: 400 }
      );
    }

    // --- Logika berdasarkan tipe pembayaran ---
    let newStatus = orderBeforeUpdate.status; // Default ke status lama
    if (type === "additional") {
      // Untuk pembayaran tambahan, cek apakah total yang dibayar *sekarang* sudah mencapai total_price
      if (totalPaidSoFar + parsedAmount >= orderBeforeUpdate.total_price) {
        newStatus = "SUDAH LUNAS";
      } else if (orderBeforeUpdate.status === "BELUM_BAYAR") {
        // Jika sebelumnya BELUM BAYAR dan ini adalah pembayaran pertama (bukan DP pasti), mungkin ubah ke BELUM LUNAS
        // Atau, jika ini adalah DP pertama, ubah ke BELUM LUNAS
        // Logika ini tergantung definisi DP Anda. Misalnya, jika amount === order.dp, maka ini DP.
        // Untuk sederhananya, kita asumsikan pembayaran pertama (berapa pun jumlahnya kecuali full) adalah BELUM LUNAS
        if (
          orderBeforeUpdate.status === "BELUM_BAYAR" &&
          totalPaidSoFar + parsedAmount > 0
        ) {
          newStatus = "BELUM_LUNAS";
        } else {
          // Jika sebelumnya BELUM LUNAS dan ini tambahan, tetap BELUM LUNAS kecuali sudah lunas
          if (totalPaidSoFar + parsedAmount >= orderBeforeUpdate.total_price) {
            newStatus = "SUDAH_LUNAS";
          }
          // Jika belum lunas, status tetap BELUM LUNAS
        }
      }
    } else {
      // Logika untuk pembayaran DP atau Full (jika tidak ada 'type' atau 'type' selain 'additional')
      // Contoh: Jika amount === dp, maka status jadi BELUM LUNAS
      // Jika amount === total_price, maka status jadi SUDAH LUNAS
      // Ini bisa Anda sesuaikan
      if (parsedAmount === orderBeforeUpdate.dp) {
        newStatus = "BELUM_LUNAS";
      } else if (parsedAmount >= orderBeforeUpdate.total_price) {
        newStatus = "SUDAH_LUNAS";
      } else if (orderBeforeUpdate.status === "BELUM BAYAR") {
        // Jika pembayaran awal bukan DP atau Full, tapi cukup untuk bayar sebagian
        newStatus = "BELUM_LUNAS";
      }
    }
    // --- Akhir Logika berdasarkan tipe pembayaran ---

    // Gunakan transaction untuk memastikan konsistensi data
    const result = await prisma.$transaction(async (tx) => {
      // Ambil ulang order di dalam transaction untuk mencegah race condition
      const orderInTx = await tx.order.findUnique({
        where: { id: parsedOrderId },
        select: { status: true, total_price: true, dp: true },
      });

      if (!orderInTx) {
        throw new Error("Order tidak ditemukan saat transaksi berjalan.");
      }

      if (
        orderInTx.status === "SUDAH_LUNAS" ||
        orderInTx.status === "CANCELLED"
      ) {
        throw new Error(
          `Order tidak bisa dibayar karena statusnya saat ini adalah "${orderInTx.status}".`
        );
      }

      // Perbarui status order
      const updatedOrder = await tx.order.update({
        where: { id: parsedOrderId },
        data: {
          status: newStatus,
        },
        select: {
          id: true,
          total_price: true,
          dp: true,
          status: true,
          created_at: true,
          updated_at: true,
          // Jika Anda ingin mengembalikan order_payments juga
          order_payment: {
            select: {
              id: true,
              payment_method_id: true,
              amount: true,
              created_at: true,
              updated_at: true,
              payment_method: {
                select: { name: true },
              },
            },
            orderBy: { created_at: "asc" },
          },
        },
      });

      // Buat record pembayaran baru
      await tx.order_payment.create({
        data: {
          order_id: parsedOrderId,
          payment_method_id: parsedPaymentMethodId,
          amount: parsedAmount,
        },
      });

      return updatedOrder;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error processing payment (PATCH):", error);
    if (error.message && error.message.includes("tidak bisa dibayar")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message && error.message.includes("melebihi sisa pembayaran")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Record tidak ditemukan saat update/delete
        return NextResponse.json(
          { error: "Order tidak ditemukan atau sudah dihapus." },
          { status: 404 }
        );
      }
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memproses pembayaran." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler PATCH ---
