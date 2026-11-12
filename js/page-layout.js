
(() => {
  "use strict";

  const STORAGE_KEY = "quantam_docs_page_layout_v1";

  const PAGE_SIZES = {
    A4: [210, 297],
    A5: [148, 210],
    Letter: [215.9, 279.4],
    Legal: [215.9, 355.6]
  };

  function create() {
    if (document.getElementById("qpl-panel")) return;

    const toolbar = document.querySelector(".toolbar");
    const editor = document.querySelector("#editor");
    const stage = document.querySelector(".stage");

    if (!toolbar || !editor || !stage) {
      throw new Error("Editor layout elements not found.");
    }

    const panel = document.createElement("section");
    panel.id = "qpl-panel";
    panel.className = "panel no-print";
    panel.style.cssText = `
      margin:12px 0;
      display:grid;
      gap:12px;
    `;

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

    const $ = id => panel.querySelector("#" + id);

    const printStyle = document.createElement("style");
    printStyle.id = "qpl-print-style";
    document.head.appendChild(printStyle);

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

    function showStatus(text, error = false) {
      $("qplStatus").textContent = text;
      $("qplStatus").style.color = error ? "#b42318" : "#687386";
    }

    function apply(settings, save = true) {
      const dimensions = PAGE_SIZES[settings.size];

      if (!dimensions) {
        showStatus("Invalid page size.", true);
        return;
      }

      const margins = [
        settings.top,
        settings.bottom,
        settings.left,
        settings.right
      ];

      if (margins.some(value =>
        !Number.isFinite(value) || value < 5 || value > 50
      )) {
        showStatus("Margins must be between 5 and 50 mm.", true);
        return;
      }

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
          `${settings.top}mm ${settings.right}mm ` +
          `${settings.bottom}mm ${settings.left}mm`;
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

      if (save) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
          showStatus("Settings could not be saved.", true);
          return;
        }
      }

      showStatus(
        `${settings.size} ${settings.orientation} applied. ` +
        "Use Print / PDF to check the printed pages."
      );
    }

    function loadSettings() {
      try {
        const saved = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || "null"
        );

        const settings = saved || {
          size: "A4",
          orientation: "portrait",
          top: 20,
          bottom: 20,
          left: 20,
          right: 20
        };

        $("qplSize").value = PAGE_SIZES[settings.size]
          ? settings.size : "A4";

        $("qplOrientation").value =
          settings.orientation === "landscape"
            ? "landscape" : "portrait";

        $("qplTop").value = settings.top ?? 20;
        $("qplBottom").value = settings.bottom ?? 20;
        $("qplLeft").value = settings.left ?? 20;
        $("qplRight").value = settings.right ?? 20;

        apply(getSettings(), false);
      } catch (error) {
        showStatus("Could not load page settings.", true);
      }
    }

    $("qplApply").addEventListener("click", () => {
      apply(getSettings());
    });

    $("qplDefault").addEventListener("click", () => {
      $("qplSize").value = "A4";
      $("qplOrientation").value = "portrait";
      $("qplTop").value = 20;
      $("qplBottom").value = 20;
      $("qplLeft").value = 20;
      $("qplRight").value = 20;

      apply(getSettings());
    });

    loadSettings();
  }

  window.QUANTAM_PAGE_LAYOUT = { create };
})();
      
