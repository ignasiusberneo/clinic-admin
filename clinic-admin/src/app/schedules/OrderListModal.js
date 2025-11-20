import React, { useState, useEffect } from "react";

const getStatusClasses = (status) => {
  switch (status) {
    case "HAS_ATTENDED":
      return "bg-green-100 text-green-800 border-green-300";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "NO_SHOW":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};
const getStatusClassesName = (status) => {
  switch (status) {
    case "HAS_ATTENDED":
      return "DATANG";
    case "PENDING":
      return "PENDING";
    case "NO_SHOW":
      return "TIDAK DATANG";
    default:
      return "";
  }
};

// --- Komponen Utama Modal ---

export default function OrderListModal({ isOpen, onClose, scheduleId }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/orders?schedule_id=${scheduleId}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOrders([]);
    onClose();
  };

  const handleChangeStatus = async (orderId) => {
    if (!confirm("Apakah Anda yakin ingin menyatakan pasien tidak hadir?"))
      return;
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/orders/${orderId}/update-attendance`, {
        method: "PATCH",
      });
      if (response.ok) {
        alert("Pasien berhasil ditandai sebagai tidak hadir.");
        fetchOrders();
      }
    } catch (error) {
      alert("Terjadi kesalahan saat menyatakan pasien tidak hadir.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (scheduleId) {
      fetchOrders();
    }
  }, [scheduleId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm"
      onClick={handleClose} // Menutup modal saat klik di luar
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-auto flex flex-col h-[90vh] max-h-[800px] transform transition-all duration-300 scale-100 ring-2 ring-green-500/50"
        onClick={(e) => e.stopPropagation()} // Mencegah penutupan saat klik di dalam modal
      >
        {/* Header Modal */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Daftar Order
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Tutup Modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body Modal (List Konten) - Scrollable */}
        <div className="flex-grow p-5 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <svg
                className="animate-spin h-8 w-8 text-green-500 mb-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
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
              <p>Memuat data pesanan...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center p-10 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <p className="text-gray-500 dark:text-gray-400">
                Tidak ada pesanan.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md hover:shadow-lg transition duration-200 bg-white dark:bg-gray-800"
              >
                {/* Detail Kiri: ID & Pelanggan */}
                <div className="mb-2 sm:mb-0">
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    {order.id}
                  </p>
                </div>

                {/* Detail Kanan: Status & Total */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-medium border rounded-full px-3 py-1 ${getStatusClasses(
                        order.attendance_status
                      )}`}
                    >
                      {getStatusClassesName(order.attendance_status)}
                    </span>
                    {order.attendance_status === "PENDING" && (
                      <button
                        onClick={() => handleChangeStatus(order.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 p-1 rounded-full transition-colors duration-150 border border-red-300 dark:border-red-500 hover:bg-red-50 dark:hover:bg-red-900"
                        disabled={isSubmitting}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Modal (Actions) */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={handleClose}
            className="py-2 px-5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm font-semibold shadow-md"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Komponen Demo App ---
