
(() => {
  "use strict";

  const STORAGE_PREFIX = "quantam_docs_page_layout_v2_";

  const DEFAULT_SETTINGS = {
    size: "A4",
    orientation: "portrait",
    top: 20,
    bottom: 20,
    left: 20,
    right: 20
  };

  const PAGE_SIZES = {
    A4: [210, 297],
    A5: [148, 210],
    Letter: [215.9, 279.4],
    Legal: [215.9, 355.6]
  };

  let activeDocumentId = null;
  let getDocumentId = () => null;
  let panel = null;
  let editor = null;
  let printStyle = null;

  function create(getId) {
    if (document.getElementById("qpl-panel")) return;

    getDocumentId = typeof getId === "function" ? getId : () => null;

    const toolbar = document.querySelector(".toolbar");
    editor = document.querySelector("#editor");
    const stage = document.querySelector(".stage");

    if (!toolbar || !editor || !stage) {
      throw new Error("Editor layout elements not found.");
    }

    panel = document.createElement("section");
    panel.id = "qpl-panel";
    panel.className = "panel no-print";

    panel.innerHTML = `
      <strong>Page Layout & Page Setup</strong>

      <div class="qpl-grid">
        <label>
          Page Size
          <select id="qplSize">
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </label>

        <label>
          Orientation
          <select id="qplOrientation">
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
      </div>

      <strong>Page Margins (mm)</strong>

      <div class="qpl-grid">
        <label>Top
          <input id="qplTop" type="number" min="5" max="50" value="20">
        </label>

        <label>Bottom
          <input id="qplBottom" type="number" min="5" max="50" value="20">
        </label>

        <label>Left
          <input id="qplLeft" type="number" min="5" max="50" value="20">
        </label>

        <label>Right
          <input id="qplRight" type="number" min="5" max="50" value="20">
        </label>
      </div>

      <div class="qpl-actions">
        <button type="button" id="qplApply">Apply Layout</button>
        <button type="button" id="qplDefault">Default A4</button>
      </div>

      <div id="qplStatus" class="hint">
        Choose your page settings.
      </div>
    `;

    panel.style.cssText = "margin:12px 0;display:grid;gap:12px;";

    const style = document.createElement("style");
    style.id = "qpl-style";
    style.textContent = `
      #qpl-panel label {
        display:grid;
        gap:5px;
        font-size:13px;
      }

      #qpl-panel select,
      #qpl-panel input {
        width:100%;
        min-width:0;
        padding:9px;
        border:1px solid #dce1ea;
        border-radius:7px;
        background:white;
        color:#172033;
        font-size:14px;
      }

      .qpl-grid {
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:9px;
      }

      .qpl-actions {
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      }

      @media(max-width:600px) {
        .qpl-grid {
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
      }
    `;

    document.head.appendChild(style);
    toolbar.insertAdjacentElement("afterend", panel);

    printStyle = document.getElementById("qpl-print-style");

    if (!printStyle) {
      printStyle = document.createElement("style");
      printStyle.id = "qpl-print-style";
      document.head.appendChild(printStyle);
    }

    const $ = id => panel.querySelector("#" + id);

    function getSettings() {
      return {
        size: $("qplSize").value,
        orientation: $("qplOrientation").value,
        top: Number($("qplTop").value),
        bottom: Number($("qplBottom").value),
        left: Number($("qplLeft").value),
        right: Number($("qplRight").value)
      };
    }

    function showStatus(message, error = false) {
      $("qplStatus").textContent = message;
      $("qplStatus").style.color = error ? "#b42318" : "#687386";
    }

    function validate(settings) {
      if (!PAGE_SIZES[settings.size]) return false;

      if (
        settings.orientation !== "portrait" &&
        settings.orientation !== "landscape"
      ) return false;

      return [
        settings.top,
        settings.bottom,
        settings.left,
        settings.right
      ].every(value =>
        Number.isFinite(value) && value >= 5 && value <= 50
      );
    }

    function saveSettings(settings) {
      const id = getDocumentId();

      if (!id) {
        showStatus("Document ID not available. Settings not saved.", true);
        return false;
      }

      try {
        localStorage.setItem(
          STORAGE_PREFIX + id,
          JSON.stringify(settings)
        );
        return true;
      } catch (error) {
        showStatus("Settings could not be saved.", true);
        return false;
      }
    }

    function apply(settings, save = true) {
      if (!validate(settings)) {
        showStatus("Check page size, orientation and margins.", true);
        return false;
      }

      const dimensions = PAGE_SIZES[settings.size];
      let [width, height] = dimensions;

      if (settings.orientation === "landscape") {
        [width, height] = [height, width];
      }

      const pxWidth = width * 96 / 25.4;
      const pxHeight = height * 96 / 25.4;

      editor.style.width = pxWidth + "px";
      editor.style.maxWidth = "100%";

      const content = editor.querySelector(".ql-editor");

      if (content) {
        content.style.minHeight = pxHeight + "px";
        content.style.padding =
          settings.top + "mm " +
          settings.right + "mm " +
          settings.bottom + "mm " +
          settings.left + "mm";
        content.style.boxSizing = "border-box";
      }

      printStyle.textContent = `
        @page {
          size: ${settings.size} ${settings.orientation};
          margin: ${settings.top}mm ${settings.right}mm
                  ${settings.bottom}mm ${settings.left}mm;
        }

        @media print {
          .topbar, .sidebar, .docbar, .toolbar,
          .no-print {
            display:none !important;
          }

          .layout {
            display:block !important;
            padding:0 !important;
            margin:0 !important;
          }

          .stage {
            padding:0 !important;
            margin:0 !important;
            border:0 !important;
            background:white !important;
          }

          #editor {
            width:auto !important;
            max-width:none !important;
            border:0 !important;
            box-shadow:none !important;
            margin:0 !important;
          }

          #editor .ql-editor {
            min-height:0 !important;
            padding:0 !important;
            overflow:visible !important;
          }

          #editor img {
            max-width:100% !important;
          }
        }
      `;

      if (save && !saveSettings(settings)) return false;

      showStatus(
        settings.size + " " + settings.orientation +
        " applied for this document."
      );

      return true;
    }

    function load(docId) {
      activeDocumentId = docId || getDocumentId();

      let settings = { ...DEFAULT_SETTINGS };

      if (activeDocumentId) {
        try {
          const saved = localStorage.getItem(
            STORAGE_PREFIX + activeDocumentId
          );

          if (saved) {
            const parsed = JSON.parse(saved);

            if (validate(parsed)) {
              settings = parsed;
            }
          }
        } catch (error) {
          console.warn("Page settings could not be loaded.", error);
        }
      }

      $("qplSize").value = settings.size;
      $("qplOrientation").value = settings.orientation;
      $("qplTop").value = settings.top;
      $("qplBottom").value = settings.bottom;
      $("qplLeft").value = settings.left;
      $("qplRight").value = settings.right;

      apply(settings, false);
      showStatus("Settings loaded for this document.");
    }

    $("qplApply").addEventListener("click", () => {
      apply(getSettings(), true);
    });

    $("qplDefault").addEventListener("click", () => {
      $("qplSize").value = DEFAULT_SETTINGS.size;
      $("qplOrientation").value = DEFAULT_SETTINGS.orientation;
      $("qplTop").value = DEFAULT_SETTINGS.top;
      $("qplBottom").value = DEFAULT_SETTINGS.bottom;
      $("qplLeft").value = DEFAULT_SETTINGS.left;
      $("qplRight").value = DEFAULT_SETTINGS.right;

      apply(getSettings(), true);
    });

    load(getDocumentId());
  }

  window.QUANTAM_PAGE_LAYOUT = {
    create,
    load
  };
})();
