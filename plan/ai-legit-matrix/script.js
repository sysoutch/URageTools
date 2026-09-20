const states = ["empty", "ok", "bad", "maybe"];
    const symbols = { empty: "", ok: "✓", bad: "✕", maybe: "?" };

    const starterRows = [
      {
        action: "Generate text from image",
        source: "Described text itself, like OCR or alt text",
        made: "maybe", licensed: "maybe", copies: "bad", transformative: "ok", disclosed: "maybe",
        notes: "Usually OK when used for description, accessibility, search, notes, or personal reference.",
      },
      {
        action: "Generate text from image",
        source: "Described text itself, but it includes licensed things",
        made: "bad", licensed: "bad", copies: "maybe", transformative: "maybe", disclosed: "maybe",
        notes: "Probably problematic if it reproduces or markets around licensed characters, brands, artwork, or protected creative expression.",
      },
      {
        action: "Generate text from image",
        source: "Text from an image you made",
        made: "ok", licensed: "ok", copies: "bad", transformative: "ok", disclosed: "maybe",
        notes: "Usually OK. You control the source, assuming it does not contain someone else’s protected material.",
      },
      {
        action: "Generate text from image",
        source: "Text from an image you did not make",
        made: "bad", licensed: "maybe", copies: "maybe", transformative: "maybe", disclosed: "maybe",
        notes: "Maybe problematic. Safer for personal notes or accessibility; riskier for publication, commercial use, or copying protected text.",
      },
      {
        action: "Generate 3D/model/asset from image",
        source: "Image you made or own",
        made: "ok", licensed: "ok", copies: "bad", transformative: "ok", disclosed: "maybe",
        notes: "Often OK when you own the image and the output is not copying someone else’s protected design.",
      },
      {
        action: "Generate 3D/model/asset from image",
        source: "Image made by someone else",
        made: "bad", licensed: "bad", copies: "maybe", transformative: "maybe", disclosed: "bad",
        notes: "Higher risk. This can become derivative work or asset cloning, especially for art, products, characters, logos, or paid content.",
      },
      {
        action: "Train or fine-tune model",
        source: "Dataset you created or have rights to use",
        made: "ok", licensed: "ok", copies: "bad", transformative: "ok", disclosed: "ok",
        notes: "Usually the cleanest route, provided privacy, consent, data protection, and contract terms are handled.",
      },
      {
        action: "Train or fine-tune model",
        source: "Scraped copyrighted or licensed material",
        made: "bad", licensed: "bad", copies: "maybe", transformative: "maybe", disclosed: "bad",
        notes: "Legally and ethically messy. Also a fine way to collect lawsuits like trading cards.",
      }
    ];

    const tbody = document.querySelector("tbody");
    const jsonOut = document.getElementById("jsonOut");

    function cycleState(el) {
      const current = el.dataset.state || "empty";
      const next = states[(states.indexOf(current) + 1) % states.length];
      setMark(el, next);
      updateVerdicts();
      save();
    }

    function setMark(el, state) {
      el.dataset.state = state;
      el.className = "mark " + state;
      el.textContent = symbols[state];
      el.setAttribute("aria-label", state === "empty" ? "blank" : state);
    }

    function makeMark(state) {
      const el = document.createElement("span");
      el.tabIndex = 0;
      el.role = "button";
      setMark(el, state || "empty");
      el.addEventListener("click", () => cycleState(el));
      el.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cycleState(el);
        }
      });
      return el;
    }

    function editable(text = "") {
      const div = document.createElement("div");
      div.className = "editable";
      div.contentEditable = "true";
      div.textContent = text;
      div.addEventListener("input", () => { updateVerdicts(); save(); });
      return div;
    }

    function verdictFor(row) {
      const marks = [...row.querySelectorAll(".mark")].map(m => m.dataset.state);
      const [made, licensed, copies, transformative, disclosed] = marks;
      let score = 0;
      if (made === "ok") score += 2;
      if (licensed === "ok") score += 2;
      if (copies === "bad") score += 2;
      if (transformative === "ok") score += 1;
      if (disclosed === "ok") score += 1;
      if (made === "bad") score -= 2;
      if (licensed === "bad") score -= 3;
      if (copies === "ok" || copies === "maybe") score -= 2;
      if (transformative === "bad") score -= 1;
      if (disclosed === "bad") score -= 1;
      if (marks.includes("maybe")) score -= 0.5;

      if (score >= 3) return { label: "Usually OK", cls: "ok" };
      if (score <= -2) return { label: "Risky / probably not", cls: "bad" };
      return { label: "Depends", cls: "maybe" };
    }

    function updateVerdicts() {
      [...tbody.rows].forEach(row => {
        const cell = row.querySelector(".verdict-cell");
        const v = verdictFor(row);
        cell.innerHTML = `<span class="verdict ${v.cls}">${v.label}</span>`;
      });
    }

    function addRow(data = {}) {
      const tr = document.createElement("tr");
      const cells = [
        editable(data.action || ""),
        editable(data.source || ""),
        makeMark(data.made),
        makeMark(data.licensed),
        makeMark(data.copies),
        makeMark(data.transformative),
        makeMark(data.disclosed),
        null,
        editable(data.notes || ""),
        null
      ];

      cells.forEach((child, i) => {
        const td = document.createElement("td");
        if ([2,3,4,5,6,9].includes(i)) td.className = "small";
        if (i === 7) {
          td.className = "verdict-cell medium";
        } else if (i === 9) {
          const wrap = document.createElement("div");
          wrap.className = "row-actions";
          const btn = document.createElement("button");
          btn.className = "delete-row danger";
          btn.textContent = "×";
          btn.title = "Remove row";
          btn.addEventListener("click", () => { tr.remove(); updateVerdicts(); save(); });
          wrap.appendChild(btn);
          td.appendChild(wrap);
        } else {
          td.appendChild(child);
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
      updateVerdicts();
      save();
    }

    function getRows() {
      return [...tbody.rows].map(row => {
        const editableCells = row.querySelectorAll(".editable");
        const marks = row.querySelectorAll(".mark");
        return {
          action: editableCells[0].textContent.trim(),
          source: editableCells[1].textContent.trim(),
          made: marks[0].dataset.state,
          licensed: marks[1].dataset.state,
          copies: marks[2].dataset.state,
          transformative: marks[3].dataset.state,
          disclosed: marks[4].dataset.state,
          verdict: row.querySelector(".verdict").textContent.trim(),
          notes: editableCells[2].textContent.trim()
        };
      });
    }

    function save() {
      localStorage.setItem("aiLegitMatrixRows", JSON.stringify(getRows()));
    }

    function load() {
      tbody.innerHTML = "";
      const saved = localStorage.getItem("aiLegitMatrixRows");
      const rows = saved ? JSON.parse(saved) : starterRows;
      rows.forEach(addRow);
      updateVerdicts();
    }

    function reset() {
      localStorage.removeItem("aiLegitMatrixRows");
      tbody.innerHTML = "";
      starterRows.forEach(addRow);
      updateVerdicts();
      save();
    }

    function toMarkdown(rows) {
      const header = "| AI action | Input / source | You made it? | Licensed? | Copies protected expression? | Transformative? | Disclosed? | Verdict | Notes |";
      const sep = "|---|---|---|---|---|---|---|---|---|";
      const mark = s => symbols[s] || "";
      const clean = s => String(s).replaceAll("|", "\\|").replace(/\n/g, " ");
      const body = rows.map(r => `| ${clean(r.action)} | ${clean(r.source)} | ${mark(r.made)} | ${mark(r.licensed)} | ${mark(r.copies)} | ${mark(r.transformative)} | ${mark(r.disclosed)} | ${clean(r.verdict)} | ${clean(r.notes)} |`).join("\n");
      return [header, sep, body].join("\n");
    }

    function describeCurrentAssets() {
      const rows = getRows();
      return [
        {
          kind: "text",
          title: "AI legitimacy matrix",
          fileName: "ai-legitimacy-matrix.json",
          mimeType: "application/json",
          textContent: JSON.stringify(rows, null, 2),
          metadata: { sourceTool: "ai-legit-matrix", resourceFormat: "matrix-json" }
        },
        {
          kind: "text",
          title: "AI legitimacy matrix Markdown",
          fileName: "ai-legitimacy-matrix.md",
          mimeType: "text/markdown",
          textContent: toMarkdown(rows),
          metadata: { sourceTool: "ai-legit-matrix", resourceFormat: "matrix-markdown" }
        }
      ];
    }

    window.describeCurrentAssets = describeCurrentAssets;
    window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
    window.__urageToolDescribeCurrentAsset = () => describeCurrentAssets()[0] || null;

    document.getElementById("addRow").addEventListener("click", () => addRow({
      action: "New AI use case",
      source: "Describe the input/source here",
      made: "empty", licensed: "empty", copies: "empty", transformative: "empty", disclosed: "empty",
      notes: "Add reasoning here. Annoying, but useful."
    }));

    document.getElementById("resetRows").addEventListener("click", reset);

    document.getElementById("clearRows").addEventListener("click", () => {
      tbody.innerHTML = "";
      save();
      jsonOut.value = "Cleared.";
    });

    document.getElementById("exportJson").addEventListener("click", async () => {
      const text = JSON.stringify(getRows(), null, 2);
      jsonOut.value = text;
      try { await navigator.clipboard.writeText(text); jsonOut.value += "\n\nCopied JSON to clipboard."; } catch {}
    });

    document.getElementById("copyMarkdown").addEventListener("click", async () => {
      const text = toMarkdown(getRows());
      jsonOut.value = text;
      try { await navigator.clipboard.writeText(text); jsonOut.value += "\n\nCopied Markdown to clipboard."; } catch {}
    });

    load();