// app/api/orders/[orderId]/items/[orderItemId]/assign-patients/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Fungsi Bantuan untuk Otorisasi ---
// async function checkAuthorization(
//   sessionToken,
//   requestedOrderId,
//   requestedOrderItemId
// ) {
//   const user = await validateSession(sessionToken);

//   if (!user) {
//     return { authorized: false, user: null };
//   }

//   // Ambil order_item untuk verifikasi clinic_id
//   const orderItem = await prisma.order_item.findUnique({
//     where: { id: parseInt(requestedOrderItemId) },
//     include: {
//       order: {
//         select: { clinic_id: true },
//       },
//     },
//   });

//   if (!orderItem) {
//     return { authorized: false, user, reason: "Order item tidak ditemukan." };
//   }

//   // Contoh: Cek apakah user adalah superadmin atau dari klinik yang sama
//   if (user.role_id !== 1 && user.clinic_id !== orderItem.order.clinic_id) {
//     return {
//       authorized: false,
//       user,
//       reason: "Akses ditolak: Klinik tidak sesuai.",
//     };
//   }

//   return { authorized: true, user };
// }
// --- Akhir Fungsi Bantuan ---

// --- Handler PATCH (Assign Pasien ke Order Item & Buat Medical Records) ---
export async function PATCH(request, { params }) {
  try {
    // Ambil ID dari params
    const { orderId, orderItemId } = await params; // <-- Sesuaikan dengan Next.js 15

    // --- Autentikasi & Otorisasi ---
    // const sessionToken = (await cookies()).get("sessionToken")?.value;

    // if (!sessionToken) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Sesi tidak ditemukan." },
    //     { status: 401 }
    //   );
    // }

    // const { authorized, user, reason } = await checkAuthorization(
    //   sessionToken,
    //   orderId,
    //   orderItemId
    // );

    // if (!authorized) {
    //   return NextResponse.json(
    //     { error: reason || "Forbidden: Akses ditolak." },
    //     { status: 403 }
    //   );
    // }

    // --- Parsing Body Request ---
    const body = await request.json();
    const { patient_ids } = body; // Array of patient IDs

    // --- Validasi Input ---
    if (
      !patient_ids ||
      !Array.isArray(patient_ids) ||
      patient_ids.length === 0
    ) {
      return NextResponse.json(
        { error: "Parameter patient_ids (array) wajib disertakan." },
        { status: 400 }
      );
    }

    // Pastikan jumlah patient_ids sesuai dengan quantity order_item
    const orderItemRecord = await prisma.order_item.findUnique({
      where: { id: parseInt(orderItemId) },
      select: { quantity: true, schedule_id: true }, // Ambil schedule_id juga untuk membuat medical_record
    });

    if (!orderItemRecord) {
      return NextResponse.json(
        { error: "Item order tidak ditemukan." },
        { status: 404 }
      );
    }

    if (patient_ids.length !== orderItemRecord.quantity) {
      return NextResponse.json(
        {
          error: `Jumlah patient_ids (${patient_ids.length}) tidak sesuai dengan quantity item order (${orderItemRecord.quantity}).`,
        },
        { status: 400 }
      );
    }

    // --- Validasi: Pastikan semua patient_id ada dan valid ---
    const patientRecords = await prisma.patient.findMany({
      where: {
        id: { in: patient_ids.map((id) => parseInt(id)) },
      },
      select: { id: true },
    });

    const foundPatientIds = new Set(patientRecords.map((p) => p.id));
    const missingPatientIds = patient_ids.filter(
      (id) => !foundPatientIds.has(parseInt(id))
    );

    if (missingPatientIds.length > 0) {
      return NextResponse.json(
        {
          error: `Pasien dengan ID ${missingPatientIds.join(
            ", "
          )} tidak ditemukan.`,
        },
        { status: 400 }
      );
    }

    // --- Validasi: Pastikan order_item belum diassign ---
    // Kita bisa mengecek apakah sudah ada medical_record untuk schedule_id ini
    // Jika jumlah medical_record untuk schedule_id ini >= max_quota dari schedule, maka sudah penuh
    // Atau, kita bisa mengecek apakah order_item ini sudah diassign (jika field is_assigned digunakan untuk penandaan ini)
    // Kita asumsikan field is_assigned digunakan.
    if (orderItemRecord.is_assigned) {
      return NextResponse.json(
        { error: "Item order sudah ditugaskan ke pasien sebelumnya." },
        { status: 400 }
      );
    }

    // --- Gunakan Transaction untuk Operasi Assign ---
    // 1. Buat record medical_record untuk setiap pasien
    // 2. Update status is_assigned di order_item
    const createdMedicalRecords = await prisma.$transaction(async (tx) => {
      const medicalRecordPromises = patient_ids.map((patientId) => {
        return tx.medical_record.create({
          data: {
            patient_id: parseInt(patientId),
            schedule_id: orderItemRecord.schedule_id, // Gunakan schedule_id dari order_item
            order_item_id: parseInt(orderItemId), // Gunakan order_item_id dari params
            // Field lainnya (tensi_darah_before, denyut_nadi_before, dll.) diisi default "" oleh schema
          },
          select: {
            id: true,
            patient_id: true,
            schedule_id: true,
            order_item_id: true,
            tensi_darah_before: true,
            tensi_darah_after: true,
            denyut_nadi_before: true,
            denyut_nadi_after: true,
            kadar_oksigen_before: true,
            kadar_oksigen_after: true,
            created_at: true,
            updated_at: true,
            patient: {
              select: {
                full_name: true,
                // Tambahkan field lain dari patient jika diperlukan
              },
            },
            schedule: {
              select: {
                start_time: true,
                end_time: true,
                product: {
                  select: {
                    name: true,
                    // Tambahkan field lain dari product jika diperlukan
                  },
                },
              },
            },
          },
        });
      });

      // Buat semua medical_record sekaligus
      const records = await Promise.all(medicalRecordPromises);

      // 2. Update status is_assigned di order_item
      await tx.order_item.update({
        where: { id: parseInt(orderItemId) },
        data: {
          is_assigned: true,
        },
      });

      console.log(parseInt(orderId));

      await tx.order.update({
        where: { id: orderId },
        data: {
          attendance_status: "HAS_ATTENDED",
        },
      });

      return records;
    });

    // Ambil ulang order_item untuk mengembalikan status terbaru
    const updatedOrderItem = await prisma.order_item.findUnique({
      where: { id: parseInt(orderItemId) },
      include: {
        schedule: {
          include: {
            product: true,
          },
        },
        order: {
          include: {
            business_area: true,
          },
        },
      },
    });

    // --- Respons Berhasil ---
    return NextResponse.json(
      {
        order_item: updatedOrderItem,
        medical_records_created: createdMedicalRecords,
      },
      { status: 200 }
    ); // OK
  } catch (error) {
    console.error("Error assigning patients to order item (PATCH):", error);

    // Tangani error Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Contoh: Constraint unik dilanggar (jika ada)
        return NextResponse.json(
          { error: "Konflik data ditemukan saat menugaskan pasien." },
          { status: 400 }
        );
      }
      if (error.code === "P2025") {
        // Record tidak ditemukan saat update/delete
        return NextResponse.json(
          { error: "Order item tidak ditemukan atau sudah dihapus." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan server saat menugaskan pasien." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
// --- Akhir Handler PATCH ---
