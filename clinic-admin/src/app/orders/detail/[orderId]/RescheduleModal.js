import React, { useState, useEffect, useMemo } from "react";

const formatLocalDate = (dateObj) => {
  if (!(dateObj instanceof Date) || isNaN(dateObj)) {
    return "";
  }
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayDateString = () => {
  const today = new Date();
  // Menggunakan toISOString().slice(0, 10) adalah cara paling umum
  // untuk mendapatkan format YYYY-MM-DD, tetapi rentan terhadap zona waktu.
  // Cara yang lebih aman adalah:
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Bulan dimulai dari 0
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// --- Komponen Utama Modal ---

export default function RescheduleModal({
  isOpen,
  onClose,
  onSelectSchedule,
  itemToReschedule,
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSchedules = async () => {
    setIsLoading(true);

    try {
      // PERBAIKAN: Gunakan formatLocalDate untuk mengirim tanggal
      // berdasarkan waktu lokal yang dipilih pengguna (YYYY-MM-DD).;

      const schedulesRes = await fetch(
        `/api/schedules?business_area_id=${itemToReschedule.product_business_area_id}&product_id=${itemToReschedule.product_id}&date=${selectedDate}`
      );

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();

        setSchedules(schedulesData);
      } else {
        setSchedules([]);
      }
    } catch (err) {
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSchedules([]);
    setSelectedDate(getTodayDateString());
    onClose();
  };

  useEffect(() => {
    if (isOpen && itemToReschedule && selectedDate) {
      fetchSchedules();
    }
  }, [selectedDate, itemToReschedule]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // --- Handler Pemilihan Schedule ---

  //   const handleSelect = (schedule) => {
  //     onSelectSchedule(schedule);
  //     onClose();
  //   };

  const handleSubmit = async (id) => {
    if (!confirm("Apakah Anda yakin ingin reschedule ke sesi ini")) return;
    try {
      setIsSubmitting(true);
      const payload = {
        selected_schedule_id: id,
      };
      const res = await fetch(
        `/api/orders/${itemToReschedule.order_id}/items/${itemToReschedule.id}/reschedule`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        alert("Reschedule berhasil!");
        handleClose();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Gagal reschedule.");
        fetchSchedules();
      }
    } catch (error) {
      //   console.log(error)
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div
        // Menggunakan styling mirip referensi, dominan putih dengan aksen green-600
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-4 sm:p-6 transform transition-all duration-300 max-h-[90vh] overflow-y-auto"
      >
        {/* Header Modal */}
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-xl font-bold text-green-700">
            Pilih Jadwal Sesi
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl p-2 rounded-full hover:bg-gray-100 transition"
          >
            &times;
          </button>
        </div>

        {/* Filter Tanggal */}
        <div className="mb-4">
          <label
            className="block text-sm font-medium text-gray-700 mb-1"
            htmlFor="schedule-date"
          >
            Filter Tanggal:
          </label>
          <input
            id="schedule-date"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 w-full sm:w-auto"
          />
        </div>

        {/* Schedule List Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Sesi & Waktu
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Sisa Kuota
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Pilih</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Memuat jadwal...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Tidak ada jadwal yang tersedia pada tanggal ini.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule, index) => {
                  const isFull =
                    itemToReschedule.quantity > schedule.remaining_quota;
                  const remainingQuota = schedule.remaining_quota;

                  const formattedStartTime = new Date(
                    schedule.start_time
                  ).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const formattedEndTime = new Date(
                    schedule.end_time
                  ).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const scheduleStartTime = new Date(schedule.start_time);
                  const currentTime = new Date();

                  const isScheduleFuture = scheduleStartTime >= currentTime;

                  return (
                    <tr
                      key={schedule.id}
                      className="hover:bg-green-50/50 transition duration-100"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {`Sesi ${index + 1}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formattedStartTime} - {formattedEndTime}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isFull
                              ? "bg-red-100 text-red-800"
                              : remainingQuota <= 5
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {remainingQuota}
                        </span>
                      </td>
                      {isScheduleFuture &&
                        schedule.id !== itemToReschedule.schedule_id && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleSubmit(schedule.id)}
                              disabled={isFull}
                              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition ${
                                isFull
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : "bg-green-600 hover:bg-green-700 shadow-md"
                              }`}
                            >
                              {isFull ? "Penuh" : "Pilih"}
                            </button>
                          </td>
                        )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Modal (hanya berisi tombol tutup jika perlu) */}
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
