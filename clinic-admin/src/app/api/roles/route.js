// app/api/roles/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Validasi session untuk memastikan hanya user yang login yang bisa mengakses
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // const user = await validateAndUpdateSession(sessionToken);

    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Ambil semua role dari database, diurutkan berdasarkan id
    const roles = await prisma.user_role.findMany({
      where: {
        id: { not: 1 },
      },
      select: {
        id: true, // Kita ambil id untuk keperluan form submission
        name: true, // Kita ambil name untuk ditampilkan di dropdown
      },
      orderBy: {
        id: "asc", // Urutkan berdasarkan id secara ascending (menaik)
      },
    });

    // Kita kembalikan data roles
    // Format: [{ id: 1, name: 'admin' }, { id: 2, name: 'user' }, ...]
    return NextResponse.json(roles, { status: 200 });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
