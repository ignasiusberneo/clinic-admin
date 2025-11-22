"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ChangeServiceModal from "./ChangeServiceModal";
import OrderListModal from "./OrderListModal";

export default function SchedulesPage() {
  const [clinics, setClinics] = useState([]);
  const [products, setProducts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");
  // Pastikan DatePicker menggunakan waktu lokal saat diinisialisasi
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [error, setError] = useState(null);
  const [productsError, setProductsError] = useState(null);
  const [schedulesError, setSchedulesError] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState(null);
  const [isOrderListModalOpen, setIsOrderListModalOpen] = useState(false);
  const [orderScheduleId, setOrderScheduleId] = useState(null);
  const [isCreateScheduleModalOpen, setIsCreateScheduleModalOpen] =
    useState(false);
  const [isCreatingBook, setIsCreatingBook] = useState(false);

  // --- State untuk modal tambah jadwal ---
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false); // Mode bulk/tunggal
  const [singleSchedule, setSingleSchedule] = useState({
    start_time: "",
    end_time: "",
    max_quota: "",
  });
  const [bulkSchedules, setBulkSchedules] = useState([
    { start_time: "", end_time: "", max_quota: "" },
  ]);
  const [addScheduleError, setAddScheduleError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  // --- Akhir State Modal ---

  const router = useRouter();

  /**
   * FIX: Fungsi untuk memformat Date object menjadi string YYYY-MM-DD
   * menggunakan komponen waktu lokal untuk menghindari pergeseran UTC (UTC roll-back).
   * @param {Date} dateObj
   * @returns {string} Tanggal dalam format 'YYYY-MM-DD'
   */
  const formatLocalDate = (dateObj) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj)) {
      return "";
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  /**
   * Menggabungkan objek Date (mengambil tanggal) dengan string waktu HH:mm
   * dan mengembalikan DateTime string dalam format ISO dasar (YYYY-MM-DDTHH:mm:ss).
   * Penting: Fungsi ini menggunakan komponen waktu lokal.
   */
  const combineDateAndTime = (dateObj, timeStr) => {
    if (!dateObj || !timeStr) return null;

    const [hours, minutes] = timeStr.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    // Buat salinan tanggal
    const combinedDate = new Date(dateObj);
    // Atur jam dan menit menggunakan fungsi lokal
    combinedDate.setHours(hours, minutes, 0, 0);

    const pad = (num) => String(num).padStart(2, "0");
    const yyyy = combinedDate.getFullYear();
    const MM = pad(combinedDate.getMonth() + 1);
    const dd = pad(combinedDate.getDate());
    const HH = pad(combinedDate.getHours());
    const mm = pad(combinedDate.getMinutes());
    const ss = pad(combinedDate.getSeconds());

    // Mengembalikan string YYYY-MM-DDTHH:mm:ss
    // Catatan: Jika backend Anda secara eksplisit mengharapkan string UTC,
    // Anda mungkin perlu menyesuaikan ini, tetapi format ini biasanya lebih
    // aman untuk waktu lokal.
    return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}`;
  };

  // --- Fetch data awal (klinik) ---

  const checkSession = async () => {
    try {
      const sessionRes = await fetch("/api/check-session");
      const sessionData = await sessionRes.json();

      if (sessionRes.status !== 200 || !sessionData.authenticated) {
        await fetch("/api/logout", { method: "POST" });
        router.push("/login");
        return;
      }

      const userPermissions = sessionData.user.permissions;

      setUserPermissions(userPermissions);
    } catch (error) {
      console.error("Error checking session:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clinicsRes = await fetch(
          "/api/business-areas?exclude_head_office=1"
        );
        if (clinicsRes.ok) {
          const clinicsData = await clinicsRes.json();
          setClinics(clinicsData);
        } else {
          setError("Gagal memuat daftar klinik.");
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
  }, []);

  // --- Fetch products berdasarkan clinic_id ---
  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedClinicId) {
        setProducts([]);
        return;
      }

      setLoadingProducts(true);
      setProductsError(null);

      try {
        const productsRes = await fetch(
          `/api/products?business_area_id=${selectedClinicId}&type=SERVICE`
        );
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData);
          if (productsData.length > 0 && selectedProductId === "") {
            const uniqueKey = `${productsData[0].id}-${productsData[0].business_area_id}`;

            setSelectedProductId(uniqueKey);
            setSelectedProductName(productsData[0].name);
          }
        } else {
          setProductsError("Gagal memuat daftar layanan untuk klinik ini.");
          setProducts([]);
        }
      } catch (err) {
        setProductsError("Terjadi kesalahan saat memuat data layanan.");
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [selectedClinicId]);

  const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // --- Fetch schedules berdasarkan filter ---
  const fetchSchedules = useCallback(async () => {
    if (!selectedClinicId || !selectedProductId || !selectedDate) {
      setSchedules([]);
      return;
    }

    setLoadingSchedules(true);
    setSchedulesError(null);

    try {
      // PERBAIKAN: Gunakan formatLocalDate untuk mengirim tanggal
      // berdasarkan waktu lokal yang dipilih pengguna (YYYY-MM-DD).
      const formattedDate = formatLocalDate(selectedDate);

      const schedulesRes = await fetch(
        `/api/schedules?business_area_id=${selectedClinicId}&product_id=${
          selectedProductId.split("-")[0]
        }&date=${formattedDate}&timezone=${clientTimezone}`
      );

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        const schedulesWithQuantity = schedulesData.map((schedule) => ({
          ...schedule,
          quantity: "",
          productVariantId:
            schedule.product.productVariants.length > 0
              ? `${schedule.product.productVariants[0].id}-${schedule.product.productVariants[0].product_id}-${schedule.product.productVariants[0].product_business_area_id}`
              : "",
        }));

        setSchedules(schedulesWithQuantity);
      } else {
        const errorText = await schedulesRes.text();
        setSchedulesError(errorText || "Gagal memuat daftar jadwal.");
        setSchedules([]);
      }
    } catch (err) {
      setSchedulesError("Terjadi kesalahan saat memuat data jadwal.");
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  }, [selectedClinicId, selectedProductId, selectedDate]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleOpenOrderListModal = (id) => {
    setOrderScheduleId(id);
    setIsOrderListModalOpen(true);
  };

  const handleCloseOrderListModal = () => {
    setOrderScheduleId(null);
    setIsOrderListModalOpen(false);
  };

  // --- Handler untuk filter ---
  const handleClinicChange = (e) => {
    const clinicId = e.target.value;
    setSelectedClinicId(clinicId);
    setSelectedProductId("");
    setProductsError(null); // Reset error layanan
  };

  const handleProductChange = (e) => {
    const productId = e.target.value;
    const foundProduct = products.find((product) => {
      const tempId = parseInt(productId.split("-")[0]);
      const tempBusinessAreaId = parseInt(productId.split("-")[1]);
      return (
        product.id === tempId && product.business_area_id === tempBusinessAreaId
      );
    });
    setSelectedProductName(foundProduct.name);

    setSelectedProductId(productId);
  };

  const openBookScheduleModal = (
    scheduleId,
    quantity,
    serviceId,
    variantId
  ) => {
    // Simpan ID dan Quantity yang dipilih
    setSelectedSchedule({
      id: scheduleId,
      quantity: quantity,
      service_id: serviceId,
      productVariantId: variantId,
    });
    setIsBookModalOpen(true);
  };

  const openEditScheduleModal = (schedule) => {
    setScheduleToEdit(schedule);
    setIsEditModalOpen(true);
  };
  const closeEditScheduleModal = () => {
    setScheduleToEdit(null);
    setIsEditModalOpen(false);
  };

  const closeBookScheduleModal = () => {
    setIsBookModalOpen(false);
    setSelectedSchedule(null);
  };

  const handleQuantityChange = (scheduleId, newQuantity) => {
    // 1. Membersihkan input untuk hanya menyisakan angka
    const cleanString = newQuantity.replace(/[^0-9]/g, "");

    // 2. Jika string bersih kosong, atau input asli kosong, set 'value' ke 0 (sementara)
    // Kita akan memaksanya menjadi 1 di bagian validasi di bawah.
    let value = cleanString === "" ? 0 : parseInt(cleanString, 10);

    // Jika input tidak valid (misalnya hanya '-' atau '+', tetapi sudah diatasi dengan regex di atas)
    if (isNaN(value)) {
      value = 0;
    }

    setSchedules((prevSchedules) => {
      return prevSchedules.map((schedule) => {
        if (schedule.id === scheduleId) {
          const max = schedule.remaining_quota;

          // 3. Logika Validasi Batas

          if (value > max) {
            value = max;
          }

          return {
            ...schedule,
            quantity: value, // Perbarui kuantitas yang valid (selalu number)
          };
        }
        return schedule;
      });
    });
  };
  const handleVariantChange = (scheduleId, newVariantId) => {
    setSchedules((prevSchedules) => {
      return prevSchedules.map((schedule) => {
        if (schedule.id === scheduleId) {
          const max = schedule.remaining_quota;

          return {
            ...schedule,
            productVariantId: newVariantId,
          };
        }
        return schedule;
      });
    });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  // --- Handler untuk modal tambah jadwal ---
  const openAddScheduleModal = () => {
    if (!selectedClinicId || !selectedProductId) return;
    // Reset state modal
    setIsBulkMode(false);
    setSingleSchedule({ start_time: "", end_time: "", max_quota: "" });
    setBulkSchedules([{ start_time: "", end_time: "", max_quota: "" }]);
    setAddScheduleError(null);
    setIsAddModalOpen(true);
  };

  const closeAddScheduleModal = () => {
    setIsAddModalOpen(false);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setIsCreatingBook(true);

    try {
      const orderData = {
        business_area_id: parseInt(selectedClinicId),
        schedule_id: parseInt(selectedSchedule.id), // Kirim ID jadwal yang dipilih
        quantity: parseInt(selectedSchedule.quantity), // Kirim jumlah pasien
        service_id: parseInt(selectedSchedule.service_id),
        variant_id: selectedSchedule.productVariantId,
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
        alert("Order berhasil dibuat!");
        setIsBookModalOpen(false);

        router.push(`/orders/detail/${orderId}`);
      } else {
        const errorMessage =
          responseData.error ||
          `HTTP Error ${res.status}: ${res.statusText || "Permintaan gagal."}`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      alert(err.message);
      setIsBookModalOpen(false);
      fetchSchedules(); // Panggil ulang untuk mendapatkan kuota terbaru
    } finally {
      setIsCreatingBook(false);
    }
  };

  // --- Handler untuk mode bulk/single ---
  const toggleBulkMode = () => {
    setIsBulkMode(!isBulkMode);
    // Reset form saat toggle mode
    setSingleSchedule({ start_time: "", end_time: "", max_quota: "" });
    setBulkSchedules([{ start_time: "", end_time: "", max_quota: "" }]);
    setAddScheduleError(null);
  };

  // --- Handler untuk form single schedule ---
  const handleSingleScheduleChange = (e) => {
    const { name, value } = e.target;
    console.log(name, value);

    setSingleSchedule((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --- Handler untuk form bulk schedules ---
  const handleBulkScheduleChange = (index, e) => {
    const { name, value } = e.target;
    const updatedSchedules = [...bulkSchedules];
    updatedSchedules[index][name] = value;
    setBulkSchedules(updatedSchedules);
  };

  const addBulkScheduleRow = () => {
    setBulkSchedules([
      ...bulkSchedules,
      { start_time: "", end_time: "", max_quota: "" },
    ]);
  };

  const removeBulkScheduleRow = (index) => {
    if (bulkSchedules.length <= 1) return; // Minimal 1 baris
    const updatedSchedules = bulkSchedules.filter((_, i) => i !== index);
    setBulkSchedules(updatedSchedules);
  };

  const isAddScheduleButtonDisabled =
    !selectedClinicId ||
    !selectedProductId ||
    schedules.length > 0 ||
    loadingSchedules;
  // --- Fungsi untuk menambah jadwal ---
  const handleAddSchedule = async (e) => {
    console.log("MASUKK");
    e.preventDefault();
    setIsAdding(true);

    try {
      const body = {
        product_id: selectedProductId.split("-")[0],
        business_area_id: selectedClinicId,
        target_date: formatLocalDate(selectedDate),
      };

      // --- Pengiriman data ke API ---
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      let responseData = {};
      let responseText = "";

      try {
        responseText = await res.text();
        if (responseText) {
          responseData = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.log("Respons teks yang diterima:", responseText);
      }

      if (res.ok) {
        // Jika respons data ada, perbarui state jadwal
        alert("Jadwal berhasil ditambahkan!");
        fetchSchedules();

        setIsCreateScheduleModalOpen(false);
      } else {
        const errorMessage =
          responseData.error ||
          `HTTP Error ${res.status}: ${res.statusText || "Permintaan gagal."}`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      setAddScheduleError(
        err.message || "Terjadi kesalahan saat menambahkan jadwal."
      );
    } finally {
      setIsAdding(false);
    }
  };
  // --- Akhir Handler Modal ---

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
    <div className="p-6 bg-green-50 min-h-screen font-sans">
      <h1 className="text-3xl font-extrabold text-green-800 mb-6 border-b pb-2 border-green-200">
        Jadwal Layanan
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
        <h2 className="text-xl font-semibold text-green-700 mb-4">
          Filter Jadwal
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Filter Klinik */}
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
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 transition duration-150"
            >
              <option disabled value="">
                -- Pilih Klinik --
              </option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Layanan */}
          <div>
            <label
              htmlFor="product-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pilih Layanan
            </label>
            <select
              id="product-select"
              value={selectedProductId}
              onChange={handleProductChange}
              disabled={!selectedClinicId || loadingProducts}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:opacity-60 transition duration-150"
            >
              <option disabled value="">
                {loadingProducts ? "Memuat..." : "-- Pilih Layanan --"}
              </option>
              {products.map((product) => {
                const uniqueKey = `${product.id}-${product.business_area_id}`;

                return (
                  <option key={uniqueKey} value={uniqueKey}>
                    {product.name || ""}
                  </option>
                );
              })}
            </select>
            {productsError && (
              <p className="text-red-500 text-xs mt-1">{productsError}</p>
            )}
          </div>

          {/* Filter Tanggal */}
          <div>
            <label
              htmlFor="date-picker"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tanggal
            </label>
            <div className="flex items-center">
              {" "}
              {/* Tambahkan ini */}
              <DatePicker
                id="date-picker"
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="dd/MM/yyyy"
                // Hapus mt-1 jika ada konflik. Gunakan py-2 untuk tinggi yang sama
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 transition duration-150"
              />
            </div>
          </div>

          {/* Tombol Tambah Jadwal */}
          {userPermissions.includes("ADD_SCHEDULE") && (
            <div className="flex items-end">
              <button
                onClick={() => setIsCreateScheduleModalOpen(true)}
                disabled={isAddScheduleButtonDisabled}
                className={`w-full py-2 px-4 rounded-lg shadow-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 ${
                  !isAddScheduleButtonDisabled
                    ? "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Tambah Jadwal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tampilan Jadwal */}
      <div className="mt-8">
        {selectedClinicId && selectedProductId && (
          <h2 className="text-xl font-semibold text-green-700 mb-4">
            Jadwal Tersedia
          </h2>
        )}

        {schedulesError && (
          <p className="text-red-500 p-4 bg-red-100 rounded-lg mb-4">
            {schedulesError}
          </p>
        )}

        {loadingSchedules && (
          <p className="mt-4 text-green-800 p-4 bg-green-100 rounded-lg">
            Memuat daftar jadwal...
          </p>
        )}

        {!loadingSchedules && (
          <>
            {schedules.length === 0 &&
              selectedClinicId &&
              selectedProductId && (
                <p className="p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg">
                  Tidak ada jadwal yang ditemukan untuk filter yang dipilih.
                </p>
              )}
            {schedules.length !== 0 && (
              <div className="overflow-x-auto shadow-lg rounded-xl border border-green-100">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-green-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider"
                      >
                        Sesi
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider"
                      >
                        Waktu Layanan
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider"
                      >
                        Kuota Maks
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider"
                      >
                        Kuota Tersisa
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider"
                      >
                        Layanan
                      </th>
                      {userPermissions.includes("CHANGE_SCHEDULE_SERVICE") && (
                        <th
                          scope="col"
                          className="px-6 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider"
                        >
                          Edit
                        </th>
                      )}
                      {userPermissions.includes("CASHIER_ACCESS") && (
                        <th
                          scope="col"
                          className="px-6 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider"
                        >
                          Aksi
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {schedules.map((schedule, index) => {
                      // Logika formatting waktu
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
                          className="hover:bg-green-50 transition duration-150"
                        >
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-lg font-bold text-green-800">
                              Sesi {index + 1}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-lg font-bold text-green-800">
                              {formattedStartTime} - {formattedEndTime}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-lg font-bold text-green-800">
                              {schedule.max_quota}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-lg font-bold text-green-800">
                              {schedule.remaining_quota}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {schedule.product.productVariants.length === 0 && (
                              <div className="text-lg font-bold text-green-800">
                                {schedule.service.name}
                              </div>
                            )}
                            {schedule.product.productVariants.length > 0 && (
                              // <div className="text-lg font-bold text-green-800">
                              <select
                                value={schedule.productVariantId}
                                onChange={(e) =>
                                  handleVariantChange(
                                    schedule.id,
                                    e.target.value
                                  )
                                }
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 transition duration-150"
                              >
                                {schedule.product.productVariants.map(
                                  (variant) => {
                                    const uniqueKey = `${variant.id}-${variant.product_id}-${variant.product_business_area_id}`;
                                    const formattedPrice =
                                      new Intl.NumberFormat("id-ID", {
                                        style: "currency",
                                        currency: "IDR",
                                        minimumFractionDigits: 0,
                                      }).format(
                                        schedule.service.price + variant.price
                                      );

                                    return (
                                      <option key={uniqueKey} value={uniqueKey}>
                                        {`${variant.name} (${formattedPrice})`}
                                      </option>
                                    );
                                  }
                                )}
                              </select>
                              // </div>
                            )}
                            {schedule.product.productVariants.length === 0 && (
                              <div className="text-lg font-bold text-green-800">
                                (
                                {new Intl.NumberFormat("id-ID", {
                                  style: "currency",
                                  currency: "IDR",
                                  minimumFractionDigits: 0,
                                }).format(schedule.service.price)}
                                )
                              </div>
                            )}
                          </td>
                          {userPermissions.includes(
                            "CHANGE_SCHEDULE_SERVICE"
                          ) && (
                            <td className="text-center">
                              <button
                                onClick={() => openEditScheduleModal(schedule)}
                                className="py-2 px-4 rounded-lg shadow-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 bg-blue-600 text-white hover:bg-blue-500 focus:ring-green-500"
                              >
                                Edit
                              </button>
                            </td>
                          )}
                          {isScheduleFuture &&
                            userPermissions.includes("CASHIER_ACCESS") && (
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                {/* Hapus 'text-right' dari <td>, sisakan 'text-center' (atau kosongkan jika ingin mengikuti TH) */}

                                {/* 1. Pembungkus Flexbox: Ubah justify-end menjadi justify-center */}
                                <div className="flex items-center justify-center space-x-2">
                                  {/* 2. Input Quantity */}
                                  {schedule.remaining_quota > 0 && (
                                    <input
                                      type="text"
                                      value={schedule.quantity}
                                      onChange={(e) =>
                                        handleQuantityChange(
                                          schedule.id,
                                          e.target.value
                                        )
                                      }
                                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                      disabled={schedule.remaining_quota === 0}
                                    />
                                  )}

                                  {/* 3. Tombol Book */}
                                  <button
                                    onClick={() =>
                                      openBookScheduleModal(
                                        schedule.id,
                                        schedule.quantity,
                                        schedule.service_id,
                                        schedule.productVariantId
                                      )
                                    }
                                    disabled={
                                      schedule.remaining_quota <= 0 ||
                                      !schedule.quantity
                                    }
                                    className={`py-2 px-4 rounded-lg shadow-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 ${
                                      schedule.remaining_quota > 0 &&
                                      schedule.quantity // Menggunakan remaining_quota untuk styling, karena quantity selalu minimal 1 jika kuota > 0
                                        ? "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    }`}
                                  >
                                    {schedule.remaining_quota > 0
                                      ? "Book"
                                      : "Full"}
                                  </button>
                                </div>
                              </td>
                            )}
                          {!isScheduleFuture &&
                            userPermissions.includes("CASHIER_ACCESS") && (
                              <td className="text-center">
                                <button
                                  onClick={() =>
                                    handleOpenOrderListModal(schedule.id)
                                  }
                                  className="py-2 px-4 rounded-lg shadow-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 bg-blue-600 text-white hover:bg-blue-500 focus:ring-green-500"
                                >
                                  List Order
                                </button>
                              </td>
                            )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- Modal Tambah Jadwal --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-8 my-8 transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-2xl font-bold text-green-800">
                Tambah Jadwal ({formatLocalDate(selectedDate)})
              </h2>
              <button
                onClick={closeAddScheduleModal}
                className="text-gray-500 hover:text-red-700 text-3xl transition duration-150"
              >
                &times;
              </button>
            </div>

            {/* Toggle Mode Bulk/Single */}
            <div className="mb-6">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBulkMode}
                  onChange={toggleBulkMode}
                  className="w-5 h-5 rounded text-green-600 focus:ring-green-500 border-gray-300"
                />
                <span className="ml-2 text-base font-medium text-gray-700">
                  Mode Bulk
                </span>
              </label>
            </div>

            {/* Error di dalam modal */}
            {addScheduleError && (
              <p className="text-red-600 bg-red-100 p-3 rounded-lg mb-4 border border-red-300">
                {addScheduleError}
              </p>
            )}

            <form onSubmit={handleAddSchedule}>
              {!isBulkMode ? (
                // --- Form Single Schedule ---
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label
                      htmlFor="single-start_time"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Waktu Mulai
                    </label>
                    <input
                      type="time"
                      id="single-start_time"
                      name="start_time"
                      value={singleSchedule.start_time}
                      onChange={handleSingleScheduleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="single-end_time"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Waktu Selesai
                    </label>
                    <input
                      type="time"
                      id="single-end_time"
                      name="end_time"
                      value={singleSchedule.end_time}
                      onChange={handleSingleScheduleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="single-max_quota"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Kuota Maksimal
                    </label>
                    <input
                      type="number"
                      id="single-max_quota"
                      name="max_quota"
                      value={singleSchedule.max_quota}
                      onChange={handleSingleScheduleChange}
                      min="1"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isAdding}
                      className={`w-full py-2 px-4 rounded-md shadow-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 ${
                        isAdding
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                      }`}
                    >
                      {isAdding ? "Menyimpan..." : "Simpan Jadwal"}
                    </button>
                  </div>
                </div>
              ) : (
                // --- Form Bulk Schedules ---
                <>
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {bulkSchedules.map((sched, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-green-50 p-3 rounded-lg border border-green-200"
                      >
                        {/* Labels for first row only (visual aid) */}
                        {index === 0 && (
                          <div className="md:col-span-4 grid grid-cols-4 gap-4 mb-1 -mt-2 invisible md:visible text-xs text-gray-500 font-medium">
                            <span>Waktu Mulai</span>
                            <span>Waktu Selesai</span>
                            <span>Kuota Maksimal</span>
                            <span>Aksi</span>
                          </div>
                        )}

                        <div>
                          <label
                            htmlFor={`bulk-${index}-start_time`}
                            className="block text-sm font-medium text-gray-700 md:hidden"
                          >
                            Waktu Mulai
                          </label>
                          <input
                            type="time"
                            id={`bulk-${index}-start_time`}
                            name="start_time"
                            value={sched.start_time}
                            onChange={(e) => handleBulkScheduleChange(index, e)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`bulk-${index}-end_time`}
                            className="block text-sm font-medium text-gray-700 md:hidden"
                          >
                            Waktu Selesai
                          </label>
                          <input
                            type="time"
                            id={`bulk-${index}-end_time`}
                            name="end_time"
                            value={sched.end_time}
                            onChange={(e) => handleBulkScheduleChange(index, e)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`bulk-${index}-max_quota`}
                            className="block text-sm font-medium text-gray-700 md:hidden"
                          >
                            Kuota Maksimal
                          </label>
                          <input
                            type="number"
                            id={`bulk-${index}-max_quota`}
                            name="max_quota"
                            value={sched.max_quota}
                            onChange={(e) => handleBulkScheduleChange(index, e)}
                            min="1"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                            required
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => removeBulkScheduleRow(index)}
                            disabled={bulkSchedules.length <= 1}
                            className={`flex-1 py-2 px-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ${
                              bulkSchedules.length <= 1
                                ? "bg-gray-400 text-white cursor-not-allowed"
                                : "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500"
                            }`}
                            title="Hapus Jadwal"
                          >
                            Hapus
                          </button>
                          {index === bulkSchedules.length - 1 && (
                            <button
                              type="button"
                              onClick={addBulkScheduleRow}
                              className="flex-1 py-2 px-3 bg-green-500 text-white rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150"
                              title="Tambah Jadwal Lagi"
                            >
                              Tambah
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-6">
                    <button
                      type="submit"
                      disabled={isAdding}
                      className={`py-2 px-6 rounded-md shadow-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 ${
                        isAdding
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                      }`}
                    >
                      {isAdding ? "Menyimpan..." : "Simpan Semua Jadwal"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
      {/* --- Akhir Modal Tambah Jadwal --- */}

      {isBookModalOpen && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="relative bg-white rounded-lg shadow-xl max-w-sm mx-auto p-6">
            {/* Header Modal */}
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Konfirmasi Pemesanan
            </h3>
            <button
              onClick={closeAddScheduleModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
            >
              &times;
            </button>

            {/* Body / Pesan Konfirmasi */}
            <div className="text-gray-700 mb-6">
              Anda akan memesan {selectedSchedule.quantity} slot untuk jadwal
              ini.
              <p className="mt-2 text-sm text-gray-500">
                Lanjutkan proses pemesanan?
              </p>
            </div>

            {/* Footer / Tombol Aksi */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeBookScheduleModal}
                className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={isCreatingBook}
                className={`py-2 px-4 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition ${
                  isCreatingBook
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                }`}
              >
                {isCreatingBook ? "Memproses..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isCreateScheduleModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="relative bg-white rounded-lg shadow-xl max-w-sm mx-auto p-6">
            {/* Header Modal */}
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Konfirmasi Pembuatan Jadwal
            </h3>
            <button
              onClick={closeAddScheduleModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
            >
              &times;
            </button>

            {/* Body / Pesan Konfirmasi */}
            <div className="text-gray-700 mb-6">
              Anda akan membuat jadwal {selectedProductName} untuk jadwal
              tanggal {formatLocalDate(selectedDate)}.
              <p className="mt-2 text-sm text-gray-500">
                Lanjutkan proses pembuatan jadwal?
              </p>
            </div>

            {/* Footer / Tombol Aksi */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsCreateScheduleModalOpen(false)}
                className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Batal
              </button>
              <button
                onClick={handleAddSchedule}
                disabled={isAdding}
                className={`py-2 px-4 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition ${
                  isAdding
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                }`}
              >
                {isAdding ? "Memproses..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ChangeServiceModal
        isOpen={isEditModalOpen}
        closeEditScheduleModal={closeEditScheduleModal}
        scheduleToEdit={scheduleToEdit}
        fetchSchedules={fetchSchedules}
      />
      <OrderListModal
        isOpen={isOrderListModalOpen}
        onClose={handleCloseOrderListModal}
        scheduleId={orderScheduleId}
      />
    </div>
  );
}
