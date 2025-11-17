import { useEffect, useMemo, useState } from "react";

export default function AddItemModal({
  isOpen,
  onClose,
  orderId,
  businessAreaId,
  fetchOrder,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null); // State baru untuk pesan error
  const [products, setProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter products based on search term
  //   const filteredProducts = useMemo(() => {
  //     if (!searchTerm) return products;
  //     return products.filter((p) =>
  //       p.name.toLowerCase().includes(searchTerm.toLowerCase())
  //     );
  //   }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      const productsRes = await fetch(
        `/api/products?business_area_id=${businessAreaId}&type=GOOD&q=${searchTerm}&limit=10`
      );
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      } else {
        console.error("Gagal memuat daftar produk.");
        setProducts([]);
      }
      false;
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // 1. Definisikan delay untuk debounce (misalnya, 500ms)
    const delay = 500;

    // 2. Gunakan setTimeout untuk menunda pemanggilan fungsi
    const handler = setTimeout(() => {
      if (searchTerm.trim() !== "") {
        fetchProducts();
      } else {
        setIsSearching(false);
      }
    }, delay);

    // 3. Clear Timeout (Cleanup Function)
    // Ini adalah bagian penting dari debounce:
    // Jika searchTerm berubah sebelum 'delay' berakhir,
    // setTimeout sebelumnya akan dibatalkan (dibersihkan).
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedProduct(null);
      setErrorMessage(null); // Reset error message
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        productId: parseInt(selectedProduct.id),
        businessAreaId: parseInt(businessAreaId),
        orderQuantity: parseInt(selectedProduct.orderQuantity),
        orderUnitType: selectedProduct.orderUnitType,
      };
      const res = await fetch(`/api/orders/${orderId}/add-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Produk berhasil ditambahkan!");
        handleClose();
        fetchOrder();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Gagal menambahkan produk.");
      }
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi untuk membatalkan pilihan produk
  const handleDeselectProduct = () => {
    setProducts([]);
    setSelectedProduct(null);
    setSearchTerm("");
    setErrorMessage(null);
  };

  const handleQuantityChange = (quantity) => {
    // 1. Membersihkan input untuk hanya menyisakan angka
    const cleanString = quantity.replace(/[^0-9]/g, "");

    let value = cleanString === "" ? 0 : parseInt(cleanString, 10);

    // Jika input tidak valid (misalnya hanya '-' atau '+', tetapi sudah diatasi dengan regex di atas)
    if (isNaN(value)) {
      value = 0;
    }

    setSelectedProduct({
      ...selectedProduct,
      orderQuantity: value,
    });
  };

  const handleChangeSearchTerm = (e) => {
    if (e.target.value === "") {
      setProducts([]);
      setIsSearching(false);
    } else {
      setIsSearching(true);
    }
    setSearchTerm(e.target.value.toUpperCase());
  };

  const handleSelectProduct = (product) => {
    const tempProduct = product;
    tempProduct.orderQuantity = 1;
    tempProduct.orderUnitType = "LARGE";
    setSelectedProduct(tempProduct);
    setErrorMessage(null); // Clear any existing errors
  };

  const handleClose = () => {
    setProducts([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div
        // Penyesuaian Responsif:
        // 1. Mengubah padding internal menjadi p-4 (mobile) dan sm:p-6 (desktop)
        // 2. Menambahkan max-h-[90vh] dan overflow-y-auto untuk scroll vertikal jika konten terlalu panjang
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-4 sm:p-6 transform transition-all duration-300 max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-xl font-bold text-green-700">Tambah Item Baru</h2>
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

          {/* Product Search & Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Produk
            </label>
            <input
              type="text"
              disabled={selectedProduct}
              placeholder="Masukkan nama produk..."
              value={searchTerm}
              onChange={(e) => handleChangeSearchTerm(e)}
              // Menerapkan kelas visual saat disabled
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none ${
                selectedProduct
                  ? "bg-gray-100 cursor-not-allowed" // Kelas untuk tampilan disabled
                  : "focus:ring-green-500 focus:border-green-500" // Kelas aktif
              }`}
            />

            {/* Display Selected Product DENGAN TOMBOL CANCEL */}
            {selectedProduct && (
              <div className="mt-2 p-2 bg-green-100 text-green-800 text-sm rounded-md flex justify-between items-center">
                <p>
                  Dipilih:{" "}
                  <span className="font-semibold">{selectedProduct.name}</span>{" "}
                </p>
                <button
                  type="button"
                  onClick={handleDeselectProduct}
                  className="text-green-700 hover:text-red-600 ml-2 p-1 rounded-full hover:bg-green-200 transition"
                  aria-label="Batalkan Pilihan Produk"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Product List/Results */}
            {!selectedProduct && products.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className={`p-2 cursor-pointer transition duration-150 ${
                      selectedProduct?.id === product.id
                        ? "bg-green-50 font-medium text-green-800 border-l-4 border-green-500"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {product.name}
                  </div>
                ))}
                {products.length === 0 && searchTerm && !isSearching && (
                  <p className="p-3 text-sm text-gray-500 text-center">
                    Produk tidak ditemukan.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quantity Input */}
          {selectedProduct && (
            <div className="mb-4">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="quantity"
              >
                Quantity
              </label>
              <input
                type="text"
                value={selectedProduct.orderQuantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          )}

          {/* Unit Type Selection (Conditional for GOODS) */}
          {selectedProduct && selectedProduct.small_unit_tariff && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Satuan
              </label>
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="unit_type"
                    value="LARGE"
                    checked={selectedProduct.orderUnitType === "LARGE"}
                    onChange={() =>
                      setSelectedProduct({
                        ...selectedProduct,
                        orderUnitType: "LARGE",
                      })
                    }
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {selectedProduct.big_unit_name}
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="unit_type"
                    value="SMALL"
                    checked={selectedProduct.orderUnitType === "SMALL"}
                    onChange={() =>
                      setSelectedProduct({
                        ...selectedProduct,
                        orderUnitType: "SMALL",
                      })
                    }
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {selectedProduct.small_unit_name}
                  </span>
                </label>
              </div>
            </div>
          )}
          {selectedProduct && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                Total Harga
              </h3>
              {/* Asumsi Anda memiliki fungsi helper formatRupiah() untuk menampilkan format Rupiah */}
              <p className="text-xl font-bold text-green-600">
                {/* Logika untuk menghitung dan menampilkan total */}
                {(() => {
                  const quantity = Number(selectedProduct.orderQuantity);
                  let tariff = 0;

                  if (selectedProduct.orderUnitType === "SMALL") {
                    tariff = selectedProduct.small_unit_tariff;
                  } else {
                    // Default ke LARGE jika unit type tidak ada atau LARGE
                    tariff = selectedProduct.tariff;
                  }

                  const total = quantity * tariff;

                  // Menggunakan fungsi helper formatRupiah (Asumsi tersedia di scope komponen)
                  if (typeof formatRupiah === "function") {
                    return formatRupiah(total);
                  }

                  // Fallback jika formatRupiah tidak tersedia
                  return `Rp ${total.toLocaleString("id-ID")}`;
                })()}
              </p>
            </div>
          )}

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
                !selectedProduct ||
                !selectedProduct.orderQuantity ||
                isSubmitting
              }
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition ${
                !selectedProduct ||
                !selectedProduct.orderQuantity ||
                isSubmitting
                  ? "bg-green-400 cursor-not-allowed opacity-75"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isSubmitting ? "Memproses..." : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
