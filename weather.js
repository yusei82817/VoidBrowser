(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const form = $("#weather-form");
  const cityInput = $("#weather-city");
  const refreshButton = $("#weather-refresh");
  const status = $("#weather-status");
  const cityLabel = $("#weather-place");
  const temperature = $("#weather-temperature");
  const description = $("#weather-description");
  const highLow = $("#weather-high-low");
  const details = $("#weather-details");
  const updated = $("#weather-updated");

  if (!form || !cityInput || !status || !temperature) return;

  const weatherLabels = {
    0: "快晴", 1: "晴れ", 2: "一部くもり", 3: "くもり",
    45: "霧", 48: "着氷性の霧",
    51: "弱い霧雨", 53: "霧雨", 55: "強い霧雨",
    56: "弱い凍雨", 57: "強い凍雨",
    61: "弱い雨", 63: "雨", 65: "強い雨",
    66: "弱い凍雨", 67: "強い凍雨",
    71: "弱い雪", 73: "雪", 75: "強い雪", 77: "霧雪",
    80: "弱いにわか雨", 81: "にわか雨", 82: "強いにわか雨",
    85: "弱いにわか雪", 86: "強いにわか雪",
    95: "雷雨", 96: "ひょうを伴う雷雨", 99: "強い雷雨"
  };

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.setAttribute("role", isError ? "alert" : "status");
    status.dataset.state = isError ? "error" : "normal";
  }

  function number(value) {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  function currentHourIndex(times) {
    if (!Array.isArray(times) || times.length === 0) return 0;
    const now = Date.now();
    let best = 0;
    for (let i = 0; i < times.length; i++) {
      const timestamp = new Date(times[i]).getTime();
      if (Number.isFinite(timestamp) && timestamp <= now) best = i;
      else if (Number.isFinite(timestamp)) break;
    }
    return best;
  }

  async function loadWeather(city) {
    const query = city.trim();
    if (!query) {
      showStatus("都市名を入力してください。", true);
      cityInput.focus();
      return;
    }

    refreshButton.disabled = true;
    showStatus("天気データを取得中…");
    try {
      const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geoUrl.search = new URLSearchParams({
        name: query,
        count: "1",
        language: "ja",
        format: "json"
      }).toString();

      const geoResponse = await fetch(geoUrl);
      if (!geoResponse.ok) throw new Error("地域検索に失敗しました (HTTP " + geoResponse.status + ")。");
      const geo = await geoResponse.json();
      const place = geo.results && geo.results[0];
      if (!place) throw new Error("地域が見つかりません。市区町村名を変えてください。");

      const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
      forecastUrl.search = new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
        hourly: "precipitation_probability",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        timezone: "auto",
        forecast_days: "1"
      }).toString();

      const forecastResponse = await fetch(forecastUrl);
      if (!forecastResponse.ok) throw new Error("天気データの取得に失敗しました (HTTP " + forecastResponse.status + ")。");
      const data = await forecastResponse.json();
      if (!data.current) throw new Error("天気データの形式を確認できませんでした。");

      const current = data.current;
      const daily = data.daily || {};
      const hourly = data.hourly || {};
      const index = currentHourIndex(hourly.time);
      const temp = number(current.temperature_2m);
      const feels = number(current.apparent_temperature);
      const humidity = number(current.relative_humidity_2m);
      const wind = number(current.wind_speed_10m);
      const rainChance = number((hourly.precipitation_probability || [])[index]);
      const dailyRain = number((daily.precipitation_probability_max || [])[0]);
      const max = number((daily.temperature_2m_max || [])[0]);
      const min = number((daily.temperature_2m_min || [])[0]);
      const region = [place.admin2, place.admin1, place.country].filter(Boolean);
      const uniqueRegion = [...new Set(region)].slice(0, 2).join(" · ");

      cityLabel.textContent = place.name + (uniqueRegion ? " · " + uniqueRegion : "");
      temperature.textContent = temp === null ? "--°" : temp + "°";
      description.textContent = weatherLabels[current.weather_code] || "天候情報";
      highLow.textContent = "最高 " + (max === null ? "--" : max + "°") +
        " / 最低 " + (min === null ? "--" : min + "°");
      details.textContent = [
        "体感 " + (feels === null ? "--" : feels + "°"),
        "湿度 " + (humidity === null ? "--" : humidity + "%"),
        "風 " + (wind === null ? "--" : wind + " km/h"),
        "降水確率 " + (rainChance === null ? (dailyRain === null ? "--" : dailyRain + "%") : rainChance + "%")
      ].join("　·　");
      updated.textContent = "取得時刻 " + new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
      showStatus("最新の取得データ");
      try { localStorage.setItem("voidbrowser-weather-city", query); } catch (_) {}
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "天気データを取得できませんでした。", true);
    } finally {
      refreshButton.disabled = false;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    loadWeather(cityInput.value);
  });
  refreshButton.addEventListener("click", () => loadWeather(cityInput.value));

  try {
    cityInput.value = localStorage.getItem("voidbrowser-weather-city") || "静岡市";
  } catch (_) {
    cityInput.value = "静岡市";
  }
  loadWeather(cityInput.value);
})();