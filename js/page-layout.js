
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
  let pendingSettings = { ...DEFAULT_SETTINGS };

  function validate(s) {
    if (!s || !PAGE_SIZES[s.size]) return false;

    if (
      s.orientation !== "portrait" &&
      s.orientation !== "landscape"
    ) return false;

    return ["top", "bottom", "left", "right"].every(key =>
      Number.isFinite(Number(s[key])) &&
      Number(s[key]) >= 5 &&
      Number(s[key]) <= 50
    );
  }

  function readSettings(id) {
    const settings = { ...DEFAULT_SETTINGS };

    if (!id) return settings;

    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + id);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (validate(parsed)) {
          return {
            size: parsed.size,
            orientation: parsed.orientation,
            top: Number(parsed.top),
            bottom: Number(parsed.bottom),
            left: Number(parsed.left),
            right: Number(parsed.right)
          };
        }
      }
    } catch (error) {
      console.warn("Page settings could not be loaded.", error);
    }

    return settings;
  }

  function saveSettings(settings) {
    const id = getDocumentId() || activeDocumentId;

    if (!id) {
      showStatus("Document ID not available.", true);
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

  function control(id) {
    return panel ? panel.querySelector("#" + id) : null;
  }

  function showStatus(message, error = false) {
    const status = control("qplStatus");

    if (!status) return;

    status.textContent = message;
    status.style.color = error ? "#b42318" : "#687386";
  }

  function getSettings() {
    return {
      size: control("qplSize").value,
      orientation: control("qplOrientation").value,
      top: Number(control("qplTop").value),
      bottom: Number(control("qplBottom").value),
      left: Number(control("qplLeft").value),
      right: Number(control("qplRight").value)
    };
  }

  function fillControls(settings) {
    if (!panel) return;

    control("qplSize").value = settings.size;
    control("qplOrientation").value = settings.orientation;
    control("qplTop").value = settings.top;
    control("qplBottom").value = settings.bottom;
    control("qplLeft").value = settings.left;
    control("qplRight").value = settings.right;
  }

  function apply(settings, save = true) {
    if (!validate(settings)) {
      showStatus("Check page size, orientation and margins.", true);
      return false;
    }

    editor = document.querySelector("#editor");

    if (!editor) {
      showStatus("Editor not found.", true);
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

    if (printStyle) {
      printStyle.textContent = `
        @page {
          size: ${settings.size} ${settings.orientation};
          margin: ${settings.top}mm ${settings.right}mm
                  ${settings.bottom}mm ${settings.left}mm;
        }

        @media print {
          .topbar,
          .sidebar,
          .docbar,
          .toolbar,
          .no-print {
            display: none !important;
          }

          .layout {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .stage {
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            background: white !important;
          }

          #editor {
            width: auto !important;
            max-width: none !important;
            border: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
          }

          #editor .ql-editor {
            min-height: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          #editor img {
            max-width: 100% !important;
          }
        }
      `;
    }

    if (save && !saveSettings(settings)) return false;

    pendingSettings = { ...settings };

    showStatus(
      settings.size + " " + settings.orientation +
      " applied for this document."
    );

    return true;
  }

  function load(docId) {
    activeDocumentId = docId || getDocumentId() || null;

    pendingSettings = readSettings(activeDocumentId);

    if (!panel) return true;

    fillControls(pendingSettings);
    return apply(pendingSettings, false);
  }

  function create(getId, mountElement) {
    getDocumentId = typeof getId === "function" ? getId : () => null;

    if (panel && panel.isConnected) {
      load(getDocumentId());
      return {
        panel,
        destroy() {
          panel.remove();
          panel = null;
        }
      };
    }

    editor = document.querySelector("#editor");

    if (!editor) {
      throw new Error("Editor element not found.");
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
          <input id="qplTop" type="number" min="5" max="50">
        </label>

        <label>Bottom
          <input id="qplBottom" type="number" min="5" max="50">
        </label>

        <label>Left
          <input id="qplLeft" type="number" min="5" max="50">
        </label>

        <label>Right
          <input id="qplRight" type="number" min="5" max="50">
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

    let style = document.getElementById("qpl-style");

    if (!style) {
      style = document.createElement("style");
      style.id = "qpl-style";
      document.head.appendChild(style);
    }

    style.textContent = `
      #qpl-panel label {
        display: grid;
        gap: 5px;
        font-size: 13px;
      }

      #qpl-panel select,
      #qpl-panel input {
        width: 100%;
        min-width: 0;
        padding: 9px;
        border: 1px solid #dce1ea;
        border-radius: 7px;
        background: white;
        color: #172033;
        font-size: 14px;
      }

      #qpl-panel .qpl-grid {
        display: grid;
        grid-template-columns: repeat(4,minmax(0,1fr));
        gap: 9px;
      }

      #qpl-panel .qpl-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      @media(max-width:600px) {
        #qpl-panel .qpl-grid {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }
      }
    `;

    const mount =
      typeof mountElement === "string"
        ? document.querySelector(mountElement)
        : mountElement;

    if (mount && mount.appendChild) {
      mount.appendChild(panel);
    } else {
      const toolbar = document.querySelector(".toolbar");

      if (!toolbar) {
        throw new Error("Toolbar or Layout tab container not found.");
      }

      toolbar.insertAdjacentElement("afterend", panel);
    }

    printStyle = document.getElementById("qpl-print-style");

    if (!printStyle) {
      printStyle = document.createElement("style");
      printStyle.id = "qpl-print-style";
      document.head.appendChild(printStyle);
    }

    control("qplApply").addEventListener("click", () => {
      apply(getSettings(), true);
    });

    control("qplDefault").addEventListener("click", () => {
      fillControls({ ...DEFAULT_SETTINGS });
      apply({ ...DEFAULT_SETTINGS }, true);
    });

    load(getDocumentId());

    return {
      panel,
      destroy() {
        if (panel) panel.remove();
        panel = null;
      }
    };
  }

  window.QUANTAM_PAGE_LAYOUT = {
    create,
    load
  };
})();
