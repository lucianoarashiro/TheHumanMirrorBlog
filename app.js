const POSTS = Array.isArray(window.POSTS) ? window.POSTS : [];

const $ = (sel) => document.querySelector(sel);

function formatDateEN(iso){
  try{
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"2-digit" });
  }catch{
    return iso || "";
  }
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function renderStoryHtml(rawText){
  const t = String(rawText ?? "").trim();
  if(!t) return "";
  const parts = t.split(/\n\s*\n+/g).map(s => s.trim()).filter(Boolean);
  return parts.map(p => `<p>${escapeHtml(p)}</p>`).join("");
}

function setGiscusTerm(term){
  try{
    window.postMessage(
      { giscus: { setConfig: { term } } },
      "https://giscus.app"
    );
  }catch{}
}

const postsGrid = $("#postsGrid");
const listView = $("#listView");
const postView = $("#postView");

const crumbPost = $("#crumbPost");
const crumbChapter = $("#crumbChapter");
const homeLink = $("#homeLink");

const btnToggleToc = $("#btnToggleToc");
const btnCloseToc = $("#btnCloseToc");
const btnBackHome = $("#btnBackHome");
const btnTop = $("#btnTop");

const btnPdf = $("#btnPdf");
const btnPdfBottom = $("#btnPdfBottom");

const tocMeta = $("#tocMeta");
const tocList = $("#tocList");

const postKicker = $("#postKicker");
const postTitle = $("#postTitle");
const postDesc = $("#postDesc");
const pagesEl = $("#pages");

let currentPost = null;

function updatePdfButtons(post){
  const pdfPath = post?.pdf && String(post.pdf).trim() ? String(post.pdf).trim() : null;
  const pdfName = pdfPath ? pdfPath.split("/").pop() : "download.pdf";

  [btnPdf, btnPdfBottom].forEach(btn => {
    if(!btn) return;

    if(pdfPath){
      btn.hidden = false;
      btn.href = pdfPath;
      btn.setAttribute("download", pdfName);
      btn.setAttribute("target", "_blank");
      btn.setAttribute("rel", "noopener");
    }else{
      btn.hidden = true;
      btn.removeAttribute("href");
      btn.removeAttribute("download");
      btn.removeAttribute("target");
      btn.removeAttribute("rel");
    }
  });
}

function renderList(){
  postsGrid.innerHTML = "";

  if(!POSTS.length){
    postsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; color: rgba(21,21,21,.72); line-height:1.55;">
        No posts found. Make sure <strong>posts.js</strong> loads and defines <strong>window.POSTS</strong>.
      </div>
    `;
    return;
  }

  POSTS.forEach(post => {
    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open post: ${post.title}`);

    const cover = document.createElement("div");
    cover.className = "card-cover";
    cover.style.backgroundImage = `url('${post.coverImage || ""}')`;

    const body = document.createElement("div");
    body.className = "card-body";

    const h = document.createElement("h3");
    h.className = "card-title";
    h.textContent = post.title || "Untitled";

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.textContent = post.excerpt || "";

    body.appendChild(h);
    body.appendChild(meta);
    card.appendChild(cover);
    card.appendChild(body);

    card.addEventListener("click", () => openPost(post.id));
    card.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        openPost(post.id);
      }
    });

    postsGrid.appendChild(card);
  });
}

function openPost(postId){
  currentPost = POSTS.find(p => p.id === postId);
  if(!currentPost) return;

  listView.classList.remove("view-active");
  postView.classList.add("view-active");

  crumbPost.textContent = currentPost.title || "Post";
  crumbChapter.textContent = "Start";

  postKicker.textContent = `${currentPost.author || "The Human Mirror"} • ${formatDateEN(currentPost.date)}`;
  postTitle.textContent = currentPost.title || "";
  postDesc.textContent = currentPost.description || "";

  renderToc();
  renderChapters();
  updatePdfButtons(currentPost);
  setGiscusTerm(currentPost.id);

  window.scrollTo({ top: 0, behavior: "smooth" });

  if(window.matchMedia("(max-width: 980px)").matches){
    document.body.classList.add("toc-collapsed");
  }else{
    document.body.classList.remove("toc-collapsed");
  }
}

function goHome(){
  currentPost = null;
  postView.classList.remove("view-active");
  listView.classList.add("view-active");

  crumbPost.textContent = "—";
  crumbChapter.textContent = "—";

  document.body.classList.remove("toc-collapsed");
  updatePdfButtons(null);
  setGiscusTerm("home");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderToc(){
  const chapters = Array.isArray(currentPost.chapters) ? currentPost.chapters : [];
  const pages = Array.isArray(currentPost.pages) ? currentPost.pages : [];

  tocMeta.textContent = `${pages.length} sections • ${chapters.length} chapters`;
  tocList.innerHTML = "";

  chapters.forEach((ch, idx) => {
    const a = document.createElement("a");
    a.className = "toc-link";
    a.href = `#${ch.id}`;
    a.dataset.chapterId = ch.id;
    a.innerHTML = `
      <div><strong>${idx + 1}. ${escapeHtml(ch.title || "Chapter")}</strong></div>
      <small>${escapeHtml(ch.subtitle || "")}</small>
    `;

    a.addEventListener("click", () => {
      crumbChapter.textContent = ch.title || "Chapter";
      if(window.matchMedia("(max-width: 980px)").matches){
        document.body.classList.add("toc-collapsed");
      }
    });

    tocList.appendChild(a);
  });
}

let revealObserver = null;
let chapterObserver = null;

function renderChapters(){
  pagesEl.innerHTML = "";

  const chapters = Array.isArray(currentPost.chapters) ? currentPost.chapters : [];
  const pages = Array.isArray(currentPost.pages) ? currentPost.pages : [];

  chapters.forEach((ch, idx) => {
    const section = document.createElement("section");
    section.className = "chapter-block reveal";
    section.dataset.chapterTitle = ch.title || "Chapter";
    section.dataset.chapterId = ch.id;
    section.id = ch.id;

    const chapterPages = pages.filter(p => p.chapterId === ch.id);

    chapterPages.forEach((p) => {
      const card = document.createElement("article");
      card.className = "chapter-card";

      const label = p.label || ch.title || `Section ${idx + 1}`;
      const imgSrc = p.image || "";
      const chapterNumber = String(idx + 1).padStart(2, "0");

      card.innerHTML = `
        <div class="chapter-cover-wrap">
          <div class="chapter-cover">
            <div class="media-fallback" aria-hidden="true">
              <div>
                <strong>Image placeholder</strong>
                <div>${escapeHtml(label)}</div>
                <div style="margin-top:6px; opacity:.85;">(Set <code>image</code> in your JSON)</div>
              </div>
            </div>
            <img src="${imgSrc}" alt="${escapeHtml(label)}" loading="lazy" />
            <div class="cover-overlay">
              <div class="cover-number">Chapter ${chapterNumber}</div>
              <h3 class="cover-title">${escapeHtml(ch.title || label)}</h3>
              ${ch.subtitle ? `<div class="cover-subtitle">${escapeHtml(ch.subtitle)}</div>` : ""}
            </div>
          </div>
        </div>

        <div class="chapter-text-card">
          <div class="chapter-label">${escapeHtml(label)}</div>
          <div class="story">${renderStoryHtml(p.text)}</div>
        </div>
      `;

      const img = card.querySelector("img");
      const fallback = card.querySelector(".media-fallback");

      if(!imgSrc){
        img.style.display = "none";
        fallback.style.display = "flex";
      }else{
        fallback.style.display = "none";
        img.addEventListener("error", () => {
          img.style.display = "none";
          fallback.style.display = "flex";
        });
        img.addEventListener("load", () => {
          img.style.display = "block";
          fallback.style.display = "none";
        });
      }

      section.appendChild(card);
    });

    pagesEl.appendChild(section);
  });

  setupRevealObserver();
  setupChapterObserver();
}

function setupRevealObserver(){
  if(revealObserver) revealObserver.disconnect();

  const targets = document.querySelectorAll(".reveal");
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("is-visible");
      }
    });
  }, { threshold: 0.08 });

  targets.forEach(t => revealObserver.observe(t));
}

function setActiveToc(chapterId){
  const links = tocList.querySelectorAll(".toc-link");
  links.forEach(a => a.classList.toggle("is-active", a.dataset.chapterId === chapterId));
}

function setupChapterObserver(){
  if(chapterObserver) chapterObserver.disconnect();

  const sections = document.querySelectorAll(".chapter-block");
  chapterObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if(visible){
      const title = visible.target.dataset.chapterTitle || "—";
      const chapterId = visible.target.dataset.chapterId || "";
      crumbChapter.textContent = title;
      if(chapterId) setActiveToc(chapterId);
    }
  }, { threshold: [0.15, 0.35, 0.55] });

  sections.forEach(s => chapterObserver.observe(s));
}

btnBackHome.addEventListener("click", goHome);

homeLink.addEventListener("click", (e) => {
  if(currentPost){
    e.preventDefault();
    goHome();
  }
});

btnToggleToc.addEventListener("click", () => {
  document.body.classList.toggle("toc-collapsed");
});

btnCloseToc.addEventListener("click", () => {
  document.body.classList.add("toc-collapsed");
});

btnTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderList();
updatePdfButtons(null);
crumbPost.textContent = "—";
crumbChapter.textContent = "—";