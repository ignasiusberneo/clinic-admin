// app/orders/detail/[id]/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AddItemModal from "./AddItemModal";
import RescheduleModal from "./RescheduleModal";

export default function OrderDetailPage() {
  const [order, setOrder] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]); // State untuk daftar metode pembayaran
  const [loading, setLoading] = useState(true);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false); // Loading untuk fetch metode pembayaran
  const [error, setError] = useState(null);
  const [paymentError, setPaymentError] = useState(null); // Error khusus untuk pembayaran
  const [isPaying, setIsPaying] = useState(false); // Loading untuk tombol bayar
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(""); // State untuk metode pembayaran terpilih
  const [paymentOption, setPaymentOption] = useState(""); // 'dp' atau 'full'

  const [additionalPaymentAmount, setAdditionalPaymentAmount] = useState("");
  const [
    selectedAdditionalPaymentMethodId,
    setSelectedAdditionalPaymentMethodId,
  ] = useState("");
  const [isAddingAdditionalPayment, setIsAddingAdditionalPayment] =
    useState(false);
  const [additionalPaymentError, setAdditionalPaymentError] = useState(null);

  // --- NEW STATES FOR ADD ITEM MODAL ---
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [itemToReschedule, setItemToReschedule] = useState(null);

  const openAddItemModal = () => setIsAddItemModalOpen(true);
  const closeAddItemModal = () => setIsAddItemModalOpen(false);
  const openRescheduleModal = (item) => {
    setItemToReschedule(item);
    setIsRescheduleModalOpen(true);
  };
  const closeRescheduleModal = () => {
    setItemToReschedule(null);
    setIsRescheduleModalOpen(false);
  };

  // ------------------------------------

  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId;

  // --- 1. Fetch detail order ---
  const fetchOrder = async () => {
    try {
      const orderRes = await fetch(`/api/orders/${orderId}`);

      if (orderRes.ok) {
        const orderData = await orderRes.json();
        // orderData sekarang berisi total_paid dan remaining_balance
        setOrder(orderData);
      } else {
        const errorData = await orderRes.json();
        setError(errorData.error || "Gagal memuat detail order.");
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
      setError("Terjadi kesalahan saat memuat data order.");
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId, router]);

  // --- 2. Fetch daftar metode pembayaran ---
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setLoadingPaymentMethods(true);
      setPaymentError(null); // Reset error saat fetch ulang

      try {
        const methodsRes = await fetch("/api/payment-methods"); // Ganti dengan endpoint API metode pembayaran Anda
        if (methodsRes.ok) {
          const methodsData = await methodsRes.json();
          setPaymentMethods(methodsData);
        } else {
          // Jika gagal fetch metode pembayaran, set array kosong atau gunakan fallback
          console.error(
            "Gagal memuat metode pembayaran:",
            await methodsRes.text()
          );
          setPaymentMethods([]); // Atau buat array fallback jika diperlukan
        }
      } catch (err) {
        console.error("Error fetching payment methods:", err);
        // Jika gagal fetch metode pembayaran, set array kosong atau gunakan fallback
        setPaymentMethods([]); // Atau buat array fallback jika diperlukan
        setPaymentError("Terjadi kesalahan saat memuat metode pembayaran.");
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    fetchPaymentMethods();
  }, [router]); // Fetch metode pembayaran saat komponen dimuat

  const handlePaymentOptionChange = (e) => {
    setPaymentOption(e.target.value);
  };

  const handleAddAdditionalPayment = async (e) => {
    e.preventDefault();
    setAdditionalPaymentError(null);
    setIsAddingAdditionalPayment(true);

    if (!selectedAdditionalPaymentMethodId) {
      setAdditionalPaymentError("Harap pilih metode pembayaran.");
      setIsAddingAdditionalPayment(false);
      return;
    }

    if (additionalPaymentAmount <= 0) {
      setAdditionalPaymentError("Jumlah pembayaran harus lebih besar dari 0.");
      setIsAddingAdditionalPayment(false);
      return;
    }

    const maxAllowed = order.remaining_balance;
    if (additionalPaymentAmount > maxAllowed) {
      setAdditionalPaymentError(
        `Jumlah pembayaran melebihi sisa pembayaran yang harus dibayar (Rp ${maxAllowed}).`
      );
      setIsAddingAdditionalPayment(false);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        // Ganti dengan endpoint yang benar untuk pembayaran tambahan
        method: "PATCH", // Gunakan PATCH untuk update pembayaran
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_method_id: selectedAdditionalPaymentMethodId,
          amount: additionalPaymentAmount,
          type: "additional", // Indikator bahwa ini adalah pembayaran tambahan
        }),
      });

      // --- Penanganan Error ---
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
        console.error(
          "Gagal mem-parsing respons JSON dari API pembayaran tambahan:",
          parseError
        );
        console.log("Respons teks yang diterima:", responseText);
        const fallbackMessage = res.ok
          ? "Respons tidak valid diterima dari server."
          : `HTTP Error ${res.status}: ${
              res.statusText || "Terjadi kesalahan jaringan."
            }`;

        throw new Error(fallbackMessage);
      }

      if (res.ok) {
        alert("Pembayaran berhasil diproses.");
        // Reset form pembayaran tambahan
        setSelectedAdditionalPaymentMethodId("");
        setAdditionalPaymentAmount("");
        const updatedOrderRes = await fetch(`/api/orders/${orderId}`);
        if (updatedOrderRes.ok) {
          const updatedOrderData = await updatedOrderRes.json();
          setOrder(updatedOrderData);
        } else {
          console.error(
            "Gagal memuat ulang data order setelah pembayaran:",
            await updatedOrderRes.text()
          );
          // Anda bisa memilih untuk reload halaman jika refetch gagal
          // window.location.reload();
        }
      } else {
        const errorMessage =
          responseData.error ||
          `HTTP Error ${res.status}: ${res.statusText || "Permintaan gagal."}`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error("Error adding additional payment:", err);
      setAdditionalPaymentError(
        err.message || "Terjadi kesalahan saat memproses pembayaran tambahan."
      );
    } finally {
      setIsAddingAdditionalPayment(false);
    }
  };

  // --- 3. Fungsi untuk memproses pembayaran ---
  const handlePayOrder = async (paymentType) => {
    if (!selectedPaymentMethodId) {
      setPaymentError("Harap pilih metode pembayaran.");
      return;
    }

    let amountToPay = 0;
    if (paymentType === "dp") {
      amountToPay = order.dp;
    } else if (paymentType === "full") {
      // Perubahan: Gunakan remaining_balance untuk bayar full
      amountToPay = order.remaining_balance;
    }

    if (amountToPay <= 0) {
      setPaymentError("Jumlah pembayaran harus lebih besar dari 0.");
      return;
    }

    setIsPaying(true);
    setPaymentError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "PATCH", // Gunakan PATCH untuk update status dan buat payment
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_method_id: selectedPaymentMethodId,
          amount: amountToPay,
          // payment_type: paymentType, // Jika API Anda memerlukan ini untuk menentukan status, kirimkan
        }),
      });

      // --- Penanganan Error ---
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
        console.error(
          "Gagal mem-parsing respons JSON dari API pembayaran:",
          parseError
        );
        console.log("Respons teks yang diterima:", responseText);
        const fallbackMessage = res.ok
          ? "Respons tidak valid diterima dari server."
          : `HTTP Error ${res.status}: ${
              res.statusText || "Terjadi kesalahan jaringan."
            }`;

        throw new Error(fallbackMessage);
      }

      if (res.ok) {
        alert(`Pembayaran berhasil diproses.`);
        // window.location.reload(); // <-- Kita ganti ini

        // Refetch order untuk mendapatkan data terbaru (termasuk remaining_balance yang diperbarui)
        const updatedOrderRes = await fetch(`/api/orders/${orderId}`);
        if (updatedOrderRes.ok) {
          const updatedOrderData = await updatedOrderRes.json();
          setOrder(updatedOrderData);
        } else {
          console.error(
            "Gagal memuat ulang data order setelah pembayaran:",
            await updatedOrderRes.text()
          );
          // Anda bisa memilih untuk reload halaman jika refetch gagal
          // window.location.reload();
        }
      } else {
        const errorMessage =
          responseData.error ||
          `HTTP Error ${res.status}: ${res.statusText || "Permintaan gagal."}`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error(`Error paying order (${paymentType}):`, err);
      setPaymentError(
        err.message || "Terjadi kesalahan saat memproses pembayaran."
      );
    } finally {
      setIsPaying(false);
    }
  };
  // --- Akhir Fungsi Pembayaran ---

  const checkAttendanceStatus = (status, attendanceStatus) => {
    let flag = false;
    if (status === "BELUM_LUNAS" || status === "SUDAH_LUNAS") {
      if (attendanceStatus === "PENDING") {
        flag = true;
      }
    }
    return flag;
  };

  const handleAdditionalPaymentAmountChange = (newAmount) => {
    // 1. Membersihkan input untuk hanya menyisakan angka
    const cleanString = newAmount.replace(/[^0-9]/g, "");
    let value = cleanString === "" ? 0 : parseInt(cleanString, 10);
    const max = order.remaining_balance;
    if (isNaN(value)) {
      value = 0;
    }

    if (value > max) {
      value = max;
    }

    setAdditionalPaymentAmount(value);
  };

  // --- Handler untuk Submit Pembayaran ---
  const handlePaySubmit = async (e) => {
    e.preventDefault(); // Mencegah refresh halaman jika tombol berada di dalam form

    // Validasi sebelum submit
    if (!selectedPaymentMethodId) {
      setPaymentError("Harap pilih metode pembayaran.");
      return;
    }
    if (!paymentOption) {
      setPaymentError("Harap pilih jenis pembayaran (DP atau Full).");
      return;
    }

    // Panggil fungsi handlePayOrder dengan paymentOption yang dipilih
    handlePayOrder(paymentOption);
  };

  // --- 4. Fungsi untuk membatalkan order ---
  const handleCancelOrder = async () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan order ini?")) {
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "PATCH",
      });

      if (res.ok) {
        alert("Order berhasil dibatalkan.");
        fetchOrder();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Gagal membatalkan order.");
        fetchOrder();
      }
    } catch (err) {
      console.error("Error cancelling order:", err);
      setError("Terjadi kesalahan saat membatalkan order.");
    }
  };
  const handleUpdateAttendance = async () => {
    if (
      !confirm(
        "Apakah Anda yakin ingin menandai pasien tidak hadir pada order ini?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/update-attendance`, {
        method: "PATCH",
      });

      if (res.ok) {
        alert("Order berhasil ditandai sebagai tidak hadir.");
        fetchOrder();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Gagal.");
        fetchOrder();
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menandai pasien tidak hadir.");
    }
  };
  // --- Akhir Fungsi Pembatalan ---

  if (loading) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">Memuat detail order...</p>
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

  if (!order) {
    router.push("/orders"); // Arahkan ke daftar order jika tidak ditemukan
    return null;
  }

  return (
    <div className="p-6 bg-green-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-green-900">Detail Order</h1>
          {!order.total_paid && (
            <button
              onClick={handleCancelOrder}
              className="px-4 py-2 font-semibold bg-red-500 text-white rounded-md hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Batalkan Order
            </button>
          )}
          {/* {checkAttendanceStatus(order.status, order.attendance_status) && (
            <button
              onClick={handleUpdateAttendance}
              className="px-4 py-2 font-semibold bg-red-500 text-white rounded-md hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Tandai Tidak Hadir
            </button>
          )} */}
        </div>

        {order.status === "CANCELLED" && (
          <div className="mb-6 p-4 bg-red-50 rounded-md border border-red-200">
            <p className="text-red-600 font-semibold">
              Order ini telah dibatalkan.
            </p>
          </div>
        )}

        {order.status !== "CANCELLED" &&
          order.attendance_status === "NO_SHOW" && (
            <div className="mb-6 p-4 bg-red-50 rounded-md border border-red-200">
              <p className="text-red-600 font-semibold">
                Pasien dinyatakan tidak hadir.
              </p>
            </div>
          )}

        {/* Informasi Umum Order */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            Informasi Order
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 font-bold">
                <span className="font-medium">ID Order:</span> {order.id}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Klinik:</span>{" "}
                {order.business_area?.name || `ID: ${order.clinic_id}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Status:</span>
                <span
                  className={`font-semibold ml-2 ${
                    order.status === "BELUM_BAYAR"
                      ? "text-yellow-600"
                      : order.status === "BELUM_LUNAS"
                      ? "text-blue-600"
                      : order.status === "SUDAH_LUNAS"
                      ? "text-green-600"
                      : order.status === "CANCELLED"
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {order.status.replace("_", " ")}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Total Harga:</span>{" "}
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(order.total_price)}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Total Dibayar:</span>{" "}
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(order.total_paid)}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Sisa Pembayaran:</span>{" "}
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(order.remaining_balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Daftar Item Order */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-green-800">Item Order</h2>
            {order.status !== "BELUM_BAYAR" &&
              order.status !== "CANCELLED" &&
              order.attendance_status !== "NO_SHOW" && (
                <button
                  onClick={openAddItemModal}
                  className="px-4 py-2 font-semibold bg-green-500 text-white rounded-md hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Tambah Item
                </button>
              )}
          </div>
          {order.order_items && order.order_items.length > 0 ? (
            <ul className="space-y-4">
              {order.order_items.map((item) => {
                const schedule = item?.schedule;
                const product = item?.product;

                let formattedStartTime;
                let formattedEndTime;

                if (schedule) {
                  formattedStartTime = new Date(
                    schedule.start_time
                  ).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  formattedEndTime = new Date(
                    schedule.end_time
                  ).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                }

                return (
                  <li
                    key={item.id}
                    className="p-4 bg-white rounded border border-green-200"
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Produk:</span>{" "}
                          {product?.name || `Produk ID: ${product?.id}`}
                        </p>
                        {product.type === "SERVICE" && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Tanggal Jadwal:</span>{" "}
                            {new Date(schedule.start_time).toLocaleDateString(
                              "id-ID",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                        )}
                        {product.type === "SERVICE" && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Waktu Jadwal:</span>{" "}
                            {formattedStartTime} - {formattedEndTime}
                          </p>
                        )}

                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Quantity:</span>{" "}
                          {product.type === "GOOD"
                            ? item.unit_used === "LARGE"
                              ? `${item.quantity} ${product.big_unit_name}`
                              : `${item.quantity} ${product.small_unit_name}`
                            : item.quantity}
                        </p>
                        {order.status !== "CANCELLED" &&
                          order.status !== "BELUM_BAYAR" &&
                          product.type === "SERVICE" &&
                          !item.is_assigned &&
                          order.attendance_status !== "NO_SHOW" && (
                            <div className="flex space-x-2">
                              <Link
                                href={`/orders/detail/${order.id}/${item.id}`} // <-- Redirect ke halaman baru
                                className="px-3 py-1 mt-2 bg-blue-500 w-fit text-center text-white rounded-md hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                Tambahkan Data Pasien
                              </Link>
                              <button
                                className="px-3 py-1 mt-2 bg-green-500 w-fit text-center text-white rounded-md hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                onClick={() => openRescheduleModal(item)}
                              >
                                Reschedule
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-600">Tidak ada item dalam order ini.</p>
          )}
        </div>

        {/* --- Bagian Pembayaran & Pembatalan --- */}
        {order.status === "BELUM_BAYAR" && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-md border border-yellow-200">
            <h3 className="font-medium text-gray-800 mb-2">Pembayaran:</h3>

            {/* Dropdown Metode Pembayaran */}
            <div className="mb-4">
              <label
                htmlFor="payment-method"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Pilih Metode Pembayaran
              </label>
              <select
                id="payment-method"
                value={selectedPaymentMethodId}
                onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                disabled={loadingPaymentMethods}
                className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                required // Tambahkan required jika pembayaran wajib sebelum submit utama
              >
                <option value="">-- Pilih Metode --</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
              {loadingPaymentMethods && (
                <p className="text-xs text-gray-500 mt-1">
                  Memuat metode pembayaran...
                </p>
              )}
            </div>

            {/* Radio Button untuk Pilihan Pembayaran */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Jenis Pembayaran
              </label>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="payment_option"
                    value="dp"
                    checked={paymentOption === "dp"}
                    onChange={handlePaymentOptionChange}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm">
                    Bayar DP (
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(order.dp)}
                    )
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="payment_option"
                    value="full"
                    checked={paymentOption === "full"}
                    onChange={handlePaymentOptionChange}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm">
                    Bayar Full (
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(order.remaining_balance)}
                    )
                  </span>
                </label>
              </div>
            </div>

            {/* Tombol Submit Pembayaran */}
            <div className="flex justify-start mt-4">
              <button
                type="button" // Gunakan type="button" agar tidak mengirim form utama
                onClick={handlePaySubmit} // Panggil handler submit pembayaran
                disabled={
                  !selectedPaymentMethodId || !paymentOption || isPaying
                } // Nonaktifkan jika tidak lengkap atau sedang loading
                className={`py-2 px-4 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  !selectedPaymentMethodId || !paymentOption || isPaying
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                }`}
              >
                {isPaying ? "Memproses..." : "Bayar"}
              </button>
            </div>

            {/* Error Pembayaran */}
            {paymentError && (
              <p className="text-red-500 text-sm mt-1">{paymentError}</p>
            )}
          </div>
        )}

        {/* --- Info Status Pembayaran Jika Sudah Dibayar --- */}

        {order.status === "BELUM_LUNAS" &&
          order.attendance_status !== "NO_SHOW" && (
            <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
              <h3 className="font-medium text-gray-800 mb-2">
                Status Pembayaran
              </h3>
              <p className="text-gray-700">
                Order ini{" "}
                <span className="font-semibold text-blue-600">BELUM LUNAS</span>
              </p>
              <p className="text-red-600 font-medium mt-1">
                Sisa Pembayaran:{" "}
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(order.remaining_balance)}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                Jumlah yang sudah dibayar:{" "}
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(order.total_paid)}
              </p>

              {/* --- Div Pembayaran Tambahan --- */}
              <div className="mt-4 p-3 bg-white rounded border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">
                  Lanjutkan Pembayaran
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Bayar sisa tagihan.
                </p>

                {additionalPaymentError && (
                  <p className="text-red-500 text-sm mb-2">
                    {additionalPaymentError}
                  </p>
                )}

                <form onSubmit={handleAddAdditionalPayment}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                    <div>
                      <label
                        htmlFor="additional-payment-method"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Metode Pembayaran
                      </label>
                      <select
                        id="additional-payment-method"
                        value={selectedAdditionalPaymentMethodId}
                        onChange={(e) =>
                          setSelectedAdditionalPaymentMethodId(e.target.value)
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                      >
                        <option value="">-- Pilih Metode --</option>
                        {paymentMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="additional-payment-amount"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Jumlah Pembayaran (Max:{" "}
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(order.remaining_balance)}
                        )
                      </label>
                      <input
                        type="text"
                        id="additional-payment-amount"
                        value={additionalPaymentAmount}
                        onChange={(e) =>
                          handleAdditionalPaymentAmountChange(e.target.value)
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                      />
                      {/* <input
                      type="number"
                      id="additional-payment-amount"
                      min="1"
                      max={order.remaining_balance} // Batasi maksimal ke sisa pembayaran
                      value={additionalPaymentAmount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const maxAllowed = order.remaining_balance;
                        setAdditionalPaymentAmount(
                          Math.min(Math.max(val, 0), maxAllowed)
                        );
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    /> */}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isAddingAdditionalPayment ||
                      !selectedAdditionalPaymentMethodId ||
                      !additionalPaymentAmount
                    }
                    className={`py-2 px-4 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isAddingAdditionalPayment ||
                      !selectedAdditionalPaymentMethodId ||
                      additionalPaymentAmount <= 0
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                    }`}
                  >
                    {isAddingAdditionalPayment ? "Memproses..." : "Bayar"}
                  </button>
                </form>
              </div>
              {/* --- Akhir Div Pembayaran Tambahan --- */}
            </div>
          )}

        {order.status === "SUDAH_LUNAS" && (
          <div className="mb-6 p-4 bg-green-50 rounded-md border border-green-200">
            <h3 className="font-medium text-gray-800 mb-2">
              Status Pembayaran
            </h3>
            <p className="text-green-600 font-semibold">
              Order ini<span className="font-bold">SUDAH LUNAS</span>.
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Jumlah total yang dibayar:{" "}
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(order.total_paid)}
            </p>
          </div>
        )}
        {/* --- Akhir Info Status Pembayaran --- */}

        {/* Pesan jika order dibatalkan */}

        {/* Tombol Kembali */}
        <div className="flex justify-end">
          <button
            onClick={() => router.push("/orders")}
            className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Kembali
          </button>
        </div>
      </div>
      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={closeAddItemModal}
        orderId={order.id}
        businessAreaId={order?.business_area_id}
        fetchOrder={fetchOrder}
      />
      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={closeRescheduleModal}
        itemToReschedule={itemToReschedule}
      />
    </div>
  );
}
