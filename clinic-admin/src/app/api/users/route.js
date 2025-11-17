// app/api/users/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs"; // Impor bcrypt

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

export async function GET() {
  try {
    const sessionToken = (await cookies()).get("sessionToken")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateAndUpdateSession(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = user.id; // Ambil ID pengguna saat ini dari session

    // Ambil pengguna dari database, KECUALI pengguna saat ini
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
      },
      select: {
        id: true,
        username: true,
        role_id: true,
        business_area_id: true,
        // Include data role terkait
        role: {
          // Tambahkan field 'role'
          select: {
            name: true, // Ambil nama role
            // Anda bisa menambahkan field lain dari role jika diperlukan
          },
        },
        business_area: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        username: "desc", // Urutkan berdasarkan id secara ascending (menaik)
      },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Handler untuk POST (Tambah Pengguna) - Hanya Superadmin
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
    const { username, password, role_id, business_area_id, nip } = body;

    // Validasi sederhana
    if (!username || !password || !role_id) {
      return NextResponse.json(
        { error: "Username, password, dan role_id wajib diisi" },
        { status: 400 }
      );
    }

    // Jika role_id bukan 1 (superadmin), pastikan business_area_id dipilih
    if (parseInt(role_id) !== 1 && !business_area_id) {
      return NextResponse.json(
        { error: "Klinik wajib dipilih untuk role selain superadmin." },
        { status: 400 }
      );
    }

    // Enkripsi password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat pengguna baru di database
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role_id: parseInt(role_id), // Pastikan role_id adalah integer
        business_area_id: business_area_id ? parseInt(business_area_id) : null, // Pastikan business_area_id adalah integer atau null
      },
      select: {
        id: true,
        username: true,
        role_id: true,
        business_area_id: true,
      },
    });

    await prisma.employee.update({
      where: {
        nip: nip,
      },
      data: {
        user_id: newUser.id,
      },
    });

    // Ambil data klinik dan role yang terkait untuk response
    const newUserWithDetails = await prisma.user.findUnique({
      where: { id: newUser.id },
      select: {
        id: true,
        username: true,
        role_id: true,
        business_area_id: true,
        // Include data role terkait
        role: {
          select: {
            name: true,
          },
        },
        business_area: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(newUserWithDetails, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    // Tangani error Prisma, misalnya username sudah ada (unique constraint)
    if (error.code === "P2002" && error.meta?.target?.includes("username")) {
      return NextResponse.json(
        { error: "Username sudah digunakan" },
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
