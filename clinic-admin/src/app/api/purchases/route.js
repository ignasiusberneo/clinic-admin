// app/api/orders/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Handler POST (Membuat Order Baru) ---
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
      product_business_area_id,
      product_id,
      po_number,
      quantity,
      total_amount,
    } = body;

    // --- 4. Ambil Detail Jadwal dan Harga Layanan dalam Transaction ---
    // Ini untuk mencegah race condition dan memastikan data konsisten saat update quota
    const transactionResult = await prisma.$transaction(async (tx) => {
      const productRecord = await tx.product.findUnique({
        where: {
          id_business_area_id: {
            id: parseInt(product_id),
            business_area_id: parseInt(product_business_area_id),
          },
        },
        select: {
          id: true,
          business_area_id: true,
          type: true,
          unit_conversion: true,
        },
      });

      // d. Kurangi remaining_quota jadwal
      await tx.purchase.create({
        data: {
          product_id: parseInt(product_id),
          product_business_area_id: parseInt(product_business_area_id),
          po_number: po_number,
          quantity: parseInt(quantity),
          total_amount: parseInt(total_amount),
        },
        select: {
          id: true,
        },
      });

      const parsedQuantity = parseInt(quantity);
      // f. Buat record order
      const updatedStock = await tx.stock.update({
        where: {
          product_id_product_business_area_id: {
            product_id: parseInt(product_id),
            product_business_area_id: parseInt(product_business_area_id),
          },
        },
        data: {
          quantity: {
            increment: parsedQuantity * productRecord.unit_conversion,
          },
        },
        select: {
          id: true,
        },
      });

      return updatedStock;
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
