export async function sendOrderNotification(orderType, orderData) {
  const API_KEY = "8654075";
  const PHONE = "6287872499754";
  const PROXY_URL = "http://localhost:3000/send-whatsapp";

  try {
    const message =
      orderType === "product"
        ? formatProductOrder(orderData)
        : formatServiceOrder(orderData);

    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: PHONE,
        apiKey: API_KEY,
        message: message,
      }),
    });

    if (!response.ok) throw new Error("Failed to send WhatsApp notification");

    return true;
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    return false;
  }
}

function formatProductOrder(orderData) {
  const { orderSummary, selectedAddress } = orderData;

  return `🛍️ *NEW PRODUCT ORDER!*
    ---------------------------
  
    📦 *Order ID:* #${Date.now()}
    📅 *Order Date:* ${new Date().toLocaleString("id-ID")}
  
    👤 *CUSTOMER INFO:*
    ▸ Name: ${selectedAddress.name}
    ▸ Phone: ${selectedAddress.phone}
    ▸ Type: ${selectedAddress.type === "home" ? "🏠 Home" : "🏫 School"}
    ${
      selectedAddress.type === "home"
        ? `▸ Address: ${selectedAddress.addressDetail}
    ▸ Area: ${selectedAddress.village.name}, ${selectedAddress.district.name}
    ▸ City: ${selectedAddress.city.name}, ${selectedAddress.province.name}
    ▸ Postal: ${selectedAddress.postalCode}
    ${
      selectedAddress.landmark ? `▸ Landmark: ${selectedAddress.landmark}` : ""
    }`
        : `▸ School: ${selectedAddress.school}
    ▸ Class: ${selectedAddress.classRoom}`
    }
  
    🛒 *ORDER DETAILS:*
    ${orderSummary.items
      .map(
        (item) =>
          `▸ ${item.productName}
      • Variant: ${item.variantName}
      • Qty: ${item.quantity}
      • Price: Rp ${item.price.toLocaleString()}`
      )
      .join("\n")}
  
    💰 *PAYMENT SUMMARY:*
    ▸ Subtotal: Rp ${orderSummary.subtotal.toLocaleString()}
    ▸ Shipping: Rp ${orderSummary.shippingFee.toLocaleString()}
    ▸ Total: Rp ${orderSummary.total.toLocaleString()}
    ▸ Method: ${
      orderSummary.paymentMethod === "cod"
        ? "💵 Cash on Delivery"
        : "🏦 Bank Transfer"
    }
  
    Status: ⏳ *PENDING*`;
}

function formatServiceOrder(orderData) {
  const { submission, service, selectedAddress } = orderData;

  let message = `🔧 *NEW SERVICE ORDER!*
    ---------------------------
  
    📋 *Order ID:* #${submission.service_order_id}
    📅 *Order Date:* ${new Date(submission.created_at).toLocaleString("id-ID")}
  
    👤 *CUSTOMER INFO:*
    ▸ Name: ${selectedAddress.name}
    ▸ Phone: ${selectedAddress.phone}
    ▸ Type: ${selectedAddress.type === "home" ? "🏠 Home" : "🏫 School"}
    ${
      selectedAddress.type === "home"
        ? `▸ Address: ${selectedAddress.addressDetail}
    ▸ Area: ${selectedAddress.village.name}, ${selectedAddress.district.name}
    ▸ City: ${selectedAddress.city.name}, ${selectedAddress.province.name}
    ▸ Postal: ${selectedAddress.postalCode}
    ${
      selectedAddress.landmark ? `▸ Landmark: ${selectedAddress.landmark}` : ""
    }`
        : `▸ School: ${selectedAddress.school}
    ▸ Class: ${selectedAddress.classRoom}`
    }
  
    🛠️ *SERVICE DETAILS:*
    ▸ Service: ${service.name}
    ▸ Level: ${service.level}
  
    📝 *FORM SUBMISSIONS:*`;

  // Add form data
  const formData = submission.form_data;
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === "object" && value.url) {
      // This is a file upload
      message += `\n▸ ${key}: ${value.url}`;
    } else {
      message += `\n▸ ${key}: ${value}`;
    }
  }

  message += `\n\nStatus: ⏳ *PENDING*`;

  return message;
}
