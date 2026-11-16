const SUPABASE_URL = "https://ezdzxwjetpdjhouzrakj.supabase.co";
const SUPABASE_KEY = "sb_publishable_SlFUiiMuox5kOCQ0bMaUFw_pyEfIZ1P"; // clave pública (segura en el navegador gracias a RLS)

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

let all = [];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function loadOpportunities() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/opportunities?select=*&order=created_at.desc`, { headers: HEADERS });
  if (!res.ok) throw new Error("No se pudieron cargar las oportunidades");
  all = await res.json();
  refreshCategories();
  render();
}

async function createOpportunity(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/opportunities`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({ ...data, likes: 0 }),
  });
  if (!res.ok) throw new Error("No se pudo publicar");
}

async function like(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_likes`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ opportunity_id: id }),
  });
  if (!res.ok) throw new Error("No se pudo dar like");
}

function refreshCategories() {
  const sel = $("fCategory");
  const current = sel.value;
  const cats = [...new Set(all.map((o) => o.category))].sort();
  sel.innerHTML = '<option value="">Todas las categorías</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join("");
  sel.value = cats.includes(current) ? current : "";
}

function render() {
  const city = $("fCity").value.trim().toLowerCase();
  const country = $("fCountry").value.trim().toLowerCase();
  const cat = $("fCategory").value;
  const list = all.filter(
    (o) =>
      o.city.toLowerCase().includes(city) &&
      o.country.toLowerCase().includes(country) &&
      (!cat || o.category === cat)
  );
  $("count").textContent = `${list.length} oportunidad${list.length === 1 ? "" : "es"}`;
  $("list").innerHTML = list.length
    ? list
        .map(
          (o) => `
    <article class="opp">
      <h3>${esc(o.name)}</h3>
      <div class="place">📍 ${esc(o.city)}, ${esc(o.country)}</div>
      <div class="tags"><span class="tag">${esc(o.category)}</span><span class="tag ${esc(o.potential)}">Potencial ${esc(o.potential)}</span></div>
      <h4>Problema</h4><p>${esc(o.problem)}</p>
      <h4>Solución con IA</h4><p>${esc(o.ai_solution)}</p>
      <button class="like" data-id="${o.id}">❤️ ${o.likes}</button>
    </article>`
        )
        .join("")
    : "<p>Aún no hay oportunidades. ¡Publica la primera!</p>";
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = $("submitBtn");
  const msg = $("msg");
  btn.disabled = true;
  msg.className = "msg";
  msg.textContent = "Publicando...";
  try {
    await createOpportunity(Object.fromEntries(new FormData(form)));
    form.reset();
    await loadOpportunities();
    msg.className = "msg ok";
    msg.textContent = "¡Oportunidad publicada!";
  } catch (err) {
    msg.className = "msg err";
    msg.textContent = err.message;
  }
  btn.disabled = false;
});

$("list").addEventListener("click", async (e) => {
  const btn = e.target.closest(".like");
  if (!btn) return;
  btn.disabled = true;
  try {
    await like(btn.dataset.id);
    await loadOpportunities();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
  }
});

["fCity", "fCountry"].forEach((id) => $(id).addEventListener("input", render));
$("fCategory").addEventListener("change", render);

loadOpportunities().catch((err) => ($("list").innerHTML = `<p class="msg err">${err.message}</p>`));
