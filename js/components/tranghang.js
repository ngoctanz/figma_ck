// Global data storage
let currentProducts = [];
let allProducts = [];

// Format price to Vietnamese currency
function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(price)
    .replace("₫", "đ");
}

// Load page data
async function loadProducts() {
  try {
    // Use data from products.js instead of fetching JSON
    if (typeof productsData === 'undefined') {
      throw new Error("Không tìm thấy dữ liệu sản phẩm");
    }

    // Sort by best sellers
    const bestSellerProducts = [...productsData.products].sort((a, b) => b.soLuongBan - a.soLuongBan);

    // Store products and render
    allProducts = currentProducts = bestSellerProducts;
    renderProducts(bestSellerProducts);

    // Set up UI elements
    setupFilters();
    initializeMoreLinks();
    checkLoginStatus();
    updateCartBadge();
  } catch (error) {
    console.error("Error loading product data:", error);
  }
}

// No longer needed - products already have discount info

// Render products to the page
function renderProducts(products) {
  const productGrid = document.querySelector(".product-grid");
  if (!productGrid) return;

  productGrid.innerHTML =
    products.length === 0 ? "<div class='no-products'>Không tìm thấy sản phẩm phù hợp.</div>" : "";

  if (products.length === 0) return;

  const fragment = document.createDocumentFragment();

  products.forEach((product) => {
    const productItem = document.createElement("div");
    productItem.className = "product-item";
    productItem.setAttribute("data-product-id", product.id);

    // Create discount badge if product has a discount
    const discountBadge = product.giamGia
      ? `<div class="discount-badge">-${product.giamGia}%</div>`
      : "";

    const originalPrice = product.giaGoc 
      ? `<span class="old-price">${formatPrice(product.giaGoc)}</span>`
      : "";

    productItem.innerHTML = `
      ${discountBadge}
      <div class="image-container">
        <img src="../${product.hinhAnh}" alt="${product.tenSanPham}">
      </div>
      <div class="brand">${product.tenThuongHieu}</div>
      <div class="name">${product.tenSanPham}</div>
      <div class="price">
        ${formatPrice(product.gia)}
        ${originalPrice}
      </div>
      <div class="product-stats">
        <span class="rating">⭐ ${product.diemDanhGia || 5}</span>
        <span class="sold">Đã bán ${product.soLuongBan}</span>
      </div>
      <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${
        product.id
      }', 1)">
        Thêm vào giỏ
      </button>
    `;

    productItem.addEventListener("click", () => {
      window.location.href = `ChiTietSanPham.html?id=${product.id}`;
    });

    fragment.appendChild(productItem);
  });

  productGrid.appendChild(fragment);
}

// Setup filters
function setupFilters() {
  if (!allProducts.length) return;

  // Get unique filter values
  const getUniqueValues = (property, nestedProp) => {
    const values = nestedProp
      ? [...new Set(allProducts.map((p) => p.thuocTinh?.[nestedProp]).filter(Boolean))]
      : [...new Set(allProducts.map((p) => p[property]))];
    return values;
  };

  // Populate filter dropdowns
  const allBrands = getUniqueValues("tenThuongHieu");
  const allCategories = getUniqueValues("tenDanhMuc");
  const allSizes = getUniqueValues(null, "kichThuoc");
  const allMaterials = getUniqueValues(null, "chatLieu");

  populateFilterDropdown("thuongHieuDropdown", allBrands);
  populateFilterDropdown("danhMucDropdown", allCategories);
  populateFilterDropdown("dungTichDropdown", allSizes);

  // Use material filter for scent dropdown
  if (allMaterials.length > 0) {
    populateFilterDropdown("muiHuongDropdown", allMaterials);
  } else {
    const materialDropdown = document.querySelector(".dropdown:has(#muiHuongDropdown)");
    if (materialDropdown) materialDropdown.style.display = "none";
  }

  // Setup other filter components
  setupPriceFilters();
  setupDropdownSearch();
  setupFilterChangeEvents();
  setupResetFiltersButton();
}

// Populate filter dropdowns with product data
function populateFilterDropdown(dropdownId, items) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  // Save search input if exists
  const searchInput = dropdown.querySelector(".search");
  dropdown.innerHTML = "";
  if (searchInput) dropdown.appendChild(searchInput.cloneNode(true));

  // Get product count by property
  const getCount = (item) => {
    switch (dropdownId) {
      case "thuongHieuDropdown":
        return allProducts.filter((p) => p.tenThuongHieu === item).length;
      case "danhMucDropdown":
        return allProducts.filter((p) => p.tenDanhMuc === item).length;
      case "dungTichDropdown":
        return allProducts.filter((p) => p.thuocTinh?.kichThuoc === item).length;
      case "muiHuongDropdown":
        return allProducts.filter((p) => p.thuocTinh?.chatLieu === item).length;
      default:
        return 0;
    }
  };

  // Add items with count
  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const count = getCount(item);
    const label = document.createElement("label");
    label.innerHTML = `<input class="checkbox" type="checkbox" value="${item}"> ${item} (${count})`;
    fragment.appendChild(label);
  });

  dropdown.appendChild(fragment);

  // Add "Xem thêm" link if needed
  if (items.length > 5) {
    const moreLink = document.createElement("a");
    moreLink.href = "#";
    moreLink.className = "more-link";
    moreLink.textContent = "Xem thêm";
    dropdown.appendChild(moreLink);
  }
}

// Setup price range filters
function setupPriceFilters() {
  const priceDropdown = document.getElementById("giaSanPhamDropdown");
  if (!priceDropdown) return;

  // Price ranges in VND
  const priceRanges = [
    { min: 0, max: 200000, label: "Dưới 200.000₫" },
    { min: 200000, max: 300000, label: "200.000₫ - 300.000₫" },
    { min: 300000, max: 400000, label: "300.000₫ - 400.000₫" },
    { min: 400000, max: 500000, label: "400.000₫ - 500.000₫" },
    { min: 500000, max: 700000, label: "500.000₫ - 700.000₫" },
    { min: 700000, max: 1000000, label: "700.000₫ - 1.000.000₫" },
    { min: 1000000, max: 1500000, label: "1.000.000₫ - 1.500.000₫" },
    { min: 1500000, max: 2000000, label: "1.500.000₫ - 2.000.000₫" },
    { min: 2000000, max: Infinity, label: "Trên 2.000.000₫" },
  ];

  priceDropdown.innerHTML = "";

  // Create a document fragment for better performance
  const fragment = document.createDocumentFragment();

  priceRanges.forEach((range) => {
    const count = allProducts.filter(
      (p) => p.giaSauGiam >= range.min && p.giaSauGiam < range.max
    ).length;

    if (count > 0) {
      const label = document.createElement("label");
      label.innerHTML = `<input class="checkbox price-checkbox" type="radio" name="priceRange" data-min="${range.min}" data-max="${range.max}"> ${range.label} (${count})`;
      fragment.appendChild(label);
    }
  });

  priceDropdown.appendChild(fragment);
}

// Setup search functionality for filter dropdowns
function setupDropdownSearch() {
  document.querySelectorAll(".dropdown-content .search").forEach((input) => {
    input.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();
      const dropdown = this.parentElement;

      dropdown.querySelectorAll("label").forEach((label) => {
        label.style.display = label.textContent.toLowerCase().includes(searchTerm) ? "" : "none";
      });
    });
  });
}

// Setup filter change events
function setupFilterChangeEvents() {
  document.querySelectorAll(".dropdown-content .checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", filterProducts);
  });
}

// Filter products based on selected criteria
function filterProducts() {
  // Get selections
  const selectedBrands = getSelectedValues("#thuongHieuDropdown .checkbox:checked");
  const selectedCategories = getSelectedValues("#danhMucDropdown .checkbox:checked");
  const selectedVolumes = getSelectedValues("#dungTichDropdown .checkbox:checked");
  const selectedScents = getSelectedValues("#muiHuongDropdown .checkbox:checked");

  // Get selected price ranges
  const selectedPriceRanges = Array.from(
    document.querySelectorAll("#giaSanPhamDropdown .price-checkbox:checked")
  ).map((checkbox) => ({
    min: parseInt(checkbox.dataset.min, 10),
    max: parseInt(checkbox.dataset.max, 10),
  }));

  // Apply filters
  const filteredProducts = allProducts.filter((product) => {
    // Check if product passes all active filters
    return (
      (selectedBrands.length === 0 || selectedBrands.includes(product.tenThuongHieu)) &&
      (selectedCategories.length === 0 || selectedCategories.includes(product.tenDanhMuc)) &&
      (selectedVolumes.length === 0 || selectedVolumes.includes(product.thuocTinh?.kichThuoc)) &&
      (selectedScents.length === 0 || selectedScents.includes(product.thuocTinh?.chatLieu)) &&
      (selectedPriceRanges.length === 0 ||
        selectedPriceRanges.some(
          (range) => product.gia >= range.min && product.gia < range.max
        ))
    );
  });

  // Update products and render
  currentProducts = filteredProducts;
  renderProducts(filteredProducts);
}

// Helper function to get selected values from checkboxes
function getSelectedValues(selector) {
  return Array.from(document.querySelectorAll(selector)).map((checkbox) => checkbox.value);
}

// Initialize more links for dropdowns
function initializeMoreLinks() {
  document.querySelectorAll(".dropdown-content").forEach((dropdown) => {
    const labels = dropdown.querySelectorAll("label");
    const moreLink = dropdown.querySelector(".more-link");

    if (labels.length > 5 && moreLink) {
      // Initially hide labels beyond the first 5
      Array.from(labels).forEach((label, index) => {
        label.style.display = index >= 5 ? "none" : "";
      });
    } else if (moreLink) {
      // Hide the link if we have 5 or fewer items
      moreLink.style.display = "none";
    }
  });
}

// Add to cart functionality
function addToCart(productId, quantity) {
  // Removed login check for testing
  
  // Find product in current products
  const product = allProducts.find((p) => p.id == productId);
  if (product) {
    addProductToCart(product, quantity);
    return;
  }
}

// Helper function to add product to cart
function addProductToCart(product, quantity) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existingProduct = cart.find((item) => item.id == product.id);

  if (existingProduct) {
    existingProduct.quantity += quantity;
    showNotification(`Đã cập nhật số lượng sản phẩm ${product.tenSanPham} trong giỏ hàng!`);
  } else {
    cart.push({
      id: product.id,
      name: product.tenSanPham,
      price: product.gia,
      image: `../${product.hinhAnh}`,
      quantity: quantity,
      brand: product.tenThuongHieu,
    });
    showNotification(`Đã thêm ${product.tenSanPham} vào giỏ hàng!`);
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBadge();
}

// Setup reset filters button
function setupResetFiltersButton() {
  const resetButton = document.getElementById("resetFilters");
  if (resetButton) {
    resetButton.addEventListener("click", resetAllFilters);
  }
}

// Reset all filters
function resetAllFilters() {
  // Uncheck all checkboxes
  document.querySelectorAll(".dropdown-content .checkbox").forEach((checkbox) => {
    checkbox.checked = false;
  });

  // Clear all search inputs
  document.querySelectorAll(".dropdown-content .search").forEach((input) => {
    input.value = "";
  });

  // Show all labels again
  document.querySelectorAll(".dropdown-content label").forEach((label) => {
    label.style.display = "";
  });

  // Reset "Xem thêm" links
  initializeMoreLinks();

  // Render all products
  currentProducts = allProducts;
  renderProducts(allProducts);
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", loadProducts);
