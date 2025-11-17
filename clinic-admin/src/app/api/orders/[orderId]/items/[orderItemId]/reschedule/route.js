import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request, { params }) {
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
    const { orderId, orderItemId } = await params;

    const { selected_schedule_id } = body;

    // --- 4. Ambil Detail Jadwal dan Harga Layanan dalam Transaction ---
    // Ini untuk mencegah race condition dan memastikan data konsisten saat update quota
    const transactionResult = await prisma.$transaction(async (tx) => {
      const orderItem = await tx.order_item.findUnique({
        where: {
          id: parseInt(orderItemId),
        },
        select: {
          id: true,
          order_id: true,
          schedule_id: true,
          service_id: true,
          quantity: true,
        },
      });

      const schedule = await tx.schedule.findUnique({
        where: {
          id: parseInt(selected_schedule_id),
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

      // b. Validasi quota
      if (orderItem.quantity > schedule.remaining_quota) {
        // throw new Error(
        //   `Quantity yang dipesan (${parsedQuantity}) melebihi kuota tersisa saat transaksi berjalan. Silakan coba lagi.`
        // );
        throw new Error(
          `Slot sudah dipesan orang lain saat transaksi berjalan. Silakan coba lagi.`
        );
      }

      // d. Kurangi remaining_quota jadwal
      await tx.schedule.update({
        where: { id: orderItem.schedule_id },
        data: {
          remaining_quota: { increment: orderItem.quantity },
        },
        select: {
          id: true,
          remaining_quota: true,
        },
      });

      await tx.schedule.update({
        where: { id: parseInt(selected_schedule_id) },
        data: {
          remaining_quota: { decrement: orderItem.quantity },
        },
        select: {
          id: true,
          remaining_quota: true,
        },
      });

      // f. Buat record order
      const updatedOrderItem = await tx.order_item.update({
        where: {
          id: parseInt(orderItemId),
        },
        data: {
          schedule_id: parseInt(selected_schedule_id),
        },
        select: {
          id: true,
        },
      });

      return updatedOrderItem;
    });

    return NextResponse.json(transactionResult, { status: 201 }); // Created
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
    if (error.message && error.message.includes("Slot sudah")) {
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
