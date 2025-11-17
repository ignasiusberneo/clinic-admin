// app/api/services/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessAreaId = searchParams.get("business_area_id");
    const productId = searchParams.get("product_id");

    if (!businessAreaId) {
      return NextResponse.json(
        { error: "Query parameter business_area_id wajib disertakan" },
        { status: 400 }
      );
    }

    const numericBusinessAreaId = parseInt(businessAreaId);

    const whereSomeClause = {
      business_area_id: numericBusinessAreaId,
    };

    if (productId) {
      whereSomeClause.id = parseInt(productId);
    }

    // Ambil daftar service
    const services = await prisma.service.findMany({
      where: {
        is_active: true,
        productService: {
          some: {
            product: whereSomeClause,
          },
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        created_at: true,
        updated_at: true,
        is_default: true,
        // Include relasi ke ServiceProduct dan Product terkait
        productService: {
          // Nama relasi yang benar
          select: {
            product: {
              select: {
                id: true,
                name: true,
                tariff: true,
                business_area_id: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    // Format ulang data agar lebih mudah dikonsumsi di frontend
    const formattedServices = services.map((service) => ({
      ...service,
      // Ambil data produk dari relasi productService
      products: service.productService.map((pj) => pj.product),
      productService: undefined, // Hapus kolom mentah
    }));

    return NextResponse.json(formattedServices, { status: 200 });
  } catch (error) {
    console.error("Error fetching services:", error);
    // Jika error disebabkan oleh kesalahan relasi, ini akan menangkapnya
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memuat layanan." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Handler untuk POST (Tambah Service) - Memproses multiple product
export async function POST(request) {
  try {
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const body = await request.json();
    const { name, price, business_area_id, products } = body;

    // 1. Validasi Input
    if (
      !name ||
      price === undefined ||
      price === null ||
      !business_area_id ||
      !products ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "name, price, business_area_id, dan minimal satu productIds wajib diisi.",
        },
        { status: 400 }
      );
    }

    const numericBusinessAreaId = parseInt(business_area_id);
    const numericPrice = parseInt(price);

    const productIds = products.map((p) => p.id);

    // 2. Cek apakah semua Product ID valid dan milik business_area_id yang ditentukan
    // Kita membutuhkan business_area_id dari produk karena kunci komposit ada di sana.
    const productsToConnect = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        business_area_id: numericBusinessAreaId,
      },
      select: {
        id: true,
        business_area_id: true,
      },
    });

    if (productsToConnect.length !== products.length) {
      return NextResponse.json(
        {
          error:
            "Satu atau lebih produk tidak valid atau tidak dimiliki klinik ini.",
        },
        { status: 400 }
      );
    }

    // 3. (Opsional) Cek Duplikasi Nama Layanan jika diperlukan.
    // ...

    // 4. Buat Service dan ServiceProduct dalam satu Transaksi
    const newService = await prisma.$transaction(async (tx) => {
      // A. Buat service baru
      const service = await tx.service.create({
        data: {
          name: name,
          price: numericPrice,
        },
        select: {
          id: true,
        },
      });

      // B. Siapkan data untuk tabel ServiceProduct
      const serviceProductData = products.map((p) => ({
        service_id: service.id,
        product_id: p.id,
        // Nilai ini harus sama dengan business_area_id dari produk
        product_business_area_id: p.business_area_id,
        quantity: p.quantity,
        unit_type: p.unit_type,
      }));

      // C. Buat entri massal di ServiceProduct
      await tx.serviceProduct.createMany({
        data: serviceProductData,
        skipDuplicates: true,
      });

      return service;
    });

    // 5. Ambil data Service yang baru dibuat (termasuk relasinya) untuk respons
    const createdServiceWithDetails = await prisma.service.findUnique({
      where: { id: newService.id },
      select: {
        id: true,
        name: true,
        price: true,
        productService: {
          // Nama relasi yang benar
          select: {
            product: {
              select: { name: true, tariff: true },
            },
          },
        },
      },
    });

    return NextResponse.json(createdServiceWithDetails, { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat membuat layanan." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
