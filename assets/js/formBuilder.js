import { FormRenderer } from "./formRenderer.js";

export class FormBuilder {
  constructor(container, supabaseClient) {
    this.container = container;
    this.fields = [];
    this.currentDraggedField = null;
    this.formRenderer = new FormRenderer(container, {
      service_form_fields: [],
    });
    this.templateId = null;
    this.supabase = supabaseClient; // Add supabase client
    this.init();
  }

  setTemplateId(id) {
    this.templateId = id;
  }

  updateField(updatedField) {
    const index = this.fields.findIndex((f) => f.id === updatedField.id);
    if (index !== -1) {
      this.fields[index] = updatedField;
      this.renderFields();
      // Auto-save when field is updated
      if (this.templateId) {
        this.saveForm(this.templateId).catch((error) =>
          console.error("Error auto-saving form:", error)
        );
      }
    }
  }

  deleteField(fieldId) {
    this.fields = this.fields.filter((f) => f.id !== fieldId);
    this.renderFields();
    // Auto-save when field is deleted
    if (this.templateId) {
      this.saveForm(this.templateId).catch((error) =>
        console.error("Error auto-saving form:", error)
      );
    }
  }

  addField(type) {
    const field = {
      id: Date.now(),
      type,
      label: `New ${type} Field`,
      name: `field_${Date.now()}`,
      required: false,
      order: this.fields.length,
      options: this.getDefaultOptions(type),
    };

    this.fields.push(field);
    this.renderFields();
    this.showFieldSettings(field);

    // Auto-save when new field is added
    if (this.templateId) {
      this.saveForm(this.templateId).catch((error) =>
        console.error("Error auto-saving form:", error)
      );
    }
  }

  // Update renderFieldPreview method
  renderFieldPreview(field) {
    return this.formRenderer.renderField({
      field_type: field.type,
      field_label: field.label,
      field_name: field.name,
      is_required: field.required,
      field_options: field.options,
    });
  }

  init() {
    this.attachDragAndDrop();
    this.attachFieldTypeHandlers();
    this.renderFields();
  }

  attachDragAndDrop() {
    this.container.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.container.classList.add("drag-over");
    });

    this.container.addEventListener("dragleave", () => {
      this.container.classList.remove("drag-over");
    });

    this.container.addEventListener("drop", (e) => {
      e.preventDefault();
      this.container.classList.remove("drag-over");

      if (this.currentDraggedField) {
        const fieldType = this.currentDraggedField;
        this.addField(fieldType);
      }
    });
  }

  attachFieldTypeHandlers() {
    document.querySelectorAll(".field-types .card").forEach((card) => {
      card.setAttribute("draggable", true);

      card.addEventListener("dragstart", (e) => {
        this.currentDraggedField = card.dataset.fieldType;
      });

      card.addEventListener("dragend", () => {
        this.currentDraggedField = null;
      });

      card.addEventListener("click", () => {
        this.addField(card.dataset.fieldType);
      });
    });
  }

  getDefaultOptions(type) {
    const defaults = {
      shortText: {
        placeholder: "",
        maxLength: 100,
      },
      longText: {
        placeholder: "",
        rows: 3,
        maxLength: 1000,
      },
      imageUploader: {
        maxFiles: 1,
        acceptedTypes: ["image/*"],
      },
      fileUploader: {
        maxFiles: 1,
        acceptedTypes: [".pdf", ".doc", ".docx"],
      },
      switcher: {
        options: ["Yes", "No"],
      },
      slider: {
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 50,
        labels: {
          0: "Min",
          50: "Mid",
          100: "Max",
        },
      },
      cardChoice: {
        columns: 2,
        choices: [
          {
            value: "choice1",
            label: "Choice 1",
            icon: "star",
            description: "Description for choice 1",
          },
          {
            value: "choice2",
            label: "Choice 2",
            icon: "heart",
            description: "Description for choice 2",
          },
        ],
      },
      multipleChoice: {
        choices: [
          {
            value: "option1",
            label: "Option 1",
            description: "",
          },
          {
            value: "option2",
            label: "Option 2",
            description: "",
          },
        ],
      },
      filePreview: {
        maxFiles: 1,
        acceptedTypes: [".pdf", ".doc", ".docx", ".jpg", ".png"],
        maxFileSize: 5242880, // 5MB
        allowPreview: true,
      },
    };

    return defaults[type] || {};
  }

  renderFields() {
    const preview = document.createElement("div");
    preview.className = "form-preview";

    this.fields
      .sort((a, b) => a.order - b.order)
      .forEach((field) => {
        const fieldEl = this.createFieldElement(field);
        preview.appendChild(fieldEl);
      });

    this.container.innerHTML = "";
    this.container.appendChild(preview);
  }

  createFieldElement(field) {
    const el = document.createElement("div");
    el.className = "field-item p-3 mb-3 border rounded position-relative";
    el.dataset.fieldId = field.id;

    el.innerHTML = `
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h6 class="mb-1">${field.label}</h6>
            <small class="text-muted">${field.type}</small>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-secondary edit-field">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-field">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
        <div class="field-preview">
          ${this.renderFieldPreview(field)}
        </div>
      `;

    this.attachFieldHandlers(el, field);
    return el;
  }

  attachFieldHandlers(element, field) {
    element.querySelector(".edit-field").addEventListener("click", () => {
      this.showFieldSettings(field);
    });

    element.querySelector(".delete-field").addEventListener("click", () => {
      this.deleteField(field.id);
    });

    // Make field draggable for reordering
    element.setAttribute("draggable", true);
    element.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", field.id);
    });
  }

  showFieldSettings(field) {
    const modal = document.getElementById("fieldSettingsModal");
    const modalBody = modal.querySelector(".modal-body");

    modalBody.innerHTML = this.getFieldSettingsHTML(field);

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    this.attachFieldSettingsHandlers(modal, field);
  }

  getFieldSettingsHTML(field) {
    return `
        <form id="fieldSettingsForm">
          <div class="mb-3">
            <label class="form-label">Field Label</label>
            <input type="text" class="form-control" name="label" value="${
              field.label
            }" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Field Name</label>
            <input type="text" class="form-control" name="name" value="${
              field.name
            }" required pattern="[a-zA-Z0-9_]+">
          </div>
          <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input" name="required" ${
              field.required ? "checked" : ""
            }>
            <label class="form-check-label">Required Field</label>
          </div>
          ${this.getTypeSpecificSettings(field)}
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </form>
      `;
  }

  getTypeSpecificSettings(field) {
    const settings = {
      shortText: `
        <div class="mb-3">
          <label class="form-label">Placeholder</label>
          <input type="text" class="form-control" name="placeholder" value="${
            field.options.placeholder || ""
          }">
        </div>
        <div class="mb-3">
          <label class="form-label">Max Length</label>
          <input type="number" class="form-control" name="maxLength" value="${
            field.options.maxLength || 100
          }">
        </div>
      `,
      longText: `
        <div class="mb-3">
          <label class="form-label">Placeholder</label>
          <input type="text" class="form-control" name="placeholder" value="${
            field.options.placeholder || ""
          }">
        </div>
        <div class="mb-3">
          <label class="form-label">Number of Rows</label>
          <input type="number" class="form-control" name="rows" value="${
            field.options.rows || 3
          }">
        </div>
        <div class="mb-3">
          <label class="form-label">Max Length</label>
          <input type="number" class="form-control" name="maxLength" value="${
            field.options.maxLength || 1000
          }">
        </div>
      `,
      imageUploader: `
        <div class="mb-3">
          <label class="form-label">Maximum Files</label>
          <input type="number" class="form-control" name="maxFiles" value="${
            field.options.maxFiles || 1
          }" min="1">
        </div>
        <div class="mb-3">
          <label class="form-label">Maximum File Size (MB)</label>
          <input type="number" class="form-control" name="maxFileSize" value="${
            (field.options.maxFileSize || 5242880) / 1048576
          }" min="1">
        </div>
      `,
      fileUploader: `
        <div class="mb-3">
          <label class="form-label">Maximum Files</label>
          <input type="number" class="form-control" name="maxFiles" value="${
            field.options.maxFiles || 1
          }" min="1">
        </div>
        <div class="mb-3">
          <label class="form-label">Accepted File Types</label>
          <input type="text" class="form-control" name="acceptedTypes" value="${
            field.options.acceptedTypes?.join(", ") || ".pdf, .doc, .docx"
          }" 
                 placeholder=".pdf, .doc, .docx">
          <div class="form-text">Separate file extensions with commas</div>
        </div>
        <div class="mb-3">
          <label class="form-label">Maximum File Size (MB)</label>
          <input type="number" class="form-control" name="maxFileSize" value="${
            (field.options.maxFileSize || 5242880) / 1048576
          }" min="1">
        </div>
      `,
      switcher: `
        <div class="mb-3">
          <label class="form-label">Options</label>
          <div id="switcherOptions">
            ${(field.options.options || ["Yes", "No"])
              .map(
                (opt, i) => `
              <div class="input-group mb-2">
                <input type="text" class="form-control" name="switcherOption_${i}" value="${opt}">
                ${
                  i > 1
                    ? `
                  <button type="button" class="btn btn-outline-danger" onclick="this.closest('.input-group').remove()">
                    <i class="bi bi-trash"></i>
                  </button>
                `
                    : ""
                }
              </div>
            `
              )
              .join("")}
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm" onclick="addSwitcherOption()">
            <i class="bi bi-plus"></i> Add Option
          </button>
        </div>
      `,
      slider: `
        <div class="mb-3">
          <label class="form-label">Range</label>
          <div class="row">
            <div class="col">
              <input type="number" class="form-control" name="min" placeholder="Min" value="${
                field.options.min || 0
              }">
            </div>
            <div class="col">
              <input type="number" class="form-control" name="max" placeholder="Max" value="${
                field.options.max || 100
              }">
            </div>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Step</label>
          <input type="number" class="form-control" name="step" value="${
            field.options.step || 1
          }">
        </div>
        <div class="mb-3">
          <label class="form-label">Default Value</label>
          <input type="number" class="form-control" name="defaultValue" value="${
            field.options.defaultValue || 50
          }">
        </div>
        <div class="mb-3">
          <label class="form-label">Labels</label>
          <div id="sliderLabels">
            ${Object.entries(field.options.labels || {})
              .map(
                ([value, label]) => `
              <div class="input-group mb-2">
                <input type="number" class="form-control" name="labelValue" value="${value}" placeholder="Value">
                <input type="text" class="form-control" name="labelText" value="${label}" placeholder="Label">
                <button type="button" class="btn btn-outline-danger" onclick="this.closest('.input-group').remove()">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            `
              )
              .join("")}
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm" onclick="addSliderLabel()">
            <i class="bi bi-plus"></i> Add Label
          </button>
        </div>
      `,
      cardChoice: `
        <div class="mb-3">
          <label class="form-label">Columns</label>
          <select class="form-select" name="columns">
            <option value="1" ${
              field.options.columns === 1 ? "selected" : ""
            }>1 Column</option>
            <option value="2" ${
              field.options.columns === 2 ? "selected" : ""
            }>2 Columns</option>
            <option value="3" ${
              field.options.columns === 3 ? "selected" : ""
            }>3 Columns</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Choices</label>
          <div id="cardChoices">
            ${(field.options.choices || [])
              .map(
                (choice, i) => `
              <div class="card mb-2">
                <div class="card-body">
                  <div class="mb-2">
                    <label class="form-label">Value</label>
                    <input type="text" class="form-control" name="choiceValue_${i}" value="${
                  choice.value
                }">
                  </div>
                  <div class="mb-2">
                    <label class="form-label">Label</label>
                    <input type="text" class="form-control" name="choiceLabel_${i}" value="${
                  choice.label
                }">
                  </div>
                  <div class="mb-2">
                    <label class="form-label">Icon (Bootstrap Icons class)</label>
                    <input type="text" class="form-control" name="choiceIcon_${i}" value="${
                  choice.icon || ""
                }">
                  </div>
                  <div class="mb-2">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" name="choiceDesc_${i}">${
                  choice.description || ""
                }</textarea>
                  </div>
                  <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.closest('.card').remove()">
                    <i class="bi bi-trash"></i> Remove Choice
                  </button>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm" onclick="addCardChoice()">
            <i class="bi bi-plus"></i> Add Choice
          </button>
        </div>
      `,
      multipleChoice: `
      <div class="mb-3">
        <label class="form-label">Choices</label>
        <div id="multipleChoices">
          ${(field.options.choices || [])
            .map(
              (choice, i) => `
            <div class="input-group mb-2">
              <span class="input-group-text">Value</span>
              <input type="text" class="form-control" name="mcValue_${i}" value="${choice.value}">
              <span class="input-group-text">Label</span>
              <input type="text" class="form-control" name="mcLabel_${i}" value="${choice.label}">
              <button type="button" class="btn btn-outline-danger" onclick="this.closest('.input-group').remove()">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          `
            )
            .join("")}
        </div>
        <button type="button" class="btn btn-outline-primary btn-sm mt-2" onclick="addMultipleChoice()">
          <i class="bi bi-plus"></i> Add Choice
        </button>
      </div>
    `,
    };

    return settings[field.type] || "";
  }

  attachFieldSettingsHandlers(modal, field) {
    const form = modal.querySelector("#fieldSettingsForm");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        const formData = new FormData(form);
        const updatedField = {
          ...field,
          label: formData.get("label") || field.label,
          name: formData.get("name") || field.name,
          required: formData.get("required") === "on",
          options: this.getUpdatedOptions(field.type, formData),
        };

        this.updateField(updatedField);
        bootstrap.Modal.getInstance(modal).hide();
      } catch (error) {
        console.error("Error updating field:", error);
        alert("Error saving changes. Please check your inputs.");
      }
    });
  }

  getUpdatedOptions(type, formData) {
    const updates = {
      shortText: {
        placeholder: formData.get("placeholder") || "",
        maxLength: parseInt(formData.get("maxLength")) || 100,
      },
      longText: {
        placeholder: formData.get("placeholder") || "",
        rows: parseInt(formData.get("rows")) || 3,
        maxLength: parseInt(formData.get("maxLength")) || 1000,
      },
      imageUploader: {
        maxFiles: parseInt(formData.get("maxFiles")) || 1,
        maxFileSize: (parseInt(formData.get("maxFileSize")) || 5) * 1048576, // Default 5MB
      },
      fileUploader: {
        maxFiles: parseInt(formData.get("maxFiles")) || 1,
        acceptedTypes: (formData.get("acceptedTypes") || ".pdf, .doc, .docx")
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t), // Remove empty values
        maxFileSize: (parseInt(formData.get("maxFileSize")) || 5) * 1048576, // Default 5MB
      },
      switcher: {
        options: Array.from(
          document.querySelectorAll('[name^="switcherOption_"]')
        )
          .map((input) => input.value)
          .filter((val) => val.trim()).length
          ? Array.from(document.querySelectorAll('[name^="switcherOption_"]'))
              .map((input) => input.value)
              .filter((val) => val.trim())
          : ["Yes", "No"], // Default values if none provided
      },
      slider: {
        min: parseInt(formData.get("min")) || 0,
        max: parseInt(formData.get("max")) || 100,
        step: parseInt(formData.get("step")) || 1,
        defaultValue: parseInt(formData.get("defaultValue")) || 50,
        labels: Array.from(
          document.querySelectorAll("#sliderLabels .input-group")
        ).reduce((acc, group) => {
          const value = group.querySelector('[name="labelValue"]')?.value;
          const text = group.querySelector('[name="labelText"]')?.value;
          if (value && text) acc[value] = text;
          return acc;
        }, {}),
      },
      multipleChoice: {
        choices: Array.from(
          document.querySelectorAll("#multipleChoices .input-group")
        )
          .map((group, i) => ({
            value: formData.get(`mcValue_${i}`) || `option_${i + 1}`,
            label: formData.get(`mcLabel_${i}`) || `Option ${i + 1}`,
            description: "",
          }))
          .filter((choice) => choice.value && choice.label),
      },
      cardChoice: {
        columns: parseInt(formData.get("columns")) || 2,
        choices: Array.from(document.querySelectorAll("#cardChoices .card"))
          .map((card, i) => ({
            value: formData.get(`choiceValue_${i}`) || `value_${i}`,
            label: formData.get(`choiceLabel_${i}`) || `Choice ${i + 1}`,
            icon: formData.get(`choiceIcon_${i}`) || "",
            description: formData.get(`choiceDesc_${i}`) || "",
          }))
          .filter((choice) => choice.value && choice.label),
      },
    };

    // Add safe default if type doesn't exist
    return updates[type] || {};
  }

  async saveForm(templateId) {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      // Delete existing fields first
      const { error: deleteError } = await this.supabase
        .from("service_form_fields")
        .delete()
        .eq("template_id", templateId);

      if (deleteError) throw deleteError;

      // If there are fields to save
      if (this.fields.length > 0) {
        const formFields = this.fields.map((field, index) => ({
          template_id: templateId,
          field_type: field.type,
          field_label: field.label,
          field_name: field.name,
          is_required: field.required,
          field_order: index,
          field_options: field.options,
          placeholder: field.options?.placeholder || null,
        }));

        const { data, error } = await this.supabase
          .from("service_form_fields")
          .insert(formFields)
          .select();

        if (error) throw error;
        return data;
      }
      return [];
    } catch (error) {
      console.error("Error saving form:", error);
      throw new Error(`Failed to save fields: ${error.message}`);
    }
  }

  loadForm(fields) {
    this.fields = fields.map((f) => ({
      id: f.id,
      type: f.field_type,
      label: f.field_label,
      name: f.field_name,
      required: f.is_required,
      order: f.field_order,
      options: f.field_options,
    }));
    this.renderFields();
  }
}
