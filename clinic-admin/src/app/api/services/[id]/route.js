// app/api/services/[id]/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../../utils/session"; // Sesuaikan path
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

// Handler untuk PUT (Update Service) - Hanya Superadmin
export async function PUT(request, { params }) {
  // Jadikan async
  try {
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Ambil ID dari params, dan await karena params.id sekarang Promise
    const { id } = await params; // <-- Di sini: Destructure id dari params yang di-await
    const serviceId = parseInt(id); // <-- Gunakan 'id' yang diambil dari await params

    if (isNaN(serviceId)) {
      return NextResponse.json(
        { error: "ID layanan tidak valid" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, price } = body;

    // Validasi input
    if (price === undefined || price === null) {
      return NextResponse.json({ error: "price wajib diisi" }, { status: 400 });
    }

    // Validasi apakah service yang akan diupdate ada
    const serviceExists = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!serviceExists) {
      return NextResponse.json(
        { error: "Layanan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Buat objek data untuk update, hanya sertakan field yang ingin diubah
    const updateData = {
      name,
      price: parseInt(price),
      // product_id: parseInt(product_id), // Hapus baris ini jika product_id tidak boleh diubah
    };

    // Update service di database
    const updatedService = await prisma.service.update({
      where: {
        id: serviceId,
      },
      data: {
        // <-- Keyword 'data' EKSPLISIT (ini adalah koreksi utama)
        ...updateData, // Gunakan spread operator untuk memasukkan field-field dari updateData
      }, // <-- Akhir dari objek 'data'
      select: {
        id: true,
        name: true,
        price: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json(updatedService, { status: 200 });
  } catch (error) {
    console.error("Error updating service:", error);
    if (error.code === "P2025") {
      // Prisma error jika record tidak ditemukan
      return NextResponse.json(
        { error: "Layanan tidak ditemukan" },
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
export async function DELETE(request, { params }) {
  // Jadikan async
  try {
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const { id } = await params; // <-- Di sini: Destructure id dari params yang di-await
    const serviceId = parseInt(id); // <-- Gunakan 'id' yang diambil dari await params

    if (isNaN(serviceId)) {
      return NextResponse.json(
        { error: "ID layanan tidak valid" },
        { status: 400 }
      );
    }

    // Validasi apakah service yang akan diupdate ada
    const serviceExists = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!serviceExists) {
      return NextResponse.json(
        { error: "Layanan tidak ditemukan" },
        { status: 404 }
      );
    }

    const updateData = {
      is_active: false,
    };

    // Update service di database
    const updatedService = await prisma.service.update({
      where: {
        id: serviceId,
      },
      data: {
        ...updateData,
      },
      select: {
        id: true,
        name: true,
        price: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json(updatedService, { status: 200 });
  } catch (error) {
    console.error("Error updating service:", error);
    if (error.code === "P2025") {
      // Prisma error jika record tidak ditemukan
      return NextResponse.json(
        { error: "Layanan tidak ditemukan" },
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
