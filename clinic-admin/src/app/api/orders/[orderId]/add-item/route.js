import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request, { params }) {
  try {
    // --- 1. Autentikasi & Otorisasi ---
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Sesi tidak ditemukan." },
    //     { status: 401 }
    //   );
    // }

    const { orderId } = await params;

    // --- 2. Parsing Body Request ---
    const body = await request.json();
    const { productId, businessAreaId, orderUnitType, orderQuantity } = body;

    const parsedBusinessAreaId = parseInt(businessAreaId);
    const parsedProductId = parseInt(productId);
    const parsedQuantity = parseInt(orderQuantity);

    const transactionResult = await prisma.$transaction(async (tx) => {
      const productRecord = await tx.product.findUnique({
        where: {
          id_business_area_id: {
            id: parsedProductId,
            business_area_id: parsedBusinessAreaId,
          },
        },
        select: {
          id: true,
          unit_conversion: true,
          tariff: true,
          small_unit_tariff: true,
        },
      });

      const orderRecord = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!productRecord) {
        throw new Error(`Produk tidak ditemukan.`);
      }

      const itemPrice =
        orderUnitType === "LARGE"
          ? productRecord.tariff
          : productRecord.small_unit_tariff;
      const decrementQuantity =
        orderUnitType === "LARGE"
          ? parsedQuantity * productRecord.unit_conversion
          : parsedQuantity;
      await tx.stock.update({
        where: {
          // Group the two unique fields under the composite key name provided by Prisma
          product_id_product_business_area_id: {
            product_id: parsedProductId,
            product_business_area_id: parsedBusinessAreaId,
          },
        },
        data: {
          quantity: {
            decrement: decrementQuantity,
          },
        },
      });

      await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          total_price: {
            increment: itemPrice * parsedQuantity,
          },
          status: "BELUM_LUNAS",
        },
      });

      const createdOrderItem = await tx.order_item.create({
        data: {
          order_id: orderId,
          product_id: parsedProductId,
          product_business_area_id: parsedBusinessAreaId,
          quantity: parsedQuantity,
          unit_used: orderUnitType,
          price: itemPrice,
        },
        select: {
          id: true,
        },
      });
      return createdOrderItem;
    });

    return NextResponse.json(transactionResult, { status: 201 }); // Created
  } catch (error) {
    console.error("Error creating order (POST):", error);

    // --- 8. Error Umum Server ---
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat membuat order." },
      { status: 500 } // Internal Server Error
    );
  } finally {
    await prisma.$disconnect();
  }
}
