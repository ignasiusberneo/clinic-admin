// app/api/patients/[id]/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Handler untuk GET (Mendapatkan Detail Pasien) ---
export async function GET(request, { params }) {
  try {
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // const user = await validateAndUpdateSession(sessionToken);

    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // --- Ambil ID dari params secara async ---
    const { id } = await params;
    const patientId = parseInt(id);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: "ID pasien tidak valid." },
        { status: 400 }
      );
    }

    // --- Cari Pasien ---
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        full_name: true,
        gender: true,
        date_of_birth: true,
        whatsapp_number: true,
        address: true,
        registration_date: true,
        referral_type_id: true,
        referral_id: true,
        referral_type: {
          select: {
            name: true,
          },
        },
        referred_by: {
          select: {
            id: true,
            full_name: true,
          },
        },
        // Anda bisa menambahkan relasi lain seperti appointments, medical records, dll.
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Pasien tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json(patient, { status: 200 });
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mengambil data pasien." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Placeholder untuk PUT dan DELETE
// export async function PUT(request, { params }) { ... }
// export async function DELETE(request, { params }) { ... }
