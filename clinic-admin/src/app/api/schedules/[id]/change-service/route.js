import { Prisma, PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function PATCH(request, { params }) {
  try {
    const { id } = await params; // <-- Sesuaikan dengan Next.js 15
    const scheduleId = parseInt(id);

    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: "ID jadwal tidak valid." },
        { status: 400 }
      );
    }

    // --- Autentikasi & Otorisasi ---
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Sesi tidak ditemukan." },
    //     { status: 401 }
    //   );
    // }

    // const { authorized, user } = await checkAuthorization(sessionToken);

    // if (!authorized) {
    //   return NextResponse.json({ error: 'Forbidden: Akses ditolak.' }, { status: 403 });
    // }

    const body = await request.json();
    const { newServiceId } = body; // Contoh: Kirim jumlah untuk dikurangi

    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        service_id: newServiceId,
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json(updatedSchedule, { status: 200 });
  } catch (error) {
    console.error("Error updating schedule quota (PATCH):", error);

    if (error.message && error.message.includes("melebihi sisa kuota")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Record tidak ditemukan saat update
        return NextResponse.json(
          { error: "Jadwal tidak ditemukan." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memperbarui jadwal." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
