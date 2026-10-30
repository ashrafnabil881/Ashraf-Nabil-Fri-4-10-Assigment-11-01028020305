
const NASA_API_KEY = "DEMO_KEY";
const NASA_APOD_URL = "https://api.nasa.gov/planetary/apod";

const LAUNCHES_URL =
    "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?limit=10&format=json";

const PLANETS_URL = "https://solar-system-opendata-proxy.vercel.app/api/planets";

const FALLBACK = "Not available";

const $ = (selector) => document.querySelector(selector);

async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
}


function el(tag, className = "", text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function icon(classes) {
    return el("i", classes);
}

function setText(selector, value, fallback = FALLBACK) {
    const node = $(selector);
    if (!node) return;
    const isEmpty =
        value === undefined ||
        value === null ||
        value === "" ||
        (typeof value === "number" && Number.isNaN(value));
    node.textContent = isEmpty ? fallback : value;
}

const isNum = (n) => typeof n === "number" && !Number.isNaN(n);

const formatNumber = (n, digits = 2) =>
    isNum(n) ? n.toLocaleString("en-US", { maximumFractionDigits: digits }) : null;

function messageBlock(iconClasses, text, extraClass = "") {
    const wrapper = el("div", `text-center py-12 col-span-full ${extraClass}`);
    wrapper.appendChild(icon(`${iconClasses} text-4xl mb-4`));
    wrapper.appendChild(el("p", "text-slate-400", text));
    return wrapper;
}

const loadingBlock = (text) =>
    messageBlock("fas fa-spinner fa-spin text-blue-400", text);

const errorBlock = (text) =>
    messageBlock("fas fa-exclamation-triangle text-yellow-400", text);

function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatLongDate(isoDate) {
    if (!isoDate) return null;
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function formatShortDate(isoDate) {
    if (!isoDate) return null;
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatLaunchDate(iso, long = false) {
    const date = new Date(iso);
    if (!iso || Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: long ? "long" : "short",
        day: "numeric",
        timeZone: "UTC",
    });
}

function formatLaunchTime(iso) {
    const date = new Date(iso);
    if (!iso || Number.isNaN(date.getTime())) return null;
    return (
        date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "UTC",
        }) + " UTC"
    );
}

const apod = {
    container: () => $("#apod-image-container"),
    loading: () => $("#apod-loading"),
    image: () => $("#apod-image"),
};

function showApodLoading() {
    apod.loading()?.classList.remove("hidden");
    apod.image()?.classList.add("hidden");
    apod.container()?.querySelector("#apod-video")?.remove();
    apod.container()?.querySelector("#apod-error")?.remove();
}

function hideApodLoading() {
    apod.loading()?.classList.add("hidden");
}

function showApodError(message) {
    const container = apod.container();
    if (!container) return;
    container.querySelector("#apod-error")?.remove();
    const box = errorBlock(message);
    box.id = "apod-error";
    container.appendChild(box);
    apod.image()?.classList.add("hidden");
}

async function getTodayInSpace(date) {
    showApodLoading();

    try {
        let url = `${NASA_APOD_URL}?api_key=${NASA_API_KEY}`;
        if (date) url += `&date=${date}`;

        const data = await fetchJSON(url);
        renderApod(data);
    } catch (error) {
        console.error("Failed to load NASA APOD:", error);
        showApodError("We couldn't load the Astronomy Picture of the Day. Please try again later.");
    } finally {
        hideApodLoading();
    }
}

function renderApod(data) {
    const container = apod.container();
    const img = apod.image();

    if (data.media_type === "video" && data.url) {
        img?.classList.add("hidden");
        const iframe = document.createElement("iframe");
        iframe.id = "apod-video";
        iframe.className = "w-full h-full";
        iframe.src = data.url;
        iframe.title = data.title || "NASA APOD video";
        iframe.allowFullscreen = true;
        iframe.setAttribute("frameborder", "0");
        container?.insertBefore(iframe, img?.nextSibling || null);
    } else if (data.url && img) {
        img.onload = () => img.classList.remove("hidden");
        img.onerror = () => {
            img.classList.add("hidden");
            showApodError("The image for this day could not be displayed.");
        };
        img.src = data.url;
        img.alt = data.title || "Astronomy Picture of the Day";
    } else {
        showApodError("No media is available for this day.");
    }

    const fullResBtn = container?.querySelector("button");
    if (fullResBtn) {
        const fullUrl = data.hdurl || data.url;
        fullResBtn.onclick = fullUrl
            ? () => window.open(fullUrl, "_blank", "noopener")
            : null;
    }

    const longDate = formatLongDate(data.date);
    setText("#apod-date", longDate ? `Astronomy Picture of the Day - ${longDate}` : null,
        "Astronomy Picture of the Day");
    setText("#apod-title", data.title, "Untitled");
    setText("#apod-explanation", data.explanation, "No description available.");
    setText("#apod-date-info", data.date);
    setText(
        "#apod-media-type",
        data.media_type ? data.media_type.charAt(0).toUpperCase() + data.media_type.slice(1) : null
    );

    const dateDetail = $("#apod-date-detail");
    if (dateDetail) {
        dateDetail.textContent = "";
        dateDetail.appendChild(icon("far fa-calendar mr-2"));
        dateDetail.appendChild(document.createTextNode(data.date || FALLBACK));
    }

    const copyright = $("#apod-copyright");
    if (copyright) {
        if (data.copyright) {
            copyright.textContent = `© ${data.copyright.trim().replace(/\s+/g, " ")}`;
            copyright.classList.remove("hidden");
        } else {
            copyright.textContent = "© Public Domain (NASA)";
        }
    }

    const input = $("#apod-date-input");
    if (input && data.date) {
        input.value = data.date;
        updateDateLabel(data.date);
    }
}

function updateDateLabel(isoDate) {
    const label = $("#apod-date-input")?.parentElement?.querySelector("span");
    if (label) label.textContent = formatShortDate(isoDate) || "";
}

function setupApodControls() {
    const input = $("#apod-date-input");
    const today = toISODate(new Date());

    if (input) {
        input.max = today;
        input.value = today;
        updateDateLabel(today);
        input.addEventListener("change", () => updateDateLabel(input.value));
    }

    $("#load-date-btn")?.addEventListener("click", () => {
        if (input?.value) getTodayInSpace(input.value);
    });

    $("#today-apod-btn")?.addEventListener("click", () => {
        if (input) {
            input.value = today;
            updateDateLabel(today);
        }
        getTodayInSpace();
    });
}

function statusClasses(abbrev = "", forFeatured = false) {
    const s = abbrev.toLowerCase();
    if (s === "go" || s === "success") {
        return forFeatured ? "bg-green-500/20 text-green-400" : "bg-green-500/90 text-white";
    }
    if (s === "tbc" || s === "hold" || s === "in flight") {
        return forFeatured ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-500/90 text-white";
    }
    return forFeatured ? "bg-blue-500/20 text-blue-400" : "bg-blue-500/90 text-white";
}

function getLaunchInfo(launch) {
    return {
        name: launch?.name || "Unnamed launch",
        status: launch?.status?.abbrev || launch?.status?.name || "Status unavailable",
        provider: launch?.launch_service_provider?.name || null,
        rocket: launch?.rocket?.configuration?.name || null,
        location:
            launch?.pad?.location?.name || launch?.pad?.name || null,
        country: launch?.pad?.location?.country?.name || null,
        description: launch?.mission?.description || null,
        image: launch?.image?.image_url || launch?.image?.thumbnail_url || null,
        date: formatLaunchDate(launch?.net),
        longDate: formatLaunchDate(launch?.net, true),
        time: formatLaunchTime(launch?.net),
        net: launch?.net,
    };
}

function launchImage(info, iconClass, wrapperClass, imgClass) {
    const wrapper = el("div", wrapperClass);
    const placeholder = icon(iconClass);

    if (info.image) {
        const img = el("img", imgClass);
        img.src = info.image;
        img.alt = info.name;
        img.loading = "lazy";
        img.onerror = () => {
            img.remove();
            wrapper.prepend(placeholder);
        };
        wrapper.appendChild(img);
    } else {
        wrapper.appendChild(placeholder);
    }
    return wrapper;
}

function createInfoRow(iconClass, text, clamp = false) {
    const row = el("div", "flex items-center gap-2 text-sm");
    row.appendChild(icon(`${iconClass} text-slate-500 w-4`));
    row.appendChild(el("span", `text-slate-300${clamp ? " line-clamp-1" : ""}`, text));
    return row;
}

function createLaunchCard(launch) {
    const info = getLaunchInfo(launch);

    const card = el(
        "div",
        "bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer"
    );

    const top = launchImage(
        info,
        "fas fa-space-shuttle text-5xl text-slate-700",
        "relative h-48 bg-slate-900/50 flex items-center justify-center",
        "w-full h-full object-cover"
    );
    const badgeWrap = el("div", "absolute top-3 right-3");
    badgeWrap.appendChild(
        el(
            "span",
            `px-3 py-1 ${statusClasses(info.status)} backdrop-blur-sm rounded-full text-xs font-semibold`,
            info.status
        )
    );
    top.appendChild(badgeWrap);
    card.appendChild(top);

    const body = el("div", "p-5");

    const head = el("div", "mb-3");
    head.appendChild(
        el(
            "h4",
            "font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors",
            info.name
        )
    );
    if (info.provider) {
        const provider = el("p", "text-sm text-slate-400 flex items-center gap-2");
        provider.appendChild(icon("fas fa-building text-xs"));
        provider.appendChild(document.createTextNode(info.provider));
        head.appendChild(provider);
    }
    body.appendChild(head);

    const rows = el("div", "space-y-2 mb-4");
    rows.appendChild(createInfoRow("fas fa-calendar", info.date || "Date unavailable"));
    rows.appendChild(createInfoRow("fas fa-clock", info.time || "Time unavailable"));
    if (info.rocket) rows.appendChild(createInfoRow("fas fa-rocket", info.rocket));
    if (info.location) rows.appendChild(createInfoRow("fas fa-map-marker-alt", info.location, true));
    body.appendChild(rows);

    const footer = el("div", "flex items-center gap-2 pt-4 border-t border-slate-700");
    footer.appendChild(
        el(
            "button",
            "flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold",
            "Details"
        )
    );
    const heart = el("button", "px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors");
    heart.appendChild(icon("far fa-heart"));
    footer.appendChild(heart);
    body.appendChild(footer);

    card.appendChild(body);
    return card;
}

function createDetailBox(iconClass, label, value, small = false) {
    const box = el("div", "bg-slate-900/50 rounded-xl p-4");
    const title = el("p", "text-xs text-slate-400 mb-1 flex items-center gap-2");
    title.appendChild(icon(iconClass));
    title.appendChild(document.createTextNode(label));
    box.appendChild(title);
    box.appendChild(el("p", small ? "font-semibold text-sm" : "font-semibold", value || FALLBACK));
    return box;
}

function daysUntil(iso) {
    const diff = new Date(iso).getTime() - Date.now();
    if (Number.isNaN(diff)) return null;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function renderFeaturedLaunch(launch) {
    const container = $("#featured-launch");
    if (!container) return;
    container.textContent = "";

    const info = getLaunchInfo(launch);

    const card = el(
        "div",
        "relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all"
    );
    card.appendChild(
        el(
            "div",
            "absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
        )
    );

    const grid = el("div", "relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8");

    const left = el("div", "flex flex-col justify-between");
    const top = el("div");

    const badges = el("div", "flex items-center gap-3 mb-4");
    const featured = el(
        "span",
        "px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2"
    );
    featured.appendChild(icon("fas fa-star"));
    featured.appendChild(document.createTextNode("Featured Launch"));
    badges.appendChild(featured);
    badges.appendChild(
        el(
            "span",
            `px-4 py-1.5 ${statusClasses(info.status, true)} rounded-full text-sm font-semibold`,
            info.status
        )
    );
    top.appendChild(badges);

    top.appendChild(el("h3", "text-3xl font-bold mb-3 leading-tight", info.name));

    const meta = el("div", "flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400");
    if (info.provider) {
        const p = el("div", "flex items-center gap-2");
        p.appendChild(icon("fas fa-building"));
        p.appendChild(el("span", "", info.provider));
        meta.appendChild(p);
    }
    if (info.rocket) {
        const r = el("div", "flex items-center gap-2");
        r.appendChild(icon("fas fa-rocket"));
        r.appendChild(el("span", "", info.rocket));
        meta.appendChild(r);
    }
    top.appendChild(meta);

    const days = daysUntil(info.net);
    if (days !== null) {
        const countdown = el(
            "div",
            "inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6"
        );
        countdown.appendChild(icon("fas fa-clock text-2xl text-blue-400"));
        const cd = el("div");
        cd.appendChild(el("p", "text-2xl font-bold text-blue-400", String(days)));
        cd.appendChild(el("p", "text-xs text-slate-400", days === 1 ? "Day Until Launch" : "Days Until Launch"));
        countdown.appendChild(cd);
        top.appendChild(countdown);
    }

    const details = el("div", "grid xl:grid-cols-2 gap-4 mb-6");
    details.appendChild(createDetailBox("fas fa-calendar", "Launch Date", info.longDate));
    details.appendChild(createDetailBox("fas fa-clock", "Launch Time", info.time));
    details.appendChild(createDetailBox("fas fa-map-marker-alt", "Location", info.location, true));
    details.appendChild(createDetailBox("fas fa-globe", "Country", info.country));
    top.appendChild(details);

    if (info.description) {
        top.appendChild(el("p", "text-slate-300 leading-relaxed mb-6", info.description));
    }
    left.appendChild(top);

    const actions = el("div", "flex flex-col md:flex-row gap-3");
    const detailsBtn = el(
        "button",
        "flex-1 self-start md:self-center px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2"
    );
    detailsBtn.appendChild(icon("fas fa-info-circle"));
    detailsBtn.appendChild(document.createTextNode("View Full Details"));
    actions.appendChild(detailsBtn);

    const icons = el("div", "icons self-end md:self-center");
    ["far fa-heart", "fas fa-bell"].forEach((cls) => {
        const b = el("button", "px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors");
        b.appendChild(icon(cls));
        icons.appendChild(b);
    });
    actions.appendChild(icons);
    left.appendChild(actions);

    const right = el("div", "relative");
    const frame = el("div", "relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50");
    frame.appendChild(
        launchImage(
            info,
            "fas fa-rocket text-9xl text-slate-700/50",
            "flex items-center justify-center h-full min-h-[400px] bg-slate-800",
            "w-full h-full min-h-[400px] object-cover"
        )
    );
    frame.appendChild(
        el("div", "absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent")
    );
    right.appendChild(frame);

    grid.appendChild(left);
    grid.appendChild(right);
    card.appendChild(grid);
    container.appendChild(card);
}

function updateLaunchCount(count) {
    setText("#launches-count", `${count} Launches`, "0 Launches");
    setText("#launches-count-mobile", String(count), "0");
}

async function getUpcomingLaunches() {
    const featured = $("#featured-launch");
    const grid = $("#launches-grid");

    if (featured) featured.textContent = "";
    if (grid) {
        grid.textContent = "";
        grid.appendChild(loadingBlock("Loading upcoming launches..."));
    }

    try {
        const data = await fetchJSON(LAUNCHES_URL);
        const launches = Array.isArray(data?.results) ? data.results : [];

        if (grid) grid.textContent = "";

        if (launches.length === 0) {
            grid?.appendChild(messageBlock("fas fa-rocket text-slate-500", "No upcoming launches found."));
            updateLaunchCount(0);
            return;
        }

        updateLaunchCount(launches.length);

        const [first, ...rest] = launches;
        renderFeaturedLaunch(first);

        rest.forEach((launch) => {
            grid?.appendChild(createLaunchCard(launch));
        });
    } catch (error) {
        console.error("Failed to load launches:", error);
        if (grid) {
            grid.textContent = "";
            grid.appendChild(errorBlock("We couldn't load upcoming launches. Please try again later."));
        }
    }
}

const KM_PER_AU = 149597870.7;

const PLANET_COLORS = {
    mercury: "#eab308",
    venus: "#f97316",
    earth: "#3b82f6",
    mars: "#ef4444",
    jupiter: "#fb923c",
    saturn: "#facc15",
    uranus: "#06b6d4",
    neptune: "#2563eb",
};

let planetsData = [];

function planetColor(id) {
    const existing = document.querySelector(`[data-planet-id="${id}"]`);
    const fromHtml = existing?.style.getPropertyValue("--planet-color")?.trim();
    return fromHtml || PLANET_COLORS[id] || "#64748b";
}

function planetImage(planet) {
    return planet.image || `./assets/images/${planet.id}.png`;
}

const fmtAU = (km) => (isNum(km) && km > 0 ? (km / KM_PER_AU).toFixed(2) : null);
const fmtMillionKm = (km) => (isNum(km) && km > 0 ? `${formatNumber(km / 1e6, 1)}M km` : null);

function fmtMass(mass) {
    if (!mass || !isNum(mass.massValue) || !isNum(mass.massExponent)) return null;
    return `${mass.massValue.toFixed(2)} × 10^${mass.massExponent} kg`;
}

function massRelativeToEarth(mass) {
    if (!mass || !isNum(mass.massValue) || !isNum(mass.massExponent)) return null;
    const kg = mass.massValue * 10 ** mass.massExponent;
    const EARTH_KG = 5.97237e24;
    return formatNumber(kg / EARTH_KG, 3);
}

function fmtVolume(vol) {
    if (!vol || !isNum(vol.volValue) || !isNum(vol.volExponent)) return null;
    return `${vol.volValue.toFixed(2)} × 10^${vol.volExponent} km³`;
}

function fmtOrbit(days) {
    if (!isNum(days) || days <= 0) return null;
    return days > 730 ? `${formatNumber(days / 365.25, 1)} years` : `${formatNumber(days, 2)} days`;
}

function fmtRotation(hours) {
    if (!isNum(hours) || hours === 0) return null;
    const abs = Math.abs(hours);
    const text = abs > 48 ? `${formatNumber(abs / 24, 1)} days` : `${formatNumber(abs, 2)} hours`;
    return hours < 0 ? `${text} (retrograde)` : text;
}

const fmtTemp = (k) => (isNum(k) && k > 0 ? `${Math.round(k - 273.15)}°C` : null);
const fmtEscape = (ms) => (isNum(ms) && ms > 0 ? `${formatNumber(ms / 1000, 1)} km/s` : null);
const fmtDegrees = (d) => (isNum(d) ? `${d.toFixed(2)}°` : null);

function moonCount(planet) {
    return Array.isArray(planet.moons) ? planet.moons.length : 0;
}

function createPlanetCard(planet) {
    const color = planetColor(planet.id);

    const card = el(
        "div",
        "planet-card bg-slate-800/50 border border-slate-700 rounded-2xl p-4 transition-all cursor-pointer group"
    );
    card.dataset.planetId = planet.id;
    card.style.setProperty("--planet-color", color);
    card.addEventListener("mouseover", () => (card.style.borderColor = `${color}80`));
    card.addEventListener("mouseout", () => (card.style.borderColor = "#334155"));

    const imgWrap = el("div", "relative mb-3 h-24 flex items-center justify-center");
    const img = el("img", "w-20 h-20 object-contain group-hover:scale-110 transition-transform");
    img.src = planetImage(planet);
    img.alt = planet.englishName || planet.name || "Planet";
    img.onerror = () => (img.style.visibility = "hidden");
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);

    card.appendChild(el("h4", "font-semibold text-center text-sm", planet.englishName || planet.name || FALLBACK));
    const au = fmtAU(planet.semimajorAxis);
    card.appendChild(el("p", "text-xs text-slate-400 text-center", au ? `${au} AU` : FALLBACK));

    card.addEventListener("click", () => renderPlanetDetails(planet));
    return card;
}

function renderPlanetDetails(planet) {
    const name = planet.englishName || planet.name || FALLBACK;

    const img = $("#planet-detail-image");
    if (img) {
        img.style.visibility = "visible";
        img.onerror = () => (img.style.visibility = "hidden");
        img.src = planetImage(planet);
        img.alt = `${name} planet`;
    }

    setText("#planet-detail-name", name);
    setText("#planet-detail-description", planet.description, "No description available.");

    setText("#planet-distance", fmtMillionKm(planet.semimajorAxis));
    setText("#planet-radius", isNum(planet.meanRadius) && planet.meanRadius > 0 ? `${formatNumber(planet.meanRadius, 0)} km` : null);
    setText("#planet-mass", fmtMass(planet.mass));
    setText("#planet-density", isNum(planet.density) && planet.density > 0 ? `${planet.density.toFixed(2)} g/cm³` : null);
    setText("#planet-orbital-period", fmtOrbit(planet.sideralOrbit));
    setText("#planet-rotation", fmtRotation(planet.sideralRotation));
    setText("#planet-moons", String(moonCount(planet)));
    setText("#planet-gravity", isNum(planet.gravity) && planet.gravity > 0 ? `${planet.gravity} m/s²` : null);

    setText("#planet-discoverer", planet.discoveredBy, "Known since antiquity");
    setText("#planet-discovery-date", planet.discoveryDate, "Ancient");
    setText("#planet-body-type", planet.bodyType);
    setText("#planet-volume", fmtVolume(planet.vol));

    setText("#planet-perihelion", fmtMillionKm(planet.perihelion));
    setText("#planet-aphelion", fmtMillionKm(planet.aphelion));
    setText("#planet-eccentricity", isNum(planet.eccentricity) ? planet.eccentricity.toFixed(4) : null);
    setText("#planet-inclination", fmtDegrees(planet.inclination));
    setText("#planet-axial-tilt", fmtDegrees(planet.axialTilt));
    setText("#planet-temp", fmtTemp(planet.avgTemp));
    setText("#planet-escape", fmtEscape(planet.escape));

    renderPlanetFacts(planet);

    document.querySelectorAll("#planets-grid .planet-card").forEach((card) => {
        const selected = card.dataset.planetId === planet.id;
        card.style.borderColor = selected ? planetColor(planet.id) : "#334155";
    });
}

function renderPlanetFacts(planet) {
    const list = $("#planet-facts");
    if (!list) return;

    const facts = [];
    const au = fmtAU(planet.semimajorAxis);
    if (au) facts.push(`Orbits the Sun at an average of ${au} AU`);
    const moons = moonCount(planet);
    facts.push(moons === 0 ? "Has no known moons" : `Has ${moons} known moon${moons > 1 ? "s" : ""}`);
    if (planet.type) facts.push(`Classified as a ${planet.type}`);
    const orbit = fmtOrbit(planet.sideralOrbit);
    if (orbit) facts.push(`One year lasts ${orbit}`);
    if (isNum(planet.sideralRotation) && planet.sideralRotation < 0) facts.push("Rotates in the opposite direction (retrograde)");

    list.textContent = "";
    facts.forEach((fact) => {
        const li = el("li", "flex items-start");
        li.appendChild(icon("fas fa-check text-green-400 mt-1 mr-2"));
        li.appendChild(el("span", "text-slate-300", fact));
        list.appendChild(li);
    });
}

function createComparisonRow(planet) {
    const td = (text, extra = "") =>
        el(
            "td",
            `px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap ${extra}`,
            text || FALLBACK
        );

    const row = el("tr", "hover:bg-slate-800/30 transition-colors");

    const nameCell = el("td", "px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10");
    const nameWrap = el("div", "flex items-center space-x-2 md:space-x-3");
    const dot = el("div", "w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0");
    dot.style.backgroundColor = planetColor(planet.id);
    nameWrap.appendChild(dot);
    nameWrap.appendChild(
        el("span", "font-semibold text-sm md:text-base whitespace-nowrap", planet.englishName || planet.name)
    );
    nameCell.appendChild(nameWrap);
    row.appendChild(nameCell);

    row.appendChild(td(fmtAU(planet.semimajorAxis)));
    row.appendChild(td(isNum(planet.meanRadius) && planet.meanRadius > 0 ? formatNumber(planet.meanRadius * 2, 0) : null));
    row.appendChild(td(massRelativeToEarth(planet.mass)));
    row.appendChild(td(fmtOrbit(planet.sideralOrbit)));
    row.appendChild(td(String(moonCount(planet))));

    const typeCell = el("td", "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap");
    typeCell.appendChild(
        el("span", "px-2 py-1 rounded text-xs bg-blue-500/50 text-blue-200", planet.type || planet.bodyType || FALLBACK)
    );
    row.appendChild(typeCell);

    return row;
}

async function getPlanets() {
    const grid = $("#planets-grid");
    const tbody = $("#planet-comparison-tbody");

    // loading state
    if (grid) {
        grid.textContent = "";
        grid.appendChild(loadingBlock("Loading planets..."));
    }
    if (tbody) {
        tbody.textContent = "";
        const tr = el("tr");
        const cell = el("td", "px-4 md:px-6 py-6 text-center text-slate-400", "Loading planets...");
        cell.colSpan = 7;
        tr.appendChild(cell);
        tbody.appendChild(tr);
    }

    try {
        const data = await fetchJSON(PLANETS_URL);
        const bodies = Array.isArray(data?.bodies) ? data.bodies : [];

        planetsData = bodies
            .filter((b) => b.isPlanet)
            .map((b) => ({ ...b, id: (b.englishName || b.id || "").toLowerCase() }))
            .sort((a, b) => (a.semimajorAxis || 0) - (b.semimajorAxis || 0));

        if (grid) grid.textContent = "";
        if (tbody) tbody.textContent = "";

        if (planetsData.length === 0) {
            grid?.appendChild(messageBlock("fas fa-globe text-slate-500", "No planets found."));
            return;
        }

        planetsData.forEach((planet) => {
            grid?.appendChild(createPlanetCard(planet));
            tbody?.appendChild(createComparisonRow(planet));
        });

        const initial = planetsData.find((p) => p.id === "earth") || planetsData[0];
        renderPlanetDetails(initial);
    } catch (error) {
        console.error("Failed to load planets:", error);
        if (grid) {
            grid.textContent = "";
            grid.appendChild(errorBlock("We couldn't load planet data. Please try again later."));
        }
        if (tbody) {
            tbody.textContent = "";
            const tr = el("tr");
            const cell = el("td", "px-4 md:px-6 py-6 text-center text-slate-400", "Planet comparison is unavailable right now.");
            cell.colSpan = 7;
            tr.appendChild(cell);
            tbody.appendChild(tr);
        }
    }
}

function setupNavigation() {
    const links = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".app-section");
    const sidebar = $("#sidebar");

    const activeClasses = ["bg-blue-500/10", "text-blue-400"];
    const inactiveClasses = ["text-slate-300", "hover:bg-slate-800"];

    links.forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const target = link.dataset.section;

            sections.forEach((section) => {
                section.classList.toggle("hidden", section.dataset.section !== target);
            });

            links.forEach((l) => {
                const isActive = l === link;
                activeClasses.forEach((c) => l.classList.toggle(c, isActive));
                inactiveClasses.forEach((c) => l.classList.toggle(c, !isActive));
            });

            sidebar?.classList.remove("sidebar-open");
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });

    $("#sidebar-toggle")?.addEventListener("click", () => {
        sidebar?.classList.toggle("sidebar-open");
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupApodControls();

    getTodayInSpace();
    getUpcomingLaunches();
    getPlanets();
});