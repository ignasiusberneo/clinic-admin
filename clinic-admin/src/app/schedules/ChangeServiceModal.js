import { use, useEffect, useState } from "react";

export default function ChangeServiceModal({
  scheduleToEdit, // Asumsi ini berisi data schedule saat ini, termasuk service_id
  closeEditScheduleModal,
  isOpen,
  fetchSchedules,
}) {
  // ⭐ Tambahkan state untuk layanan yang dipilih
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [services, setServices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Asumsi: services adalah array [{ id: 1, name: 'Service A' }, ...]

  // useEffect untuk mengatur default value saat modal dibuka/scheduleToEdit berubah

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/services?product_id=${scheduleToEdit.product_id}&business_area_id=${scheduleToEdit.product_business_area_id}`
      );
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedServiceId("");
    setServices([]);
    closeEditScheduleModal();
  };

  useEffect(() => {
    if (scheduleToEdit && isOpen) {
      console.log(scheduleToEdit);

      setSelectedServiceId(scheduleToEdit.service.id);
      fetchServices();
    }
  }, [scheduleToEdit]);

  if (!isOpen) return null;

  // --- Handlers ---
  const handleSelectChange = (e) => {
    setSelectedServiceId(parseInt(e.target.value));
  };

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        newServiceId: selectedServiceId,
      };
      const res = await fetch(
        `/api/schedules/${scheduleToEdit.id}/change-service`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        alert("Layanan berhasil diubah!");
        fetchSchedules();
        handleClose();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Gagal mengubah layanan.");
      }
    } catch (error) {
      alert("Terjadi kesalahan saat mengubah layanan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm"
      onClick={handleClose} // Menutup modal saat klik di luar
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-sm mx-auto p-6 space-y-6 transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()} // Mencegah penutupan saat klik di dalam modal
      >
        {/* Header Modal */}
        <div className="flex justify-between items-start border-b pb-3">
          <h3 className="text-xl font-bold text-gray-900">Ubah Layanan</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
          >
            &times;
          </button>
        </div>

        {/* Body Modal (Form) */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="service-select"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Pilih Layanan
            </label>
            <select
              id="service-select"
              value={selectedServiceId}
              onChange={handleSelectChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 transition duration-150 text-gray-900 appearance-none bg-white"
              disabled={isSubmitting || isLoading}
            >
              {isLoading || services.length === 0 ? (
                <option disabled value="">
                  {isLoading ? "Memuat layanan..." : "-- Pilih Layanan --"}
                </option>
              ) : (
                // 2. OPSI DEFAULT UNTUK MENCEGAH SELECT DARI 'SELECTED SERVICE' YANG MUNGKIN TIDAK ADA
                // Hapus opsi ini jika Anda yakin `selectedServiceId` selalu merupakan ID layanan yang valid dan ada di `services`.
                <option disabled value="">
                  -- Pilih Layanan --
                </option>
              )}
              {/* Peta (map) daftar layanan di sini */}
              {services?.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Modal (Buttons) */}
        <div className="flex justify-end space-x-3 pt-3 border-t">
          <button
            onClick={handleClose}
            className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              !selectedServiceId ||
              isSubmitting ||
              selectedServiceId === scheduleToEdit?.service_id
            }
            className={`py-2 px-4 text-white rounded-lg transition text-sm font-medium ${
              !selectedServiceId ||
              isSubmitting ||
              selectedServiceId === scheduleToEdit?.service_id
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            }`}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-white inline"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Memproses...
              </>
            ) : (
              "Konfirmasi Perubahan"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
