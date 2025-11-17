// app/api/products/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fungsi bantuan untuk memeriksa apakah user adalah superadmin (role_id = 1)
async function checkSuperAdmin(sessionToken) {
  const user = await validateAndUpdateSession(sessionToken);

  if (!user) {
    return { authorized: false, user: null };
  }

  if (user.role_id !== 1) {
    return { authorized: false, user };
  }

  return { authorized: true, user };
}

export async function GET(request) {
  try {
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const businessAreaId = searchParams.get("business_area_id");
    const type = searchParams.get("type");
    const q = searchParams.get("q");
    const limitParam = searchParams.get("limit");
    const getStock = searchParams.get("get_stock");

    let whereClause = {
      is_active: true,
      business_area_id: parseInt(businessAreaId),
    };
    if (!getStock) {
      whereClause.is_sale = true;
    }

    if (type) {
      whereClause.type = type;
    }
    if (q) {
      whereClause.name = {
        contains: q,
      };
    }

    let orderByClause;

    if (type === "SERVICE") {
      orderByClause = {
        id: "asc",
      };
    } else {
      orderByClause = {
        name: "asc",
      };
    }

    const limit = parseInt(limitParam);
    const finalLimit = isNaN(limit) || limit <= 0 ? 10 : Math.min(limit, 100); // Default 10, maks 100
    // Ambil semua produk dari database
    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        business_area_id: true,
        name: true,
        type: true,
        tariff: true,
        small_unit_tariff: true,
        big_unit_name: true,
        small_unit_name: true,
        unit_conversion: true,
        created_at: true,
        updated_at: true,
        stock: {
          select: {
            quantity: true,
          },
        },
        supplier: {
          select: {
            name: true,
          },
        },
      },
      orderBy: orderByClause,
      take: finalLimit,
    });

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Handler untuk POST (Tambah Produk) - Hanya Superadmin
export async function POST(request) {
  try {
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // const { authorized, user } = await checkSuperAdmin(sessionToken);

    // if (!authorized) {
    //   return NextResponse.json(
    //     { error: "Forbidden: Superadmin only" },
    //     { status: 403 }
    //   );
    // }

    const body = await request.json();
    const { name, tariff, business_area_id } = body;

    if (!name || tariff === undefined || tariff === null) {
      return NextResponse.json(
        { error: "Nama dan tariff produk wajib diisi" },
        { status: 400 }
      );
    }

    // Buat produk baru di database
    const newProduct = await prisma.product.create({
      data: {
        // <-- Tambahkan 'data'
        name,
        tariff: parseInt(tariff),
        business_area_id: parseInt(business_area_id),
        is_active: false,
      },
      select: {
        id: true,
        name: true,
        tariff: true,
        business_area_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    if (error.code === "P2002" && error.meta?.target?.includes("name")) {
      return NextResponse.json(
        { error: "Nama produk sudah digunakan" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
