import { useEffect, useState } from "react";

export default function AddServiceModal({
  handleAddService,
  newService,
  handleAddInputChange,
  products,
  closeAddModal,
  isAddModalOpen,
  loadingProducts,
  businessAreaId,
  fetchServices,
}) {
  const [newJasa, setNewJasa] = useState(null);
  const [newBarang, setNewBarang] = useState(null);
  const [searchTermJasa, setSearchTermJasa] = useState("");
  const [searchTermBarang, setSearchTermBarang] = useState("");
  const [jasaProducts, setJasaProducts] = useState([]);
  const [barangProducts, setBarangProducts] = useState([]);
  const [isSearchingJasa, setIsSearchingJasa] = useState(false);
  const [isSearchingBarang, setIsSearchingBarang] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCloseModal = () => {
    setNewJasa(null);
    setNewBarang(null);
    setSearchTermJasa("");
    setSearchTermBarang("");
    setBarangProducts([]);
    setJasaProducts([]);
    closeAddModal();
  };

  const handleSubmit = async (e) => {
    try {
      setIsSubmitting(true);
      const productToSubmit = [];
      productToSubmit.push({
        id: newJasa.id,
        business_area_id: newJasa.business_area_id,
        quantity: newJasa.serviceQuantity,
        unit_type: newJasa.serviceUnitType,
      });
      if (newBarang) {
        productToSubmit.push({
          id: newBarang.id,
          business_area_id: newBarang.business_area_id,
          quantity: newBarang.serviceQuantity,
          unit_type: newBarang.serviceUnitType,
        });
      }

      const payload = {
        name: newService.name,
        price: parseInt(newService.price),
        business_area_id: businessAreaId,
        products: productToSubmit,
      };
      const res = await fetch(`/api/services/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Service berhasil ditambahkan!");
        handleCloseModal();
        fetchServices();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Gagal menambahkan service.");
      }
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuantityChange = (quantity) => {
    // 1. Membersihkan input untuk hanya menyisakan angka
    const cleanString = quantity.replace(/[^0-9]/g, "");

    let value = cleanString === "" ? 0 : parseInt(cleanString, 10);

    // Jika input tidak valid (misalnya hanya '-' atau '+', tetapi sudah diatasi dengan regex di atas)
    if (isNaN(value)) {
      value = 0;
    }

    setNewBarang({
      ...newBarang,
      serviceQuantity: value,
    });
  };

  const handleChangeSearchTermBarang = (e) => {
    if (e.target.value === "") {
      setBarangProducts([]);
      setIsSearchingBarang(false);
    } else {
      setIsSearchingBarang(true);
    }
    setSearchTermBarang(e.target.value.toUpperCase());
  };

  const handleChangeSearchTermJasa = (e) => {
    if (e.target.value === "") {
      setJasaProducts([]);
      setIsSearchingJasa(false);
    } else {
      setIsSearchingJasa(true);
    }
    setSearchTermJasa(e.target.value.toUpperCase());
  };

  const handleDeselectProductBarang = () => {
    setBarangProducts([]);
    setNewBarang(null);
    setSearchTermBarang("");
  };

  const handleDeselectProductJasa = () => {
    setJasaProducts([]);
    setNewJasa(null);
    setSearchTermJasa("");
  };

  const handleSelectProductBarang = (product) => {
    const tempProduct = product;
    tempProduct.serviceQuantity = 1;
    tempProduct.serviceUnitType = "LARGE";
    setNewBarang(tempProduct);
  };
  const handleSelectProductJasa = (product) => {
    const tempProduct = product;
    tempProduct.serviceQuantity = 1;
    tempProduct.serviceUnitType = "LARGE";
    setNewJasa(tempProduct);
  };

  const fetchProductsBarang = async () => {
    try {
      const productsRes = await fetch(
        `/api/products?business_area_id=${businessAreaId}&type=GOOD&q=${searchTermBarang}&limit=10`
      );
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setBarangProducts(productsData);
      } else {
        console.error("Gagal memuat daftar produk.");
        setBarangProducts([]);
      }
      false;
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setIsSearchingBarang(false);
    }
  };
  const fetchProductsJasa = async () => {
    try {
      const productsRes = await fetch(
        `/api/products?business_area_id=${businessAreaId}&type=SERVICE&q=${searchTermJasa}&limit=10`
      );
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setJasaProducts(productsData);
      } else {
        console.error("Gagal memuat daftar produk.");
        setJasaProducts([]);
      }
      false;
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setIsSearchingJasa(false);
    }
  };

  useEffect(() => {
    // 1. Definisikan delay untuk debounce (misalnya, 500ms)
    const delay = 500;

    // 2. Gunakan setTimeout untuk menunda pemanggilan fungsi
    const handler = setTimeout(() => {
      if (searchTermBarang.trim() !== "") {
        fetchProductsBarang();
      } else {
        setIsSearchingBarang(false);
      }
    }, delay);

    // 3. Clear Timeout (Cleanup Function)
    // Ini adalah bagian penting dari debounce:
    // Jika searchTerm berubah sebelum 'delay' berakhir,
    // setTimeout sebelumnya akan dibatalkan (dibersihkan).
    return () => {
      clearTimeout(handler);
    };
  }, [searchTermBarang]);

  useEffect(() => {
    // 1. Definisikan delay untuk debounce (misalnya, 500ms)
    const delay = 500;

    // 2. Gunakan setTimeout untuk menunda pemanggilan fungsi
    const handler = setTimeout(() => {
      if (searchTermJasa.trim() !== "") {
        fetchProductsJasa();
      } else {
        setIsSearchingJasa(false);
      }
    }, delay);

    // 3. Clear Timeout (Cleanup Function)
    // Ini adalah bagian penting dari debounce:
    // Jika searchTerm berubah sebelum 'delay' berakhir,
    // setTimeout sebelumnya akan dibatalkan (dibersihkan).
    return () => {
      clearTimeout(handler);
    };
  }, [searchTermJasa]);

  if (!isAddModalOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-green-900 mb-4">
          Tambah Layanan Baru
        </h2>

        <form onSubmit={handleAddService}>
          {/* Field Nama Layanan */}
          <div className="mb-4">
            <label
              htmlFor="add-name"
              className="block text-sm font-medium text-gray-700"
            >
              Nama Layanan
            </label>
            <input
              type="text"
              id="add-name"
              name="name"
              value={newService.name}
              onChange={handleAddInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          {/* Field Harga Layanan */}
          <div className="mb-4">
            <label
              htmlFor="add-price"
              className="block text-sm font-medium text-gray-700"
            >
              Harga Layanan (Rp)
            </label>
            <input
              type="number"
              id="add-price"
              name="price"
              value={newService.price}
              onChange={handleAddInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jasa
            </label>
            {!newJasa && (
              <input
                type="text"
                disabled={newJasa}
                placeholder="Masukkan nama jasa..."
                value={searchTermJasa}
                onChange={(e) => handleChangeSearchTermJasa(e)}
                // Menerapkan kelas visual saat disabled
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none ${
                  newJasa
                    ? "bg-gray-100 cursor-not-allowed" // Kelas untuk tampilan disabled
                    : "focus:ring-green-500 focus:border-green-500" // Kelas aktif
                }`}
              />
            )}

            {/* Display Selected Product DENGAN TOMBOL CANCEL */}
            {newJasa && (
              <div className="mt-2 p-2 bg-green-100 text-green-800 text-sm rounded-md flex justify-between items-center">
                <p>
                  Dipilih: <span className="font-semibold">{newJasa.name}</span>{" "}
                  {`(Rp ${newJasa.tariff.toLocaleString("id-ID")})`}
                </p>
                <button
                  type="button"
                  onClick={handleDeselectProductJasa}
                  className="text-green-700 hover:text-red-600 ml-2 p-1 rounded-full hover:bg-green-200 transition"
                  aria-label="Batalkan Pilihan Produk"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Product List/Results */}
            {!newJasa && jasaProducts.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                {jasaProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProductJasa(product)}
                    className={`p-2 cursor-pointer transition duration-150 ${
                      newJasa?.id === product.id
                        ? "bg-green-50 font-medium text-green-800 border-l-4 border-green-500"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {product.name}
                  </div>
                ))}
              </div>
            )}
            {jasaProducts.length === 0 &&
              searchTermJasa &&
              !isSearchingJasa && (
                <p className="p-3 text-sm text-gray-500 text-center">
                  Jasa tidak ditemukan.
                </p>
              )}
          </div>
          {/* Field Multiple Select Produk (Checkboxes) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barang
            </label>
            {!newBarang && (
              <input
                type="text"
                disabled={newBarang}
                placeholder="Masukkan nama barang..."
                value={searchTermBarang}
                onChange={(e) => handleChangeSearchTermBarang(e)}
                // Menerapkan kelas visual saat disabled
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none ${
                  newBarang
                    ? "bg-gray-100 cursor-not-allowed" // Kelas untuk tampilan disabled
                    : "focus:ring-green-500 focus:border-green-500" // Kelas aktif
                }`}
              />
            )}

            {/* Display Selected Product DENGAN TOMBOL CANCEL */}
            {newBarang && (
              <div className="mt-2 p-2 bg-green-100 text-green-800 text-sm rounded-md flex justify-between items-center">
                <p>
                  Dipilih:{" "}
                  <span className="font-semibold">{newBarang.name}</span>{" "}
                </p>
                <button
                  type="button"
                  onClick={handleDeselectProductBarang}
                  className="text-green-700 hover:text-red-600 ml-2 p-1 rounded-full hover:bg-green-200 transition"
                  aria-label="Batalkan Pilihan Produk"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Product List/Results */}
            {!newBarang && barangProducts.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                {barangProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProductBarang(product)}
                    className={`p-2 cursor-pointer transition duration-150 ${
                      newBarang?.id === product.id
                        ? "bg-green-50 font-medium text-green-800 border-l-4 border-green-500"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {product.name}
                  </div>
                ))}
              </div>
            )}
            {barangProducts.length === 0 &&
              searchTermBarang &&
              !isSearchingBarang && (
                <p className="p-3 text-sm text-gray-500 text-center">
                  Produk tidak ditemukan.
                </p>
              )}
          </div>

          {newBarang && (
            <div className="mb-4">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="quantity"
              >
                Quantity
              </label>
              <input
                type="text"
                value={newBarang.serviceQuantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          )}

          {newBarang && newBarang.small_unit_tariff && (
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
                    checked={newBarang.serviceUnitType === "LARGE"}
                    onChange={() =>
                      setNewBarang({
                        ...newBarang,
                        serviceUnitType: "LARGE",
                      })
                    }
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {`Rp ${newBarang.tariff.toLocaleString("id-ID")}`} /{" "}
                    {newBarang.big_unit_name}
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="unit_type"
                    value="SMALL"
                    checked={newBarang.serviceUnitType === "SMALL"}
                    onChange={() =>
                      setNewBarang({
                        ...newBarang,
                        serviceUnitType: "SMALL",
                      })
                    }
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {`Rp ${newBarang.small_unit_tariff.toLocaleString(
                      "id-ID"
                    )}`}{" "}
                    / {newBarang.small_unit_name}
                  </span>
                </label>
              </div>
            </div>
          )}
          {newBarang && !newBarang.small_unit_tariff && (
            <span className="ml-2 text-sm text-gray-700">
              Harga: {`Rp ${newBarang.tariff.toLocaleString("id-ID")}`} /{" "}
              {newBarang.big_unit_name}
            </span>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleCloseModal}
              className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!newJasa && !newService.name && !newService.price}
              onClick={handleSubmit}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition ${
                !newJasa || !newService.name || !newService.price
                  ? "bg-green-400 cursor-not-allowed opacity-75"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isSubmitting ? "Memproses..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
