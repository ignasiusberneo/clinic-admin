import React, { useState, useEffect } from "react";

// Helper function untuk format Rupiah
const formatRupiah = (amount) => {
  if (isNaN(amount) || amount === null) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// --- DATA MOCK (Ganti dengan data asli Anda) ---
const MOCK_PRODUCT_INFO = {
  id: 42,
  business_area_id: 1,
  name: "Vitamin C 500mg (Box)",
  supplier_id: 10,
  supplier_name: "PT. Farmasi Jaya",
};
export default function PurchaseEntryModal({
  isOpen,
  onClose,
  product,
  fetchProducts,
}) {
  const [poNumber, setPoNumber] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0); // Harga beli per unit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [productInfo, setProductInfo] = useState(MOCK_PRODUCT_INFO); // Ganti dengan fetch asli

  // Reset state saat modal dibuka/ditutup
  useEffect(() => {
    if (!isOpen) {
      setPoNumber("");
      setQuantity(0);
      setPurchasePrice(0);
      setApiError(null);
    }
  }, [isOpen]);

  // Handler untuk input harga dan kuantitas (memastikan hanya angka)
  const handleNumberChange = (setter) => (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setter(value === "" ? 0 : parseInt(value, 10));
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (quantity <= 0 || purchasePrice <= 0) {
      setApiError("Kuantitas dan Harga Beli harus lebih dari 0.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Payload harus mencerminkan model purchase Anda
      const payload = {
        product_id: product.id,
        product_business_area_id: product.business_area_id,
        po_number: poNumber,
        quantity: quantity,
        total_amount: purchasePrice,
      };

      // Ganti URL ini dengan endpoint API POST Anda
      const res = await fetch(`/api/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Pembelian berhasil ditambahkan!");
        fetchProducts();
        handleClose();
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.error || "Gagal mencatat pembelian.";
        setApiError(errorMessage);
      }
    } catch (error) {
      console.error("Error submitting purchase:", error);
      setApiError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header Modal */}
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-xl font-bold text-green-700">
            Catat Pembelian Produk
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Tutup Modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Error Message Display */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium border border-red-300">
              <p className="font-semibold mb-1">Pencatatan Gagal:</p>
              {apiError}
            </div>
          )}

          {/* Info Produk (Wajib, karena purchase terikat ke product) */}
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-semibold text-gray-800">Produk:</p>
            <p className="text-lg font-bold text-green-700">{product.name}</p>
            <p className="text-sm text-gray-600">
              Supplier: {product.supplier ? product.supplier.name : "-"}
            </p>
          </div>

          {/* Field PO Number */}
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="po_number"
            >
              Nomor PO <span className="text-red-500">*</span>
            </label>
            <input
              id="po_number"
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Field Kuantitas (Quantity) */}
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="quantity"
            >
              Kuantitas Beli ({product.big_unit_name}){" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="quantity"
              type="text"
              value={quantity > 0 ? quantity : ""} // Tampilkan kosong jika 0
              onChange={handleNumberChange(setQuantity)}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Field Harga Beli Satuan (Purchase Price) */}
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="purchase_price"
            >
              Total Harga <span className="text-red-500">*</span>
            </label>
            <input
              id="purchase_price"
              type="text"
              value={
                purchasePrice > 0 ? purchasePrice.toLocaleString("id-ID") : ""
              } // Format angka untuk tampilan
              onChange={handleNumberChange(setPurchasePrice)}
              min="1"
              placeholder="Masukkan harga beli satuan"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Footer & Submit Button */}
          <div className="flex justify-end space-x-3">
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
                quantity <= 0 || purchasePrice <= 0 || !poNumber || isSubmitting
              }
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition ${
                quantity <= 0 || purchasePrice <= 0 || isSubmitting || !poNumber
                  ? "bg-green-400 cursor-not-allowed opacity-75"
                  : "bg-green-600 hover:bg-green-700 shadow-md"
              }`}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Pembelian"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
