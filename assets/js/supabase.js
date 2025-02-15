import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const SUPABASE_URL = "https://yjutbgjocgswnubwrayw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqdXRiZ2pvY2dzd251YndyYXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMjI4MjYsImV4cCI6MjA1MjU5ODgyNn0.T4zmqEDmYgp1J_dQ05tJGVeq4EuZ1MKY5ZJedQEa2LM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };

// Fungsi untuk mengambil banner
export async function getBanners() {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("active_status", true)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) throw error;
  return data;
}

// Fungsi untuk mengambil products
export async function getProducts(limit = 5) {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
            *,
            product_variants(*)
        `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Fungsi untuk mengambil services
export async function getServices() {
  const { data, error } = await supabase
    .from("services")
    .select(
      `
      *,
      basic_price,
      middle_price,
      premium_price
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// Fungsi search products
// AFTER - Enhanced search functions
export async function searchProducts(query) {
  // Split query into words
  const words = query.toLowerCase().split(/\s+/);
  const searchPatterns = words.map((word) => ({
    exact: word,
    start: `${word}%`,
    contains: `%${word}%`,
  }));

  // Build OR conditions for each word and pattern
  const conditions = searchPatterns.flatMap((pattern) => [
    `name.ilike.${pattern.contains}`,
    `description.ilike.${pattern.contains}`,
  ]);

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .or(conditions.join(","))
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Sort results by relevance
  return sortByRelevance(data, query);
}

export async function searchServices(query) {
  // Split query into words
  const words = query.toLowerCase().split(/\s+/);
  const searchPatterns = words.map((word) => ({
    exact: word,
    start: `${word}%`,
    contains: `%${word}%`,
  }));

  // Build OR conditions for each word and pattern
  const conditions = searchPatterns.flatMap((pattern) => [
    `name.ilike.${pattern.contains}`,
    `description.ilike.${pattern.contains}`,
  ]);

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .or(conditions.join(","))
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Sort results by relevance
  return sortByRelevance(data, query);
}

// Add helper function for relevance sorting
function sortByRelevance(items, query) {
  const queryWords = query.toLowerCase().split(/\s+/);

  return items.sort((a, b) => {
    const scoreA = calculateRelevanceScore(a, queryWords);
    const scoreB = calculateRelevanceScore(b, queryWords);
    return scoreB - scoreA;
  });
}

function calculateRelevanceScore(item, queryWords) {
  let score = 0;
  const itemName = item.name.toLowerCase();
  const itemDesc = (item.description || "").toLowerCase();

  for (const word of queryWords) {
    // Exact match in name (highest weight)
    if (itemName === word) score += 100;

    // Word appears in name
    if (itemName.includes(word)) score += 50;

    // Word appears at start of name
    if (itemName.startsWith(word)) score += 30;

    // Word appears in description
    if (itemDesc.includes(word)) score += 10;

    // Partial word matches in name
    if (
      itemName
        .split(/\s+/)
        .some((namePart) => namePart.includes(word) || word.includes(namePart))
    )
      score += 5;
  }

  return score;
}

// Tambahkan fungsi-fungsi berikut
export async function getServiceFormTemplate(serviceId) {
  const { data, error } = await supabase
    .from("service_form_templates")
    .select(
      `
      *,
      service_form_fields(
        *
      )
    `
    )
    .eq("service_id", serviceId)
    .eq("is_active", true)
    .single();

  if (error) throw error;
  return data;
}

export async function submitServiceForm(templateId, formData) {
  const { data, error } = await supabase
    .from("service_form_submissions")
    .insert([
      {
        template_id: templateId,
        form_data: formData,
        status: "pending",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Cart functions with localStorage
export const cartManager = {
  getCart() {
    return JSON.parse(localStorage.getItem("cart")) || [];
  },

  addToCart(product) {
    const cart = this.getCart();
    const existingItemIndex = cart.findIndex(
      (item) => item.id === product.id && item.variantId === product.variantId
    );

    if (existingItemIndex !== -1) {
      cart[existingItemIndex].quantity += product.quantity;
    } else {
      cart.push({
        id: product.id,
        variantId: product.variantId,
        quantity: product.quantity,
        timestamp: new Date().toISOString(),
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    this.updateCartBadge();
  },

  removeFromCart(productId, variantId) {
    const cart = this.getCart();
    const updatedCart = cart.filter(
      (item) => !(item.id === productId && item.variantId === variantId)
    );
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    this.updateCartBadge();
  },

  updateCartBadge() {
    const cart = this.getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll(".notification-badge");
    badges.forEach((badge) => {
      if (totalItems > 0) {
        badge.style.display = "inline";
        badge.textContent = totalItems;
      } else {
        badge.style.display = "none";
      }
    });
  },

  getAddress() {
    return (
      JSON.parse(localStorage.getItem("deliveryAddress")) || {
        type: null,
        name: null,
        phone: null,
        address: null,
        school: null,
        class: null,
      }
    );
  },

  setAddress(addressData) {
    localStorage.setItem("deliveryAddress", JSON.stringify(addressData));
  },

  clearCart() {
    localStorage.removeItem("cart");
    this.updateCartBadge();
  },

  getAddresses() {
    return JSON.parse(localStorage.getItem("deliveryAddresses")) || [];
  },

  getSelectedAddress() {
    return JSON.parse(localStorage.getItem("selectedAddress")) || null;
  },

  setSelectedAddress(address) {
    localStorage.setItem("selectedAddress", JSON.stringify(address));
  },

  addAddress(address) {
    const addresses = this.getAddresses();
    address.id = Date.now().toString(); // Unique ID
    addresses.push(address);
    localStorage.setItem("deliveryAddresses", JSON.stringify(addresses));
    this.setSelectedAddress(address);
  },

  updateAddress(id, updatedAddress) {
    const addresses = this.getAddresses();
    const index = addresses.findIndex((addr) => addr.id === id);
    if (index !== -1) {
      addresses[index] = { ...updatedAddress, id };
      localStorage.setItem("deliveryAddresses", JSON.stringify(addresses));
      this.setSelectedAddress(addresses[index]);
    }
  },

  deleteAddress(id) {
    const addresses = this.getAddresses();
    const updatedAddresses = addresses.filter((addr) => addr.id !== id);
    localStorage.setItem("deliveryAddresses", JSON.stringify(updatedAddresses));

    // If deleted address was selected, clear selected address
    const selectedAddress = this.getSelectedAddress();
    if (selectedAddress && selectedAddress.id === id) {
      localStorage.removeItem("selectedAddress");
    }
  },

  updateQuantity(productId, variantId, newQuantity) {
    const cart = this.getCart();
    const existingItem = cart.find(
      (item) =>
        item.id === parseInt(productId) &&
        item.variantId === parseInt(variantId)
    );

    if (existingItem) {
      existingItem.quantity = parseInt(newQuantity);
      localStorage.setItem("cart", JSON.stringify(cart));
      this.updateCartBadge();
    }
  },
};
