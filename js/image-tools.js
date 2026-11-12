
(() => {
  "use strict";

  const STYLE_ID = "quantam-image-manager-style";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .qim-panel {
        background: #fff;
        border: 1px solid #dce1ea;
        border-radius: 10px;
        padding: 12px;
        margin: 10px 0;
        display: grid;
        gap: 10px;
      }
      .qim-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .qim-panel input {
        min-width: 0;
        width: 100%;
        max-width: 150px;
        padding: 9px;
        border: 1px solid #ccd3df;
        border-radius: 7px;
      }
      .qim-results {
        display: grid;
        grid-template-columns: repeat(auto-fill,minmax(125px,1fr));
        gap: 10px;
      }
      .qim-result {
        border: 1px solid #dce1ea;
        border-radius: 8px;
        padding: 7px;
        background: white;
        text-align: left;
        min-width: 0;
      }
      .qim-result img {
        width: 100%;
        height: 105px;
        object-fit: contain;
        background: #f1f3f7;
        display: block;
      }
      .qim-result small {
        display: block;
        overflow-wrap: anywhere;
        margin-top: 5px;
      }
      .qim-note {
        color: #687386;
        font-size: 12px;
        line-height: 1.5;
      }
      .qim-selected {
        outline: 3px solid #6366f1 !important;
        outline-offset: 2px;
      }
      @media(max-width:600px) {
        .qim-panel input { max-width: 100%; flex: 1 1 100px; }
      }
    `;
    document.head.appendChild(style);
  }

  function createManager(quill, saveCallback) {
    if (!quill) throw new Error("Quill editor is required.");

    addStyles();

    const panel = document.createElement("section");
    panel.className = "qim-panel";
    panel.innerHTML = `
      <strong>Image Manager</strong>

      <div class="qim-row">
        <button type="button" id="qimUpload">＋ Upload Image</button>
        <button type="button" id="qimSearchToggle">Search Online Images</button>
        <input type="file" id="qimFile" accept="image/*" hidden>
      </div>

      <div class="qim-row">
        <label>Width (px)
          <input type="number" id="qimWidth" min="1" max="3000" placeholder="Width">
        </label>
        <label>Height (px)
          <input type="number" id="qimHeight" min="1" max="3000" placeholder="Height">
        </label>
        <label>
          <input type="checkbox" id="qimKeepRatio" checked>
          Keep ratio
        </label>
      </div>

      <div class="qim-row">
        <button type="button" id="qimApply">Apply Size</button>
        <button type="button" id="qimNatural">Original Size</button>
        <button type="button" id="qimRemove">Remove Image</button>
      </div>

      <div id="qimOnline" hidden>
        <div class="qim-row">
          <input id="qimQuery" type="search"
            placeholder="Search images, e.g. Solar System">
          <button type="button" id="qimSearch">Search</button>
        </div>
        <div class="qim-note">
          Search results are from Wikimedia Commons.
          Check each image's licence and attribution before reuse.
        </div>
        <div id="qimResults" class="qim-results"></div>
      </div>

      <div class="qim-note" id="qimMessage">
        Select an image inside the document to resize it.
      </div>
    `;

    const editorElement = quill.root;
    const toolbar = document.querySelector(".toolbar");

    if (!toolbar) {
      throw new Error("Editor toolbar was not found.");
    }

    toolbar.insertAdjacentElement("afterend", panel);

    const $ = id => panel.querySelector("#" + id);

    let selectedImage = null;
    let originalRatio = 1;

    function message(text) {
      $("qimMessage").textContent = text;
    }

    function selectImage(img) {
      if (selectedImage) {
        selectedImage.classList.remove("qim-selected");
      }

      selectedImage = img;
      selectedImage.classList.add("qim-selected");

      const width = img.getBoundingClientRect().width;
      const height = img.getBoundingClientRect().height;

      $("qimWidth").value = Math.round(width);
      $("qimHeight").value = Math.round(height);

      originalRatio = width && height ? width / height : 1;
      message("Image selected. Change width and height, then Apply Size.");
    }

    function clearSelection() {
      if (selectedImage) {
        selectedImage.classList.remove("qim-selected");
      }
      selectedImage = null;
    }

    editorElement.addEventListener("click", event => {
      const img = event.target.closest("img");

      if (img && editorElement.contains(img)) {
        selectImage(img);
      } else {
        clearSelection();
      }
    });

    $("qimUpload").addEventListener("click", () => {
      $("qimFile").click();
    });

    function insertImage(source, alt = "Inserted image") {
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength() - 1;

      quill.insertEmbed(index, "image", source, "user");
      quill.setSelection(index + 1, 0, "silent");

      setTimeout(() => {
        const images = editorElement.querySelectorAll("img");
        const img = images[images.length - 1];

        if (img) {
          img.alt = alt;
          selectImage(img);
        }

        if (typeof saveCallback === "function") {
          saveCallback();
        }
      }, 100);
    }

    function fileToDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Image could not be read."));
        reader.readAsDataURL(file);
      });
    }

    $("qimFile").addEventListener("change", async event => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        message("Please choose an image file.");
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        message("Image is larger than 8 MB. Choose a smaller image.");
        event.target.value = "";
        return;
      }

      try {
        message("Loading image...");
        const dataURL = await fileToDataURL(file);
        insertImage(dataURL, file.name);
        message("Image inserted. Save your document.");
      } catch (error) {
        message(error.message);
      }

      event.target.value = "";
    });

    $("qimApply").addEventListener("click", () => {
      if (!selectedImage || !editorElement.contains(selectedImage)) {
        message("First select an image inside the document.");
        return;
      }

      const width = Number($("qimWidth").value);
      const height = Number($("qimHeight").value);

      if (!width || !height || width < 1 || height < 1 ||
          width > 3000 || height > 3000) {
        message("Enter valid width and height between 1 and 3000.");
        return;
      }

      selectedImage.removeAttribute("width");
      selectedImage.removeAttribute("height");

      selectedImage.style.width = width + "px";
      selectedImage.style.height = height + "px";
      selectedImage.style.maxWidth = "100%";

      message("Image size updated. Save your document.");

      if (typeof saveCallback === "function") saveCallback();
    });

    $("qimWidth").addEventListener("input", () => {
      if (!$("qimKeepRatio").checked || !selectedImage) return;

      const width = Number($("qimWidth").value);
      if (width > 0 && originalRatio > 0) {
        $("qimHeight").value = Math.round(width / originalRatio);
      }
    });

    $("qimHeight").addEventListener("input", () => {
      if (!$("qimKeepRatio").checked || !selectedImage) return;

      const height = Number($("qimHeight").value);
      if (height > 0 && originalRatio > 0) {
        $("qimWidth").value = Math.round(height * originalRatio);
      }
    });

    $("qimNatural").addEventListener("click", () => {
      if (!selectedImage) {
        message("Select an image first.");
        return;
      }

      selectedImage.style.width = "";
      selectedImage.style.height = "";
      selectedImage.style.maxWidth = "100%";

      $("qimWidth").value = Math.round(selectedImage.naturalWidth);
      $("qimHeight").value = Math.round(selectedImage.naturalHeight);

      message("Original display size restored.");
      if (typeof saveCallback === "function") saveCallback();
    });

    $("qimRemove").addEventListener("click", () => {
      if (!selectedImage) {
        message("Select an image first.");
        return;
      }

      selectedImage.remove();
      selectedImage = null;
      message("Image removed.");
      if (typeof saveCallback === "function") saveCallback();
    });

    $("qimSearchToggle").addEventListener("click", () => {
      $("qimOnline").hidden = !$("qimOnline").hidden;
    });

    async function searchCommons() {
      const query = $("qimQuery").value.trim();
      if (!query) {
        message("Enter an image search term.");
        return;
      }

      $("qimResults").textContent = "Searching...";
      message("Searching Wikimedia Commons...");

      const params = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: query,
        gsrnamespace: "6",
        gsrlimit: "12",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "320",
        format: "json",
        origin: "*"
      });

      try {
        const response = await fetch(
          "https://commons.wikimedia.org/w/api.php?" + params
        );

        if (!response.ok) throw new Error("Image search request failed.");

        const data = await response.json();
        const pages = Object.values(data.query?.pages || {});

        $("qimResults").replaceChildren();

        if (!pages.length) {
          $("qimResults").textContent = "No images found.";
          message("No matching images found.");
          return;
        }

        pages.forEach(page => {
          const info = page.imageinfo?.[0];
          if (!info) return;

          const thumb = info.thumburl || info.url;
          const original = info.url;
          const meta = info.extmetadata || {};

          const author = meta.Artist?.value || "Author not listed";
          const licence = meta.LicenseShortName?.value ||
                          meta.UsageTerms?.value ||
                          "Licence not listed";
          const sourcePage = page.title
            ? "https://commons.wikimedia.org/wiki/" +
              encodeURIComponent(page.title.replaceAll(" ", "_"))
            : "";

          const card = document.createElement("button");
          card.type = "button";
          card.className = "qim-result";

          const image = document.createElement("img");
          image.src = thumb;
          image.alt = page.title || "Wikimedia image";

          const title = document.createElement("small");
          title.textContent = page.title || "Untitled image";

          const details = document.createElement("small");
          details.textContent = "Author: " + author +
            " | Licence: " + licence;

          card.append(image, title, details);

          card.addEventListener("click", async () => {
            try {
              message("Preparing selected image...");

              let source = original;

              try {
                const fileResponse = await fetch(original);
                if (!fileResponse.ok) throw new Error("Fetch failed");

                const blob = await fileResponse.blob();

                if (blob.size > 8 * 1024 * 1024) {
                  throw new Error("Image exceeds 8 MB.");
                }

                source = await fileToDataURL(blob);
              } catch (error) {
                if (error.message === "Image exceeds 8 MB.") {
                  throw error;
                }
                message("Could not embed image locally; inserting its online URL.");
              }

              insertImage(source, page.title || "Wikimedia image");

              const attribution = [
                "Image: " + (page.title || "Wikimedia Commons"),
                "Author: " + author,
                "Licence: " + licence,
                "Source: " + sourcePage
              ].join("\n");

              const range = quill.getSelection(true);
              const index = range ? range.index : quill.getLength() - 1;

              quill.insertText(index, "\n" + attribution + "\n", "user");

              if (typeof saveCallback === "function") saveCallback();

              message("Image inserted. Verify its licence before publishing.");
            } catch (error) {
              message("Could not insert image: " + error.message);
            }
          });

          $("qimResults").appendChild(card);
        });

        message("Choose an image. Check its licence before reuse.");
      } catch (error) {
        $("qimResults").textContent = "Search failed. Check your internet connection.";
        message(error.message);
      }
    }

    $("qimSearch").addEventListener("click", searchCommons);

    $("qimQuery").addEventListener("keydown", event => {
      if (event.key === "Enter") searchCommons();
    });

    return {
      destroy() {
        panel.remove();
        clearSelection();
      }
    };
  }

  window.QUANTAM_IMAGE_MANAGER = { create: createManager };
})();
      
