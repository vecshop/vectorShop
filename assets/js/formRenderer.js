import { cartManager } from "./supabase.js";
import { sendOrderNotification } from "./callMeBot.js";

export class FormRenderer {
  constructor(container, template, supabaseClient) {
    this.container = container;
    this.template = template;
    this.formData = {};
    this.supabase = supabaseClient;
    this.urlParams = new URLSearchParams(window.location.search);
    this.cartManager = cartManager;
  }

  async render() {
    this.container.innerHTML = `
        <form id="serviceForm" class="service-form">
          ${this.template.service_form_fields
            .sort((a, b) => a.field_order - b.field_order)
            .map((field) => this.renderField(field))
            .join("")}
          <button type="submit" class="btn btn-primary w-100 mt-4">Submit</button>
        </form>
      `;

    this.attachEventListeners();
  }

  renderField(field) {
    switch (field.field_type) {
      case "imageUploader":
        return this.renderImageUploader(field);
      case "fileUploader":
        return this.renderFileUploader(field);
      case "switcher":
        return this.renderSwitcher(field);
      case "slider":
        return this.renderSlider(field);
      case "shortText":
        return this.renderShortText(field);
      case "longText":
        return this.renderLongText(field);
      case "cardChoice":
        return this.renderCardChoice(field);
      case "multipleChoice":
        return this.renderMultipleChoice(field);
      case "filePreview":
        return this.renderFilePreviewUploader(field);
      default:
        return "";
    }
  }

  renderCardChoice(field) {
    const options = this.getFieldOptions(field);
    const columns = options.columns || 2;
    return `
      <div class="mb-4">
        <label class="form-label">${field.field_label}</label>
        <div class="row g-3">
          ${options.choices
            .map(
              (choice, index) => `
            <div class="col-${12 / columns}">
              <input type="radio" 
                     class="btn-check" 
                     name="${field.field_name}" 
                     id="${field.field_name}_${index}"
                     value="${choice.value}"
                     ${field.is_required ? "required" : ""}>
              <label class="card h-100 text-center p-3 choice-card" for="${
                field.field_name
              }_${index}">
                ${
                  choice.icon
                    ? `<i class="bi bi-${choice.icon} fs-1 mb-2"></i>`
                    : ""
                }
                <h6 class="mb-1">${choice.label}</h6>
                ${
                  choice.description
                    ? `<small class="text-muted">${choice.description}</small>`
                    : ""
                }
              </label>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  renderMultipleChoice(field) {
    const options = this.getFieldOptions(field);
    return `
      <div class="mb-3">
        <label class="form-label">${field.field_label}</label>
        <div class="d-flex flex-column gap-2">
          ${options.choices
            .map(
              (choice, index) => `
            <div class="form-check">
              <input class="form-check-input" 
                     type="radio" 
                     name="${field.field_name}" 
                     id="${field.field_name}_${index}"
                     value="${choice.value}"
                     ${field.is_required ? "required" : ""}>
              <label class="form-check-label" for="${
                field.field_name
              }_${index}">
                ${choice.label}
                ${
                  choice.description
                    ? `<small class="text-muted d-block">${choice.description}</small>`
                    : ""
                }
              </label>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  renderFilePreviewUploader(field) {
    const options = this.getFieldOptions(field);
    return `
      <div class="mb-3">
        <label class="form-label">${field.field_label}</label>
        <div class="file-upload-wrapper">
          <input type="file" 
                 class="form-control" 
                 id="${field.field_name}"
                 name="${field.field_name}"
                 accept="${
                   options.acceptedTypes ? options.acceptedTypes.join(",") : "*"
                 }"
                 ${options.maxFiles > 1 ? "multiple" : ""}
                 ${field.is_required ? "required" : ""}>
          <div class="form-text">${field.placeholder || ""}</div>
          <div id="${field.field_name}-preview" class="file-preview mt-2">
            <div class="row g-2" id="${field.field_name}-preview-grid"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderImageUploader(field) {
    const options = this.getFieldOptions(field);
    return `
        <div class="mb-3">
          <label class="form-label">${field.field_label}</label>
          <input type="file" 
                 class="form-control" 
                 id="${field.field_name}"
                 name="${field.field_name}"
                 accept="image/*"
                 ${options.maxFiles > 1 ? "multiple" : ""}
                 ${field.is_required ? "required" : ""}
          >
          <div class="form-text">${field.placeholder || ""}</div>
          <div id="${
            field.field_name
          }-preview" class="image-preview mt-2 d-flex gap-2 flex-wrap"></div>
        </div>
      `;
  }

  renderFileUploader(field) {
    const options = this.getFieldOptions(field);
    return `
        <div class="mb-3">
          <label class="form-label">${field.field_label}</label>
          <input type="file" 
                 class="form-control" 
                 id="${field.field_name}"
                 name="${field.field_name}"
                 accept="${
                   options.acceptedTypes ? options.acceptedTypes.join(",") : "*"
                 }"
                 ${field.is_required ? "required" : ""}
          >
          <div class="form-text">${field.placeholder || ""}</div>
        </div>
      `;
  }

  renderSwitcher(field) {
    const options = this.getFieldOptions(field);
    const switchOptions = options.options || ["Yes", "No"];
    return `
        <div class="mb-3">
          <label class="form-label">${field.field_label}</label>
          <div class="btn-group w-100" role="group">
            ${switchOptions
              .map(
                (option, index) => `
              <input type="radio" 
                     class="btn-check" 
                     name="${field.field_name}" 
                     id="${field.field_name}_${index}"
                     value="${option}"
                     ${index === 0 ? "checked" : ""}
                     ${field.is_required ? "required" : ""}>
              <label class="btn btn-outline-primary" for="${
                field.field_name
              }_${index}">
                ${option}
              </label>
            `
              )
              .join("")}
          </div>
        </div>
      `;
  }

  renderSlider(field) {
    const options = this.getFieldOptions(field);
    const value = options.defaultValue || 50;
    return `
        <div class="mb-3">
          <label class="form-label">${field.field_label}</label>
          <input type="range" 
                 class="form-range" 
                 id="${field.field_name}"
                 name="${field.field_name}"
                 min="${options.min || 0}"
                 max="${options.max || 100}"
                 step="${options.step || 1}"
                 value="${value}"
                 ${field.is_required ? "required" : ""}>
          <div class="d-flex justify-content-between">
            ${
              options.labels
                ? Object.entries(options.labels)
                    .map(
                      ([val, label]) => `
                  <span class="slider-label ${
                    val == value ? "active" : ""
                  }" data-value="${val}">
                    ${label}
                  </span>
                `
                    )
                    .join("")
                : ""
            }
          </div>
          <input type="hidden" name="${field.field_name}_label" id="${
      field.field_name
    }_label" value="${options.labels?.[value] || ""}">
        </div>
      `;
  }

  renderShortText(field) {
    const options = this.getFieldOptions(field);
    return `
        <div class="mb-3">
          <label class="form-label">${field.field_label}</label>
          <input type="${options.type || "text"}" 
                 class="form-control" 
                 id="${field.field_name}"
                 name="${field.field_name}"
                 placeholder="${field.placeholder || ""}"
                 maxlength="${options.maxLength || 100}"
                 ${field.is_required ? "required" : ""}>
        </div>
      `;
  }

  renderLongText(field) {
    const options = this.getFieldOptions(field);
    return `
        <div class="mb-3">
          <label class="form-label">${field.field_label}</label>
          <textarea class="form-control" 
                    id="${field.field_name}"
                    name="${field.field_name}"
                    rows="${options.rows || 3}"
                    placeholder="${field.placeholder || ""}"
                    maxlength="${options.maxLength || 1000}"
                    ${field.is_required ? "required" : ""}></textarea>
        </div>
      `;
  }

  getFieldOptions(field) {
    try {
      if (typeof field.field_options === "string") {
        return JSON.parse(field.field_options);
      }
      return field.field_options || {};
    } catch (error) {
      console.error("Error parsing field options:", error);
      return {};
    }
  }

  attachEventListeners() {
    const form = document.getElementById("serviceForm");

    // Handle image preview
    this.template.service_form_fields.forEach((field) => {
      if (field.field_type === "filePreview") {
        const input = document.getElementById(field.field_name);
        input?.addEventListener("change", (e) =>
          this.handleFilePreview(e, field)
        );
      }

      if (field.field_type === "slider") {
        const input = document.getElementById(field.field_name);
        input?.addEventListener("input", (e) =>
          this.handleSliderChange(e, field)
        );
      }
    });

    // Handle form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleSubmit(e);
    });
  }

  handleFilePreview(e, field) {
    const previewGrid = document.getElementById(
      `${field.field_name}-preview-grid`
    );
    previewGrid.innerHTML = "";

    Array.from(e.target.files).forEach((file) => {
      const col = document.createElement("div");
      col.className = "col-6 col-md-4 col-lg-3";

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          col.innerHTML = `
            <div class="position-relative">
              <div class="card">
                <img src="${e.target.result}" class="card-img-top" style="height: 120px; object-fit: cover;">
                <div class="card-body p-2">
                  <small class="text-truncate d-block">${file.name}</small>
                </div>
              </div>
            </div>
          `;
        };
        reader.readAsDataURL(file);
      } else {
        col.innerHTML = `
          <div class="position-relative">
            <div class="card">
              <div class="card-body p-2 text-center">
                <i class="bi bi-file-earmark fs-1"></i>
                <small class="text-truncate d-block">${file.name}</small>
              </div>
            </div>
          </div>
        `;
      }
      previewGrid.appendChild(col);
    });
  }

  handleImagePreview(e, field) {
    const previewDiv = document.getElementById(`${field.field_name}-preview`);
    previewDiv.innerHTML = "";

    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewDiv.innerHTML += `
            <div class="position-relative" style="width: 100px; height: 100px;">
              <img src="${e.target.result}" class="img-thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
          `;
      };
      reader.readAsDataURL(file);
    });
  }

  handleSliderChange(e, field) {
    const options = this.getFieldOptions(field);
    const value = e.target.value;
    const labelInput = document.getElementById(`${field.field_name}_label`);

    if (options.labels) {
      document.querySelectorAll(`.slider-label`).forEach((label) => {
        label.classList.remove("active");
        if (label.dataset.value == value) {
          label.classList.add("active");
          if (labelInput) labelInput.value = label.textContent.trim();
        }
      });
    }
  }

  async handleSubmit(e) {
    try {
      e.preventDefault();

      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';
      submitBtn.disabled = true;

      // Check internet connection
      if (!navigator.onLine) {
        throw new Error(
          "No internet connection. Please check your network and try again."
        );
      }

      // Validate selected address
      const selectedAddress = this.cartManager.getSelectedAddress();
      if (!selectedAddress) {
        throw new Error("Please select delivery address");
      }

      // Create service order with retry mechanism
      let orderData = null;
      let retries = 3;

      while (retries > 0) {
        try {
          const { data, error } = await this.supabase
            .from("service_orders")
            .insert({
              service_id: parseInt(this.urlParams.get("id")),
              user_id: "guest",
              level: this.urlParams.get("level"),
              status: "pending",
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;
          orderData = data;
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      if (!orderData) {
        throw new Error(
          "Failed to create service order after multiple attempts"
        );
      }

      // Prepare form data and handle file uploads
      const formData = new FormData(e.target);
      const formDataObj = {};
      const fileUploads = [];

      for (let [key, value] of formData.entries()) {
        if (value instanceof File && value.size > 0) {
          try {
            const fileExt = value.name.split(".").pop();
            const fileName = `${Date.now()}_${key}.${fileExt}`;

            const { data: fileData, error: uploadError } =
              await this.supabase.storage
                .from("service_form_files")
                .upload(fileName, value, {
                  cacheControl: "3600",
                  upsert: false,
                });

            if (uploadError) throw uploadError;

            const {
              data: { publicUrl },
              error: urlError,
            } = this.supabase.storage
              .from("service_form_files")
              .getPublicUrl(fileName);

            if (urlError) throw urlError;

            formDataObj[key] = {
              name: value.name,
              type: value.type,
              size: value.size,
              url: publicUrl,
              path: fileName,
            };

            fileUploads.push(fileName);
          } catch (uploadError) {
            console.error("Error uploading file:", uploadError);
            throw new Error(`Failed to upload file ${value.name}`);
          }
        } else if (!(value instanceof File)) {
          formDataObj[key] = value;
        }
      }

      // Prepare user data
      const userData = {
        name: selectedAddress.name,
        phone: selectedAddress.phone,
        address_type: selectedAddress.type,
        ...(selectedAddress.type === "home"
          ? {
              province: selectedAddress.province,
              city: selectedAddress.city,
              district: selectedAddress.district,
              village: selectedAddress.village,
              postal_code: selectedAddress.postalCode,
              address_detail: selectedAddress.addressDetail,
              landmark: selectedAddress.addressLandmark,
              coordinates: {
                latitude: selectedAddress.latitude,
                longitude: selectedAddress.longitude,
              },
            }
          : {
              school: selectedAddress.school,
              class_room: selectedAddress.classRoom,
            }),
      };

      // Submit form data
      const { data: submission, error: submissionError } = await this.supabase
        .from("service_form_submissions")
        .insert({
          template_id: this.template.id,
          user_data: JSON.stringify(userData),
          service_order_id: orderData.id,
          form_data: formDataObj,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Get service details with retry
      let serviceData = null;
      retries = 3;

      while (retries > 0) {
        try {
          const { data, error } = await this.supabase
            .from("services")
            .select("*")
            .eq("id", parseInt(this.urlParams.get("id")))
            .single();

          if (error) throw error;
          serviceData = data;
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Send WhatsApp notification
      try {
        await sendOrderNotification("service", {
          submission: orderData,
          service: {
            name: serviceData.name,
            level: this.urlParams.get("level"),
          },
          selectedAddress,
        });
      } catch (notifError) {
        console.error("WhatsApp notification failed:", notifError);
        // Continue with form submission even if notification fails
      }

      // Show success message and redirect
      alert("Form submitted successfully!");
      window.location.href = "orderHistory.html";
    } catch (error) {
      console.error("Error submitting form:", error);

      // Reset submit button
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }

      // Show user-friendly error message
      alert(
        error.message ||
          "Failed to submit form. Please check your internet connection and try again."
      );
    }
  }
}
