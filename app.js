const stateLabel = document.getElementById("marketState");
const titleEl = document.getElementById("recommendTitle");
const updatedAtEl = document.getElementById("updatedAt");
const sampleMetaEl = document.getElementById("sampleMeta");
const listEl = document.getElementById("recommendations");
const eligibleEl = document.getElementById("eligibleCount");
const rawEl = document.getElementById("rawCount");
const modelEl = document.getElementById("modelVersion");
const footnoteEl = document.getElementById("footnote");
const refreshButton = document.getElementById("refreshButton");

async function loadRecommendations() {
  refreshButton.classList.add("loading");
  const result = await window.DaaDataClient.loadLatest();
  if (result.payload) {
    render(result.payload);
  } else {
    renderError(result.error);
  }
  if (result.source === "local") {
    stateLabel.textContent = "使用本机缓存推荐";
  }
  refreshButton.classList.remove("loading");
}

function render(payload) {
  const mode = recommendationTitle(payload);
  const rows = payload.recommendations || [];
  stateLabel.textContent = payload.marketState || "后端评分已更新";
  titleEl.textContent = mode;
  updatedAtEl.textContent = payload.generatedAt || "--";
  sampleMetaEl.textContent = `${payload.sampleIntervalMinutes || 5}分钟采样`;
  eligibleEl.textContent = numberText(payload.filterStats?.eligibleCount);
  rawEl.textContent = numberText(payload.filterStats?.rawCount);
  modelEl.textContent = payload.modelVersion || "--";
  footnoteEl.textContent = payload.note || "只展示总分最高的推荐结果。";

  if (!rows.length) {
    listEl.innerHTML = `<div class="empty-state">暂无推荐结果</div>`;
    return;
  }
  listEl.innerHTML = rows.slice(0, 5).map((item) => rowHtml(item)).join("");
}

function rowHtml(item) {
  const tags = [
    `现价 ${priceText(item.price)}`,
    `推荐率 ${pct(item.recommendRate)}`
  ];
  const planned = plannedInvestmentText(item.plannedInvestment);
  if (planned) tags.push(`计划投入: ${planned}`);
  tags.push(item.action || "优先观察");
  return `
    <article class="stock-row">
      <div class="rank">
        <strong>${score(item.totalScore)}</strong>
        <span>总分</span>
      </div>
      <div>
        <div class="stock-title">
          <strong>${escapeHtml(item.name || "--")}</strong>
          <span>${escapeHtml(item.code || "--")}</span>
        </div>
        <div class="stock-tags">
          ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderError(error) {
  stateLabel.textContent = "推荐读取失败";
  listEl.innerHTML = `
    <div class="error-state">
      ${escapeHtml(readableError(error))}
    </div>
  `;
}

function recommendationTitle(payload) {
  if (payload.recommendationType === "next_week") return "下周推荐";
  if (payload.recommendationType === "tomorrow") return "明日推荐";
  return "今日推荐";
}

function readableError(error) {
  const message = error?.name === "AbortError" ? "请求超时" : (error?.message || "网络异常");
  if (message === "all_data_sources_failed") {
    return "多路行情源暂时不可用，请刷新或稍后重试";
  }
  if (/failed to fetch/i.test(message)) {
    return "数据读取失败，请刷新页面或切换到 http://ilovemoney.asia/";
  }
  return message;
}

function numberText(value) {
  if (typeof value !== "number") return "--";
  return value.toLocaleString("zh-CN");
}

function pct(value) {
  if (typeof value !== "number") return "--";
  return `${Math.round(value)}%`;
}

function score(value) {
  if (typeof value !== "number") return "--";
  return String(Math.round(value));
}

function priceText(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "--";
  return `${number.toFixed(number >= 10 ? 2 : 3)}元`;
}

function plannedInvestmentText(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  return `${Math.round(number).toLocaleString("zh-CN")}元`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

refreshButton.addEventListener("click", loadRecommendations);
loadRecommendations();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((registration) => {
      registration.update().catch(() => {});
    }).catch(() => {});
  });
}
