import { useRouter } from "next/router";
import { useEffect, useState, useCallback, useMemo } from "react";

// Asumsi formatRupiah adalah fungsi helper yang sudah tersedia
const formatRupiah = (number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};

export default function AddOrderModal({ isOpen, onClose, router }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [products, setProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // BARU: State untuk data Klinik
  const [clinics, setClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState(""); // ID Klinik yang dipilih

  // BARU: Fungsi untuk memuat daftar Klinik
  const fetchClinics = async () => {
    try {
      // Ganti URL API ini sesuai dengan endpoint yang benar untuk daftar klinik
      const clinicsRes = await fetch(
        `/api/business-areas?exclude_head_office=1`
      );
      if (clinicsRes.ok) {
        const clinicsData = await clinicsRes.json();
        setClinics(clinicsData);
      } else {
        console.error("Gagal memuat daftar klinik.");
      }
    } catch (err) {
      console.error("Error fetching clinics:", err);
    }
  };

  // UBAH: Fungsi fetchProducts sekarang bergantung pada selectedClinicId
  const fetchProducts = useCallback(async () => {
    if (searchTerm.trim() === "" || !selectedClinicId) {
      setProducts([]);
      setIsSearching(false);
      return;
    }

    try {
      // UBAH: Tambahkan clinic_id ke query parameter
      const productsRes = await fetch(
        `/api/products?business_area_id=${selectedClinicId}&type=GOOD&q=${searchTerm}&limit=10`
      );
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const filteredProducts = productsData.filter(
          (p) => !selectedProducts.some((sp) => sp.id === p.id)
        );
        setProducts(filteredProducts);
      } else {
        console.error("Gagal memuat daftar produk.");
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, selectedProducts, selectedClinicId]); // Tambahkan selectedClinicId sebagai dependency

  // Debounce useEffect untuk pencarian (sekarang juga bergantung pada selectedClinicId)
  useEffect(() => {
    const delay = 500;
    const handler = setTimeout(() => {
      fetchProducts();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, fetchProducts]);

  // BARU: Muat daftar klinik saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      fetchClinics();
    }
  }, [isOpen]);

  // Reset form ketika modal dibuka/ditutup
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedProducts([]);
      setProducts([]);
      setErrorMessage(null);
      setIsSearching(false);
      setSelectedClinicId(""); // Reset ID klinik yang dipilih
      setClinics([]); // Reset daftar klinik
    }
  }, [isOpen]);

  // Handle ketika klinik berubah
  const handleClinicChange = (e) => {
    setSelectedClinicId(e.target.value);
    setSelectedProducts([]); // Kosongkan produk yang sudah dipilih
    setProducts([]); // Kosongkan hasil pencarian
    setSearchTerm(""); // Kosongkan kolom pencarian
    setErrorMessage(null);
  };

  // ... (Fungsi-fungsi lain: handleSubmit, handleSelectProduct, handleRemoveProduct, handleQuantityChange, handleUnitTypeChange, handleChangeSearchTerm, handleClose) tetap sama ...

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0) {
      setErrorMessage("Silakan pilih minimal satu produk.");
      return;
    }
    const hasInvalidQuantity = selectedProducts.some(
      (p) => !p.orderQuantity || p.orderQuantity <= 0
    );
    if (hasInvalidQuantity) {
      setErrorMessage("Semua produk yang dipilih harus memiliki Quantity > 0.");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log(selectedProducts);
      const itemsPayload = selectedProducts.map((p) => ({
        productId: parseInt(p.id),
        // Pastikan Anda mengirim clinicId/businessAreaId yang relevan ke API
        unitConversion: parseInt(p.unit_conversion),
        price:
          p.orderUnitType === "LARGE"
            ? parseInt(p.tariff)
            : parseInt(p.small_unit_tariff),
        businessAreaId: parseInt(selectedClinicId),
        orderQuantity: parseInt(p.orderQuantity),
        orderUnitType: p.orderUnitType,
      }));

      const res = await fetch(`/api/orders/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_area_id: selectedClinicId,
          products: itemsPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(data);
        alert("Produk berhasil ditambahkan!");
        handleClose();
        router.push(`/orders/detail/${data.id}`);
      } else {
        const errorData = await res.json();
        setErrorMessage(
          errorData.error ||
            "Gagal menambahkan produk. Cek konsol untuk detail."
        );
        console.error("API Error:", errorData);
      }
    } catch (error) {
      setErrorMessage("Terjadi kesalahan jaringan/server.");
      console.error("Submit Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectProduct = (product) => {
    if (selectedProducts.some((p) => p.id === product.id)) {
      return;
    }

    const newProduct = {
      ...product,
      orderQuantity: 1,
      orderUnitType: "LARGE",
    };

    setSelectedProducts((prev) => [...prev, newProduct]);
    setProducts([]);
    setSearchTerm("");
    setErrorMessage(null);
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
    setErrorMessage(null);
  };

  const handleQuantityChange = (productId, quantity) => {
    const cleanString = quantity.replace(/[^0-9]/g, "");

    let value = cleanString === "" ? 0 : parseInt(cleanString, 10);

    // Jika input tidak valid (misalnya hanya '-' atau '+', tetapi sudah diatasi dengan regex di atas)
    if (isNaN(value)) {
      value = 0;
    }

    setSelectedProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, orderQuantity: value } : p))
    );
  };

  const handleUnitTypeChange = (productId, unitType) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, orderUnitType: unitType } : p
      )
    );
  };

  const handleChangeSearchTerm = (e) => {
    const value = e.target.value.toUpperCase();
    if (value === "") {
      setProducts([]);
      setIsSearching(false);
    } else {
      setIsSearching(true);
    }
    setSearchTerm(value);
  };

  const handleClose = () => {
    setProducts([]);
    setSelectedProducts([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-4 sm:p-6 transform transition-all duration-300 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-xl font-bold text-green-700">Buat Order</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl p-2 rounded-full hover:bg-gray-100 transition"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Error Message Display */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium border border-red-300">
              {errorMessage}
            </div>
          )}

          {/* BARU: Filter Pemilihan Klinik */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
              required
              disabled={clinics.length === 0}
            >
              <option value="" disabled>
                -- Pilih Klinik --
              </option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>

          <hr className="my-4" />

          {/* Product Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Produk untuk Ditambahkan
            </label>
            <input
              type="text"
              placeholder={
                selectedClinicId
                  ? "Masukkan nama produk..."
                  : "Pilih klinik terlebih dahulu..."
              }
              value={searchTerm}
              onChange={handleChangeSearchTerm}
              disabled={!selectedClinicId} // Disable jika klinik belum dipilih
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none ${
                !selectedClinicId
                  ? "bg-gray-100 cursor-not-allowed"
                  : "focus:ring-green-500 focus:border-green-500"
              }`}
            />

            {/* Product List/Results */}
            {products.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="p-2 cursor-pointer transition duration-150 hover:bg-green-50 text-gray-700 flex justify-between items-center"
                  >
                    <span>{product.name}</span>
                    <span className="text-green-600 text-xs font-semibold">
                      [+] Tambah
                    </span>
                  </div>
                ))}
              </div>
            )}
            {products.length === 0 && searchTerm && !isSearching && (
              <p className="p-3 text-sm text-gray-500 text-center">
                Produk tidak ditemukan.
              </p>
            )}
          </div>

          <hr className="my-4" />

          {/* Display Selected Products */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-green-700 mb-3">
              Produk Dipilih ({selectedProducts.length})
            </h3>
            {selectedProducts.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                Belum ada produk yang dipilih.
              </p>
            ) : (
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                {selectedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-gray-800 text-base">
                        {product.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(product.id)}
                        className="text-red-500 hover:text-red-700 text-lg p-1 rounded-full hover:bg-red-100 transition"
                        aria-label="Hapus Produk"
                      >
                        &times;
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Quantity Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Quantity
                        </label>
                        <input
                          type="text"
                          value={product.orderQuantity}
                          onChange={(e) =>
                            handleQuantityChange(product.id, e.target.value)
                          }
                          className="w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          required
                        />
                      </div>

                      {/* Unit Type Selection */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Satuan
                        </label>
                        {product.small_unit_tariff && (
                          <select
                            value={product.orderUnitType}
                            onChange={(e) =>
                              handleUnitTypeChange(product.id, e.target.value)
                            }
                            className="w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white"
                          >
                            <option value="LARGE">
                              {product.big_unit_name}
                            </option>
                            <option value="SMALL">
                              {product.small_unit_name}
                            </option>
                          </select>
                        )}
                        {!product.small_unit_tariff && (
                          <p>{product.big_unit_name}</p>
                        )}
                      </div>
                    </div>

                    {/* Price Display for item */}
                    <div className="mt-2 text-right">
                      <span className="text-xs text-gray-500">Subtotal: </span>
                      <span className="font-bold text-sm text-green-600">
                        {(() => {
                          const quantity = Number(product.orderQuantity);
                          let tariff = 0;

                          if (product.orderUnitType === "SMALL") {
                            tariff = product.small_unit_tariff;
                          } else {
                            tariff = product.tariff;
                          }
                          const total = quantity * tariff;
                          return formatRupiah(total);
                        })()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Price Summary */}
          {selectedProducts.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                Total Keseluruhan
              </h3>
              <p className="text-xl font-bold text-green-600">
                {formatRupiah(
                  selectedProducts.reduce((sum, p) => {
                    const quantity = Number(p.orderQuantity);
                    let tariff = 0;
                    if (p.orderUnitType === "SMALL") {
                      tariff = p.small_unit_tariff;
                    } else {
                      tariff = p.tariff;
                    }
                    return sum + quantity * tariff;
                  }, 0)
                )}
              </p>
            </div>
          )}

          {/* Footer & Submit Button */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                selectedProducts.length === 0 ||
                selectedProducts.some(
                  (p) => !p.orderQuantity || p.orderQuantity <= 0
                ) ||
                isSubmitting
              }
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition ${
                selectedProducts.length === 0 ||
                selectedProducts.some(
                  (p) => !p.orderQuantity || p.orderQuantity <= 0
                ) ||
                isSubmitting
                  ? "bg-green-400 cursor-not-allowed opacity-75"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isSubmitting ? "Memproses..." : `Buat Order`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
