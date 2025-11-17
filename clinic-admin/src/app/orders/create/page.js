"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Utility function untuk memformat Date object menjadi string YYYY-MM-DD
// menggunakan komponen lokal waktu, yang lebih aman untuk pemilihan tanggal/hari.
const formatDateToISOString = (date) => {
  if (!date || !(date instanceof Date)) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CreateOrderPage() {
  const [clinics, setClinics] = useState([]);
  const [services, setServices] = useState([]); // Daftar layanan untuk klinik yang dipilih
  const [schedules, setSchedules] = useState([]); // Daftar jadwal untuk layanan dan tanggal
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(""); // ID produk
  const [selectedDate, setSelectedDate] = useState(new Date()); // Default ke hari ini
  const [selectedSchedule, setSelectedSchedule] = useState(null); // Jadwal yang dipilih
  const [numberOfPatients, setNumberOfPatients] = useState(1); // Jumlah pasien untuk jadwal yang dipilih

  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [error, setError] = useState(null);
  const [servicesError, setServicesError] = useState(null);
  const [schedulesError, setSchedulesError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const router = useRouter();

  // --- 1. Fetch data awal: clinics dan Autentikasi ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const clinicsRes = await fetch("/api/clinics");
        if (clinicsRes.ok) {
          const clinicsData = await clinicsRes.json();
          setClinics(clinicsData);
        } else {
          setError("Gagal memuat daftar klinik.");
        }
      } catch (err) {
        console.error("Error fetching initial ", err);
        setError("Terjadi kesalahan saat memuat data awal.");
        // Note: Tidak perlu redirect ulang di sini karena sudah ada logic di atas
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // --- 2. Fetch services berdasarkan clinic_id ---
  useEffect(() => {
    const fetchServices = async () => {
      if (!selectedClinicId) {
        setServices([]);
        setServicesError(null);
        return;
      }

      setLoadingServices(true);
      setServicesError(null);

      try {
        const servicesRes = await fetch(
          `/api/services?clinic_id=${selectedClinicId}`
        );
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          // Filter service aktif
          setServices(
            servicesData.filter((s) => s.product && !s.product.is_deleted)
          );
        } else {
          setServicesError("Gagal memuat daftar layanan untuk klinik ini.");
        }
      } catch (err) {
        console.error("Error fetching services:", err);
        setServicesError("Terjadi kesalahan saat memuat data layanan.");
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, [selectedClinicId]);

  // --- 3. Fetch schedules berdasarkan clinic_id, service_id, date ---
  // Menggunakan useCallback untuk stabilitas function, namun dipanggil di useEffect
  const fetchSchedules = useCallback(async () => {
    // Hanya fetch jika ketiga filter sudah dipilih
    if (!selectedClinicId || !selectedServiceId || !selectedDate) {
      setSchedules([]);
      setSelectedSchedule(null); // Reset jadwal terpilih
      return;
    }

    setLoadingSchedules(true);
    setSchedulesError(null);
    setSelectedSchedule(null); // Reset jadwal terpilih saat filter berubah

    try {
      // --- PERUBAHAN LOGIC TANGGAL: Menggunakan fungsi lokal formatDateToISOString ---
      const formattedDate = formatDateToISOString(selectedDate);
      // --- AKHIR PERUBAHAN LOGIC TANGGAL ---

      const schedulesRes = await fetch(
        `/api/schedules?clinic_id=${selectedClinicId}&service_id=${selectedServiceId}&date=${formattedDate}`
      );

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(schedulesData);
      } else {
        const errorText = await schedulesRes.text();
        setSchedulesError(errorText || "Gagal memuat daftar jadwal.");
        setSchedules([]); // Kosongkan daftar jika error
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
      setSchedulesError("Terjadi kesalahan saat memuat data jadwal.");
      setSchedules([]); // Kosongkan daftar jika error
    } finally {
      setLoadingSchedules(false);
    }
  }, [selectedClinicId, selectedServiceId, selectedDate]); // Dependencies yang tepat

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]); // Panggil effect saat fetchSchedules berubah (karena dependensi state-nya berubah)

  // --- 4. Handler untuk perubahan input ---
  const handleClinicChange = (e) => {
    const clinicId = e.target.value;
    setSelectedClinicId(clinicId);
    setSelectedServiceId("");
    setSelectedDate(new Date()); // Reset tanggal ke hari ini
    setSchedules([]);
    setSchedulesError(null);
    setSelectedSchedule(null);
    setNumberOfPatients(1); // Reset jumlah pasien
    setSubmitError(null); // Reset error submit
  };

  const handleServiceChange = (e) => {
    const serviceId = e.target.value;
    setSelectedServiceId(serviceId);
    setSelectedDate(new Date()); // Reset tanggal ke hari ini
    setSchedules([]);
    setSchedulesError(null);
    setSelectedSchedule(null);
    setNumberOfPatients(1); // Reset jumlah pasien
    setSubmitError(null); // Reset error submit
  };

  const handleDateChange = (date) => {
    // Pastikan date adalah objek Date yang valid
    if (date && date instanceof Date) {
      setSelectedDate(date);
      setSchedules([]);
      setSchedulesError(null);
      setSelectedSchedule(null);
      setNumberOfPatients(1); // Reset jumlah pasien
      setSubmitError(null); // Reset error submit
    }
  };

  const handleScheduleSelect = (schedule) => {
    setSelectedSchedule(schedule);
    setNumberOfPatients(1); // Reset jumlah pasien ke 1 saat jadwal dipilih
  };

  const handleNumberOfPatientsChange = (e) => {
    const num = parseInt(e.target.value) || 1;
    const maxAllowed = selectedSchedule ? selectedSchedule.remaining_quota : 1;
    const clampedNum = Math.min(Math.max(num, 1), maxAllowed);

    setNumberOfPatients(clampedNum);
  };

  // --- 5. Fungsi untuk submit order ---
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setSubmitError(null); // Reset error sebelumnya
    setSubmitting(true); // Set loading state

    // Validasi dasar
    if (
      !selectedClinicId ||
      !selectedServiceId ||
      !selectedDate ||
      !selectedSchedule ||
      numberOfPatients <= 0
    ) {
      setSubmitError(
        "Harap lengkapi semua langkah dan tentukan jumlah pasien."
      );
      setSubmitting(false);
      return;
    }

    // Validasi jumlah pasien terhadap sisa kuota *di sisi client sebagai tambahan*
    if (numberOfPatients > selectedSchedule.remaining_quota) {
      setSubmitError(
        `Jumlah pasien melebihi kuota tersisa (${selectedSchedule.remaining_quota}).`
      );
      setSubmitting(false);
      return;
    }

    try {
      // Siapkan data untuk dikirim ke API
      const orderData = {
        clinic_id: parseInt(selectedClinicId),
        service_id: parseInt(selectedServiceId), // Kirim product_id sebagai service_id
        schedule_id: selectedSchedule.id, // Kirim ID jadwal yang dipilih
        patient_count: numberOfPatients, // Kirim jumlah pasien
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      let responseData;
      let responseText = "";

      try {
        responseText = await res.text();

        if (!responseText) {
          responseData = {};
        } else {
          responseData = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error("Gagal mem-parsing respons JSON dari API:", parseError);
        console.log("Respons teks yang diterima:", responseText);
        const fallbackMessage = res.ok
          ? "Respons tidak valid diterima dari server."
          : `HTTP Error ${res.status}: ${
              res.statusText || "Terjadi kesalahan jaringan."
            }`;

        throw new Error(fallbackMessage);
      }

      if (res.ok) {
        const orderId = responseData.id;
        if (orderId) {
          router.push(`/orders/detail/${orderId}`); // Redirect ke /orders/[id]
        } else {
          console.error("ID order tidak ditemukan dalam respons API.");
          setSubmitError("Order berhasil dibuat, tetapi ID tidak ditemukan.");
        }

        // Reset form hanya jika tidak redirect (jika orderId tidak ditemukan)
        if (!orderId) {
          setSelectedClinicId("");
          setSelectedServiceId("");
          setSelectedDate(new Date());
          setSchedules([]);
          setSelectedSchedule(null);
          setNumberOfPatients(1);
        }
      } else {
        const errorMessage =
          responseData.error ||
          `HTTP Error ${res.status}: ${res.statusText || "Permintaan gagal."}`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error("Error creating order:", err);
      // Ganti alert() dengan custom handling jika ini bukan aplikasi Next.js/Browser biasa
      // Di lingkungan ini, kita hanya akan mencatat error dan mengatur state error
      setSubmitError(err.message || "Terjadi kesalahan saat membuat order.");
      fetchSchedules(); // Panggil ulang untuk mendapatkan kuota terbaru
    } finally {
      setSubmitting(false); // Reset loading state
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">Memuat data awal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-green-50 min-h-screen">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-green-600 text-white py-1 px-3 rounded hover:bg-green-500"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-green-50 min-h-screen">
      <h1 className="text-2xl font-bold text-green-900 mb-6">
        Buat Order Baru
      </h1>

      <form onSubmit={handleSubmitOrder}>
        {/* --- Langkah 1 & 2: Pilih Klinik dan Layanan --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label
              htmlFor="clinic-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pilih Klinik
            </label>
            <select
              id="clinic-select"
              value={selectedClinicId}
              onChange={handleClinicChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="">-- Pilih Klinik --</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="service-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pilih Layanan
            </label>
            <select
              id="service-select"
              value={selectedServiceId}
              onChange={handleServiceChange}
              disabled={!selectedClinicId || loadingServices}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
              required
            >
              <option value="">-- Pilih Layanan --</option>
              {services.map((service) => (
                <option key={service.id} value={service.product_id}>
                  {" "}
                  {/* Kirim product_id sebagai service_id */}
                  {service.product
                    ? service.product.name
                    : `Produk ID: ${service.product_id}`}
                </option>
              ))}
            </select>
            {loadingServices && (
              <p className="text-xs text-gray-500 mt-1">Memuat layanan...</p>
            )}
            {servicesError && (
              <p className="text-red-500 text-xs mt-1">{servicesError}</p>
            )}
          </div>
        </div>

        {/* --- Langkah 3: Pilih Tanggal --- */}
        {selectedClinicId && selectedServiceId && (
          <div className="mb-6">
            <label
              htmlFor="date-picker"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pilih Tanggal
            </label>
            <DatePicker
              id="date-picker"
              selected={selectedDate}
              onChange={handleDateChange}
              dateFormat="dd/MM/yyyy"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
        )}

        {/* --- Langkah 4: Pilih Jadwal --- */}
        {selectedClinicId && selectedServiceId && selectedDate && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-green-800 mb-2">
              Pilih Jadwal
            </h2>
            {loadingSchedules && (
              <p className="text-green-800">Memuat daftar jadwal...</p>
            )}
            {schedulesError && (
              <p className="text-red-500 mb-2">{schedulesError}</p>
            )}
            {!loadingSchedules && schedules.length === 0 && !schedulesError && (
              <p className="mt-4">
                Tidak ada jadwal tersedia untuk filter yang dipilih.
              </p>
            )}
            {!loadingSchedules && schedules.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Waktu
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Kuota
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
                    {schedules.map((schedule) => {
                      const formattedStartTime = new Date(
                        schedule.start_time
                      ).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Jakarta",
                      });
                      const formattedEndTime = new Date(
                        schedule.end_time
                      ).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Jakarta",
                      });

                      return (
                        <tr
                          key={schedule.id}
                          className={`${
                            selectedSchedule?.id === schedule.id
                              ? "bg-green-50"
                              : ""
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formattedStartTime} - {formattedEndTime}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {schedule.remaining_quota} dari {schedule.max_quota}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              type="button"
                              onClick={() => handleScheduleSelect(schedule)}
                              disabled={schedule.remaining_quota < 1}
                              className={`px-3 py-1 rounded-md ${
                                selectedSchedule?.id === schedule.id
                                  ? "bg-green-700 text-white"
                                  : schedule.remaining_quota < 1
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-green-600 text-white hover:bg-green-500"
                              }`}
                            >
                              {selectedSchedule?.id === schedule.id
                                ? "Dipilih"
                                : schedule.remaining_quota < 1
                                ? "Full"
                                : "Pilih"}
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
        )}

        {/* --- Langkah 5: Tentukan Jumlah Pasien --- */}
        {selectedSchedule && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-green-200">
            <h2 className="text-xl font-semibold text-green-800 mb-2">
              Detail Jadwal Terpilih
            </h2>
            <p className="text-gray-700">
              <span className="font-medium">Layanan:</span>{" "}
              {selectedSchedule.product
                ? selectedSchedule.product.name
                : `Produk ID: ${selectedSchedule.product_id}`}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Waktu:</span>{" "}
              {new Date(selectedSchedule.start_time).toLocaleString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Jakarta",
              })}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Kuota Tersisa:</span>{" "}
              {selectedSchedule.remaining_quota}
            </p>

            <div className="mt-4">
              <label
                htmlFor="number-of-patients"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Jumlah Pasien (Max: {selectedSchedule.remaining_quota})
              </label>
              <input
                type="number"
                id="number-of-patients"
                min="1"
                max={selectedSchedule.remaining_quota}
                value={numberOfPatients}
                onChange={handleNumberOfPatientsChange}
                className="mt-1 block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>
        )}

        {/* --- Tombol Submit --- */}
        {selectedSchedule && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className={`py-2 px-6 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                submitting
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
              }`}
            >
              {submitting ? "Memproses..." : "Buat Order"}
            </button>
          </div>
        )}

        {/* --- Error Submit --- */}
        {submitError && (
          <p className="text-red-500 mt-4 text-center">{submitError}</p>
        )}
      </form>
    </div>
  );
}
