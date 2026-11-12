
(() => {
  "use strict";

  function create(quill, saveCallback) {
    if (!quill) throw new Error("Quill editor not found.");

    const panel = document.createElement("section");
    panel.id = "quantam-document-tools";

    panel.style.cssText = `
      margin:12px 0;
      padding:14px;
      border:1px solid #dce1ea;
      border-radius:12px;
      background:var(--panel-bg,#fff);
      color:var(--text-color,inherit);
      display:grid;
      gap:12px;
    `;

    panel.innerHTML = `
      <strong>Document Tools</strong>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input id="qdtFind" type="search"
          placeholder="Find text"
          style="flex:1;min-width:130px;padding:10px">
        <button id="qdtFindBtn" type="button">Find Next</button>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input id="qdtReplace" type="text"
          placeholder="Replace with"
          style="flex:1;min-width:130px;padding:10px">
        <button id="qdtReplaceBtn" type="button">Replace</button>
        <button id="qdtAllBtn" type="button">Replace All</button>
      </div>

      <div id="qdtMessage" style="font-size:13px">
        Search inside your document.
      </div>

      <hr>

      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
        gap:10px
      ">
        <div><small>Words</small><div id="qdtWords">0</div></div>
        <div><small>Characters</small><div id="qdtChars">0</div></div>
        <div><small>Without Spaces</small><div id="qdtNoSpaces">0</div></div>
        <div><small>Paragraphs</small><div id="qdtParagraphs">0</div></div>
      </div>
    `;

    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) throw new Error("Editor toolbar not found.");

    toolbar.insertAdjacentElement("afterend", panel);

    const $ = id => panel.querySelector("#" + id);

    function getText() {
      return quill.getText().replace(/\n$/, "");
    }

    function updateCount() {
      const text = getText();
      const trimmed = text.trim();

      const words = trimmed
        ? trimmed.split(/\s+/u).length
        : 0;

      const paragraphs = text
        .split(/\n/)
        .filter(line => line.trim().length > 0).length;

      $("qdtWords").textContent = words;
      $("qdtChars").textContent = text.length;
      $("qdtNoSpaces").textContent =
        text.replace(/\s/g, "").length;
      $("qdtParagraphs").textContent = paragraphs;
    }

    function findNext() {
      const query = $("qdtFind").value;
      const text = getText();

      if (!query) {
        $("qdtMessage").textContent = "Enter text to find.";
        return;
      }

      const selection = quill.getSelection();
      const start = selection ? selection.index + selection.length : 0;

      let index = text.toLocaleLowerCase()
        .indexOf(query.toLocaleLowerCase(), start);

      if (index === -1 && start > 0) {
        index = text.toLocaleLowerCase()
          .indexOf(query.toLocaleLowerCase(), 0);
      }

      if (index === -1) {
        $("qdtMessage").textContent = "No matching text found.";
        return;
      }

      quill.setSelection(index, query.length, "user");
      quill.focus();

      $("qdtMessage").textContent =
        "Match found at character " + (index + 1) + ".";
    }

    function replaceCurrent() {
      const query = $("qdtFind").value;
      const replacement = $("qdtReplace").value;
      const selection = quill.getSelection();

      if (!query || !selection || selection.length !== query.length) {
        $("qdtMessage").textContent =
          "Find a matching result first.";
        return;
      }

      const selected = quill.getText(
        selection.index,
        selection.length
      );

      if (selected.toLocaleLowerCase() !== query.toLocaleLowerCase()) {
        $("qdtMessage").textContent =
          "The selected text does not match the search.";
        return;
      }

      quill.deleteText(selection.index, selection.length, "user");
      quill.insertText(selection.index, replacement, "user");

      quill.setSelection(
        selection.index + replacement.length,
        0,
        "silent"
      );

      $("qdtMessage").textContent = "One match replaced.";

      updateCount();
      if (typeof saveCallback === "function") saveCallback();
    }

    function replaceAll() {
      const query = $("qdtFind").value;
      const replacement = $("qdtReplace").value;

      if (!query) {
        $("qdtMessage").textContent = "Enter text to find.";
        return;
      }

      const text = getText();
      const lower = text.toLocaleLowerCase();
      const search = query.toLocaleLowerCase();

      let count = 0;
      let position = 0;

      while (true) {
        const index = lower.indexOf(search, position);
        if (index === -1) break;

        quill.deleteText(index, query.length, "user");
        quill.insertText(index, replacement, "user");

        position = index + replacement.length;
        count++;
      }

      $("qdtMessage").textContent =
        count + " matching occurrence(s) replaced.";

      updateCount();
      if (typeof saveCallback === "function") saveCallback();
    }

    $("qdtFindBtn").addEventListener("click", findNext);
    $("qdtReplaceBtn").addEventListener("click", replaceCurrent);
    $("qdtAllBtn").addEventListener("click", replaceAll);

    $("qdtFind").addEventListener("keydown", event => {
      if (event.key === "Enter") findNext();
    });

    quill.on("text-change", updateCount);
    updateCount();

    return {
      destroy() {
        quill.off("text-change", updateCount);
        panel.remove();
      }
    };
  }

  window.QUANTAM_DOCUMENT_TOOLS = { create };
})();
  
