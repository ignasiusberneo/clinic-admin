// app/api/products/[id]/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fungsi bantuan untuk memeriksa apakah user adalah superadmin (role_id = 1)
// async function checkSuperAdmin(sessionToken) {
//   const user = await validateAndUpdateSession(sessionToken);

//   if (!user) {
//     return { authorized: false, user: null };
//   }

//   if (user.role_id !== 1) {
//     return { authorized: false, user };
//   }

//   return { authorized: true, user };
// }
export async function PUT(request, { params }) {
  // Jadikan async
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

    // Ambil ID dari params, dan await karena params.id sekarang Promise
    const { id } = await params; // <-- Di sini: Destructure id dari params yang di-await
    const productId = parseInt(id); // <-- Gunakan 'id' yang diambil dari await params

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "ID produk tidak valid" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, tariff } = body;

    if (!name || tariff === undefined || tariff === null) {
      return NextResponse.json(
        { error: "Nama dan tariff produk wajib diisi" },
        { status: 400 }
      );
    }

    // Update produk di database
    const updatedProduct = await prisma.product.update({
      where: {
        // <-- Awal objek 'where'
        id: productId, // <-- Gunakan 'productId' yang berasal dari 'id'
        is_active: false,
      }, // <-- Akhir objek 'where'
      data: {
        // <-- Awal objek 'data' - INI SANGAT PENTING
        name, // Shorthand untuk name: name
        tariff: parseInt(tariff), // Pastikan tariff integer
      }, // <-- Akhir objek 'data'
      select: {
        // <-- Awal objek 'select'
        id: true,
        name: true,
        tariff: true,
        created_at: true,
        updated_at: true,
      }, // <-- Akhir objek 'select'
    }); // <-- Akhir objek utama untuk prisma.product.update

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error("Error updating product:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Produk tidak ditemukan atau sudah dihapus" },
        { status: 404 }
      );
    }
    if (error.code === "P2002" && error.meta?.target?.includes("name")) {
      // Unique constraint
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

// Handler untuk DELETE (Hapus Produk) - Hanya Superadmin
export async function DELETE(request, { params }) {
  // Jadikan async
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

    // Ambil ID dari params, dan await karena params.id sekarang Promise
    const { id } = await params; // <-- Di sini: Destructure id dari params yang di-await
    const productId = parseInt(id); // <-- Gunakan 'id' yang diambil dari await params

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "ID produk tidak valid" },
        { status: 400 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: {
        // <-- Awal objek 'where'
        id: productId, // <-- Gunakan 'productId' yang berasal dari 'id'
      }, // <-- Akhir objek 'where'
      data: {
        // <-- Awal objek 'data' - INI SANGAT PENTING
        is_active: true, // Ubah menjadi false
      }, // <-- Akhir objek 'data'
      select: {
        // <-- Awal objek 'select'
        id: true,
      }, // <-- Akhir objek 'select'
    }); // <-- Akhir objek utama untuk prisma.product.update

    // Jika tidak ada baris yang terpengaruh (misalnya ID tidak ditemukan), Prisma akan melempar P2025
    return NextResponse.json(
      { message: "Produk berhasil dinonaktifkan", updatedProduct },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting (soft delete) product:", error);
    if (error.code === "P2025") {
      // Prisma error jika record tidak ditemuk
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
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
