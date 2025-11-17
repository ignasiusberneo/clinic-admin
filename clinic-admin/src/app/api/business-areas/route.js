import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fungsi bantuan untuk memeriksa apakah user adalah superadmin (role_id = 1)
// async function checkSuperAdmin(sessionToken) {
//   const user = await validateAndUpdateSession(sessionToken);

//   if (!user) {
//     return { authorized: false, user: null };
//   }

//   // Pastikan user.role_id diambil dalam validateAndUpdateSession, atau ambil di sini
//   // Jika validateAndUpdateSession tidak mengambil role, kita ambil di sini
//   if (user.role_id !== 1) {
//     return { authorized: false, user };
//   }

//   return { authorized: true, user };
// }

export async function GET(request) {
  try {
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const excludeHeadOffice = searchParams.get("exclude_head_office");
    const whereClause = {};

    if (excludeHeadOffice) {
      whereClause.id = {
        not: 100,
      };
    }

    // const user = await validateAndUpdateSession(sessionToken);

    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const businessAreas = await prisma.business_area.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        address: true,
      },
    });

    return NextResponse.json(businessAreas, { status: 200 });
  } catch (error) {
    console.error("Error fetching businessAreas:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Handler untuk POST (Tambah Klinik) - Hanya Superadmin
export async function POST(request) {
  try {
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // const { authorized, user } = await checkSuperAdmin(sessionToken);

    // if (!authorized) {
    //   // Jika user login tapi bukan superadmin
    //   return NextResponse.json(
    //     { error: "Forbidden: Superadmin only" },
    //     { status: 403 }
    //   );
    // }

    const body = await request.json();
    const { name, address } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama klinik wajib diisi" },
        { status: 400 }
      );
    }

    const newBusinessArea = await prisma.business_area.create({
      data: {
        name,
        address: address || null,
      },
      select: {
        id: true,
        name: true,
        address: true,
      },
    });

    return NextResponse.json(newBusinessArea, { status: 201 });
  } catch (error) {
    console.error("Error creating business area:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Nama klinik sudah ada" },
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

// Handler untuk PUT (Update Klinik) - Hanya Superadmin
export async function PUT(request) {
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
    const { id, name, address } = body; // Ambil id dari body

    if (!id || typeof id !== "number") {
      return NextResponse.json(
        { error: "ID klinik tidak valid" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Nama klinik wajib diisi" },
        { status: 400 }
      );
    }

    // Update klinik di database
    const updatedBusinessArea = await prisma.business_area.update({
      where: {
        id: id,
      },
      data: {
        name,
        address: address || null,
      },
      select: {
        id: true,
        name: true,
        address: true,
      },
    });

    return NextResponse.json(updatedBusinessArea, { status: 200 });
  } catch (error) {
    console.error("Error updating business area:", error);
    if (error.code === "P2025") {
      // Prisma error jika record tidak ditemukan
      return NextResponse.json(
        { error: "Klinik tidak ditemukan" },
        { status: 404 }
      );
    }
    if (error.code === "P2002") {
      // Prisma error untuk constraint unik
      return NextResponse.json(
        { error: "Nama klinik sudah ada" },
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
