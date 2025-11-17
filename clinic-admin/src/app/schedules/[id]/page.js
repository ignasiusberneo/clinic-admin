// app/schedules/[id]/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ScheduleDetailPage() {
  const [schedule, setSchedule] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id; // Ambil ID dari URL params

  // --- State untuk menyimpan perubahan pada medical records ---
  const [editedRecords, setEditedRecords] = useState({});
  // Struktur: { medicalRecordId: { field: newValue, ... }, ... }
  // --- Akhir State Edit ---

  // --- 1. Fetch detail schedule dan medical records ---
  useEffect(() => {
    const fetchScheduleDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        setSubmitError(null); // Reset error submit saat fetch ulang

        const scheduleRes = await fetch(`/api/schedules/${scheduleId}`); // Ganti dengan endpoint Anda untuk detail schedule
        if (scheduleRes.ok) {
          const scheduleData = await scheduleRes.json();
          setSchedule(scheduleData);

          // Ambil medical records terkait schedule ini
          const recordsRes = await fetch(
            `/api/medical-records?schedule_id=${scheduleId}`
          ); // Ganti dengan endpoint Anda
          if (recordsRes.ok) {
            const recordsData = await recordsRes.json();
            setMedicalRecords(recordsData);
            // Inisialisasi state editedRecords
            const initialEdits = {};
            recordsData.forEach((record) => {
              initialEdits[record.id] = {
                tensi_darah_before: record.tensi_darah_before,
                tensi_darah_after: record.tensi_darah_after,
                denyut_nadi_before: record.denyut_nadi_before,
                denyut_nadi_after: record.denyut_nadi_after,
                kadar_oksigen_before: record.kadar_oksigen_before,
                kadar_oksigen_after: record.kadar_oksigen_after,
              };
            });
            setEditedRecords(initialEdits);
          } else {
            const errorText = await recordsRes.text();
            setError(`Gagal memuat daftar rekam medis: ${errorText}`);
            setMedicalRecords([]);
          }
        } else {
          const errorText = await scheduleRes.text();
          setError(`Gagal memuat detail jadwal: ${errorText}`);
          setSchedule(null);
        }
      } catch (err) {
        console.error("Error fetching schedule detail:", err);
        setError("Terjadi kesalahan saat memuat data jadwal dan rekam medis.");
        router.push("/login"); // Redirect jika error jaringan atau tidak terduga
        router.refresh();
      } finally {
        setLoading(false);
      }
    };

    if (scheduleId) {
      fetchScheduleDetail();
    }
  }, [scheduleId, router]);

  // --- 2. Handler untuk perubahan input field rekam medis ---
  const handleRecordChange = (recordId, fieldName, value) => {
    setEditedRecords((prev) => ({
      ...prev,
      [recordId]: {
        ...prev[recordId],
        [fieldName]: value,
      },
    }));
  };

  // --- 3. Handler untuk submit perubahan ke satu record ---
  const handleSubmitRecord = async (recordId) => {
    setSubmitting(true);
    setSubmitError(null);

    const updatedFields = editedRecords[recordId];

    if (!updatedFields) {
      setSubmitError("Data rekam medis tidak ditemukan.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/medical-records/${recordId}`, {
        // Ganti dengan endpoint Anda
        method: "PATCH", // Gunakan PATCH untuk update partial
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedFields), // Kirim field-field yang diubah
      });

      if (res.ok) {
        const updatedRecord = await res.json();
        // Perbarui data di state lokal
        setMedicalRecords((prev) =>
          prev.map((rec) => (rec.id === recordId ? updatedRecord : rec))
        );
        alert("Rekam medis berhasil diperbarui!");
      } else {
        const errorData = await res.json();
        setSubmitError(
          errorData.error || `Gagal memperbarui rekam medis ID ${recordId}.`
        );
      }
    } catch (err) {
      console.error(`Error updating medical record ${recordId}:`, err);
      setSubmitError("Terjadi kesalahan saat memperbarui rekam medis.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">
          Memuat detail jadwal dan rekam medis...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-green-50 min-h-screen">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 bg-green-600 text-white py-1 px-3 rounded hover:bg-green-500"
        >
          Kembali
        </button>
      </div>
    );
  }

  if (!schedule) {
    router.push("/schedules"); // Arahkan jika schedule tidak ditemukan
    return null;
  }

  // Format waktu untuk tampilan
  const formattedStartTime = new Date(schedule.start_time).toLocaleString(
    "id-ID",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }
  );
  const formattedEndTime = new Date(schedule.end_time).toLocaleTimeString(
    "id-ID",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }
  );

  return (
    <div className="p-6 bg-green-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-green-900 mb-6">
          Detail Jadwal
        </h1>

        {/* Informasi Jadwal */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-green-200">
          <h2 className="text-xl font-semibold text-green-800 mb-2">
            Informasi Jadwal
          </h2>
          <p className="text-gray-700">
            <span className="font-medium">Klinik:</span>{" "}
            {schedule.clinic?.name || `ID: ${schedule.clinic_id}`}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Layanan:</span>{" "}
            {schedule.product?.name || `Produk ID: ${schedule.product_id}`}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Waktu:</span> {formattedStartTime} -{" "}
            {formattedEndTime}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Kuota:</span>{" "}
            {schedule.remaining_quota} dari {schedule.max_quota} tersisa
          </p>
        </div>

        {/* Tabel Rekam Medis */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-green-200">
          <h2 className="text-xl font-semibold text-green-800 mb-4">
            Rekam Medis Pasien
          </h2>

          {medicalRecords.length === 0 ? (
            <p className="text-gray-600">
              Tidak ada rekam medis untuk jadwal ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      ID Pasien
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Nama Pasien
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Tensi Darah (Sebelum)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Tensi Darah (Sesudah)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Denyut Nadi (Sebelum)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Denyut Nadi (Sesudah)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Kadar Oksigen (Sebelum)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Kadar Oksigen (Sesudah)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {medicalRecords.map((record) => {
                    const editedData = editedRecords[record.id] || record; // Gunakan data yang diedit jika ada, atau data asli

                    return (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.patient_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.patient?.full_name ||
                            `Pasien ID: ${record.patient_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <input
                            type="text"
                            value={editedData.tensi_darah_before}
                            onChange={(e) =>
                              handleRecordChange(
                                record.id,
                                "tensi_darah_before",
                                e.target.value
                              )
                            }
                            className="block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <input
                            type="text"
                            value={editedData.tensi_darah_after}
                            onChange={(e) =>
                              handleRecordChange(
                                record.id,
                                "tensi_darah_after",
                                e.target.value
                              )
                            }
                            className="block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <input
                            type="text"
                            value={editedData.denyut_nadi_before}
                            onChange={(e) =>
                              handleRecordChange(
                                record.id,
                                "denyut_nadi_before",
                                e.target.value
                              )
                            }
                            className="block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <input
                            type="text"
                            value={editedData.denyut_nadi_after}
                            onChange={(e) =>
                              handleRecordChange(
                                record.id,
                                "denyut_nadi_after",
                                e.target.value
                              )
                            }
                            className="block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <input
                            type="text"
                            value={editedData.kadar_oksigen_before}
                            onChange={(e) =>
                              handleRecordChange(
                                record.id,
                                "kadar_oksigen_before",
                                e.target.value
                              )
                            }
                            className="block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <input
                            type="text"
                            value={editedData.kadar_oksigen_after}
                            onChange={(e) =>
                              handleRecordChange(
                                record.id,
                                "kadar_oksigen_after",
                                e.target.value
                              )
                            }
                            className="block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleSubmitRecord(record.id)}
                            disabled={submitting}
                            className={`px-3 py-1 rounded-md ${
                              submitting
                                ? "bg-gray-400 text-white cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-500"
                            }`}
                          >
                            {submitting ? "..." : "Simpan"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tombol Kembali */}
        <div className="flex justify-end">
          <button
            onClick={() => router.back()}
            className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Kembali ke Daftar
          </button>
        </div>

        {/* Error Submit */}
        {submitError && (
          <p className="text-red-500 mt-4 text-center">{submitError}</p>
        )}
      </div>
    </div>
  );
}
