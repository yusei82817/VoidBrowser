(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const searchForm = $("#youtube-search-form");
  const searchInput = $("#youtube-query");
  const playerForm = $("#youtube-player-form");
  const urlInput = $("#youtube-url");
  const player = $("#youtube-player");
  const status = $("#youtube-status");
  const empty = $("#youtube-empty");
  const clearButton = $("#youtube-clear");

  if (!searchForm || !searchInput || !playerForm || !urlInput || !player || !status || !empty) return;

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("youtube-error", isError);
  }

  function extractVideoId(value) {
    const input = String(value || "").trim();
    if (/^[\w-]{11}$/.test(input)) return input;

    try {
      const url = new URL(input);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host === "youtu.be") {
        return url.pathname.split("/").filter(Boolean)[0] || null;
      }
      if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
        if (url.pathname === "/watch") return url.searchParams.get("v");
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || null;
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  function loadVideo(value) {
    const id = extractVideoId(value);
    if (!id || !/^[\w-]{11}$/.test(id)) {
      setStatus("有効なYouTube動画URL、または11文字の動画IDを入力してください。", true);
      return;
    }

    const frame = document.createElement("iframe");
    frame.title = "YouTube video player";
    frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id);
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allowFullscreen = true;
    frame.loading = "lazy";
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups");
    player.replaceChildren(frame);
    empty.hidden = true;
    setStatus("動画プレーヤーを読み込みました。再生できない場合は、埋め込み制限やログイン要件を確認してください。");
    urlInput.value = value;
  }

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) {
      searchInput.focus();
      return;
    }
    const target = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
    window.open(target, "_blank", "noopener,noreferrer");
    setStatus("YouTubeの検索結果を新しいタブで開くよう要求しました。動画URLを下の欄に貼り付けると、このパネルで再生できます。");
  });

  playerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadVideo(urlInput.value);
  });

  urlInput.addEventListener("paste", () => {
    window.setTimeout(() => {
      if (urlInput.value.trim()) loadVideo(urlInput.value);
    }, 0);
  });

  clearButton?.addEventListener("click", () => {
    player.replaceChildren();
    empty.hidden = false;
    urlInput.value = "";
    setStatus("プレーヤーをクリアしました。");
  });

  window.VoidYouTube = Object.freeze({ extractVideoId, loadVideo });
})();