// app/api/employees/[id]/route.js
import { NextResponse } from "next/server";
import { validateSession } from "../../../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// --- Fungsi Bantuan untuk Otorisasi ---
// Misalnya, hanya superadmin (role_id = 1) yang bisa mengupdate employee
// async function checkAuthorization(sessionToken) {
//   const user = await validateSession(sessionToken);

//   if (!user) {
//     return { authorized: false, user: null };
//   }

//   if (user.role_id !== 1) { // Ganti dengan logika otorisasi Anda
//     return { authorized: false, user };
//   }

//   return { authorized: true, user };
// }
// --- Akhir Fungsi Bantuan ---

// --- Handler PATCH (Update Employee) ---
export async function PATCH(request, { params }) {
  try {
    // Ambil ID dari params
    const { id } = await params; // <-- Sesuaikan dengan Next.js 15

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
    //   return NextResponse.json(
    //     { error: "Forbidden: Akses ditolak." },
    //     { status: 403 }
    //   );
    // }

    // --- Parsing Body Request ---
    const body = await request.json();
    // Ambil field yang mungkin ingin diupdate
    const {
      nip,
      nik,
      full_name,
      gender,
      date_of_birth,
      address,
      whatsapp_number,
      business_area_id,
      employee_title_id,
    } = body;

    // --- Validasi Input ---
    // Anda bisa menambahkan validasi lebih lanjut di sini
    if (
      nip === undefined &&
      nik === undefined &&
      full_name === undefined &&
      gender === undefined &&
      date_of_birth === undefined &&
      address === undefined &&
      whatsapp_number === undefined &&
      business_area_id === undefined &&
      employee_title_id === undefined
    ) {
      return NextResponse.json(
        { error: "Tidak ada data yang diberikan untuk diperbarui." },
        { status: 400 }
      );
    }

    // Jika ada field yang disediakan, validasi field tersebut
    if (nip !== undefined && typeof nip !== "string") {
      return NextResponse.json(
        { error: "Field nip harus berupa string." },
        { status: 400 }
      );
    }
    if (nik !== undefined && typeof nik !== "string") {
      return NextResponse.json(
        { error: "Field nik harus berupa string." },
        { status: 400 }
      );
    }
    if (full_name !== undefined && typeof full_name !== "string") {
      return NextResponse.json(
        { error: "Field full_name harus berupa string." },
        { status: 400 }
      );
    }
    if (gender !== undefined && typeof gender !== "string") {
      return NextResponse.json(
        { error: "Field gender harus berupa string." },
        { status: 400 }
      );
    }
    if (date_of_birth !== undefined && typeof date_of_birth !== "string") {
      return NextResponse.json(
        {
          error: "Field date_of_birth harus berupa string (format YYYY-MM-DD).",
        },
        { status: 400 }
      );
    }
    if (address !== undefined && typeof address !== "string") {
      return NextResponse.json(
        { error: "Field address harus berupa string." },
        { status: 400 }
      );
    }
    if (whatsapp_number !== undefined && typeof whatsapp_number !== "string") {
      return NextResponse.json(
        { error: "Field whatsapp_number harus berupa string." },
        { status: 400 }
      );
    }
    if (
      business_area_id !== undefined &&
      business_area_id !== null &&
      business_area_id !== "" &&
      isNaN(parseInt(business_area_id))
    ) {
      return NextResponse.json(
        { error: "Field business_area_id harus berupa angka atau null." },
        { status: 400 }
      );
    }
    if (
      employee_title_id !== undefined &&
      employee_title_id !== null &&
      isNaN(parseInt(employee_title_id))
    ) {
      return NextResponse.json(
        { error: "Field employee_title_id harus berupa angka atau null." },
        { status: 400 }
      );
    }

    // Validasi format tanggal (jika disediakan)
    if (date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date_of_birth)) {
        return NextResponse.json(
          {
            error:
              "Format tanggal lahir tidak valid. Gunakan format YYYY-MM-DD.",
          },
          { status: 400 }
        );
      }
      const parsedDate = new Date(date_of_birth);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Tanggal lahir tidak valid." },
          { status: 400 }
        );
      }
    }

    // --- Siapkan data untuk diupdate ---
    // Hanya sertakan field yang disediakan dalam body
    const updateData = {};
    if (nip !== undefined) updateData.nip = nip;
    if (nik !== undefined) updateData.nik = nik;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (gender !== undefined) updateData.gender = gender;
    if (date_of_birth !== undefined)
      updateData.date_of_birth = new Date(date_of_birth);
    if (address !== undefined) updateData.address = address;
    if (whatsapp_number !== undefined)
      updateData.whatsapp_number = whatsapp_number;
    if (employee_title_id !== undefined)
      updateData.employee_title_id = employee_title_id;

    // Validasi business_area_id dan employee_position_id jika disediakan
    if (business_area_id !== undefined) {
      if (business_area_id === null) {
        updateData.business_area_id = null; // Izinkan null
      } else {
        const businessAreaIdParsed = parseInt(business_area_id);
        if (isNaN(businessAreaIdParsed)) {
          return NextResponse.json(
            { error: "business_area_id harus berupa angka atau null." },
            { status: 400 }
          );
        }
        // Opsional: Validasi apakah business_area_id benar-benar ada di database
        const business_areaExists = await prisma.business_area.findUnique({
          where: { id: businessAreaIdParsed },
        });
        if (!business_areaExists) {
          return NextResponse.json(
            {
              error: `Klinik dengan ID ${businessAreaIdParsed} tidak ditemukan.`,
            },
            { status: 400 }
          );
        }
        updateData.business_area_id = businessAreaIdParsed;
      }
    }

    // --- Update Employee di Database ---
    const updatedEmployee = await prisma.employee.update({
      where: { nip: id },
      data: updateData, // Gunakan objek data yang dibangun di atas
      select: {
        nip: true,
        nik: true,
        full_name: true,
        gender: true,
        date_of_birth: true,
        address: true,
        whatsapp_number: true,
        business_area_id: true,
        employee_title_id: true,
        created_at: true,
        updated_at: true,
        business_area: {
          select: {
            name: true,
            address: true,
          },
        },
        employee_title: {
          select: {
            name: true,
          },
        },
      },
    });

    // --- Respons Berhasil ---
    return NextResponse.json(updatedEmployee, { status: 200 }); // OK
  } catch (error) {
    console.error("Error updating employee (PATCH):", error);

    // Tangani error Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Record tidak ditemukan
        return NextResponse.json(
          { error: "Karyawan tidak ditemukan." },
          { status: 404 }
        );
      }
      if (error.code === "P2002") {
        // Unique constraint violation (misalnya NIP atau NIK sudah ada)
        // Cek field mana yang menyebabkan pelanggaran
        const targetField = error.meta?.target?.join(", ") || "field";
        return NextResponse.json(
          { error: `Gagal memperbarui: ${targetField} sudah digunakan.` },
          { status: 400 }
        );
      }
      // Tangani error Prisma lainnya jika diperlukan
    }

    // Error umum server
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memperbarui karyawan." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler PATCH ---

// --- Placeholder untuk handler lainnya ---
// export async function GET(request, { params }) { ... }
// export async function DELETE(request, { params }) { ... } // Jika Anda ingin mengganti DELETE dengan soft-delete seperti produk
