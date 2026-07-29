const API_URL = "https://estadisticas-de-la-liga-master.onrender.com";
let todosLosEquipos = [];
let mapaTemporadas = {}; 

const LIMITES = { "Serie A": 16, "La Liga": 16, "Bundesliga": 16, "Premier League": 16, "Serie B": 8 };

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => toast.classList.add("hidden"), 3000);
}

// --- MENÚ ---
document.getElementById('btn-tab-equipos').addEventListener('click', () => cambiarPestaña('equipos'));
document.getElementById('btn-tab-temporadas').addEventListener('click', () => cambiarPestaña('temporadas'));
document.getElementById('btn-tab-historial').addEventListener('click', () => cambiarPestaña('historial'));

function cambiarPestaña(tab) {
    document.querySelectorAll('.nav-menu button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`btn-tab-${tab}`).classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// --- INICIALIZACIÓN ---
async function iniciarApp() { 
    verificarEstadoRegistro(); // <- Agregamos esto
    await cargarEquiposYTemporadas(); 
}

function generarAños(maxAñoRegistrado) {
    let opcionesAños = '<option value="">Año de Temporada...</option>';
    
    let limiteSuperior = maxAñoRegistrado + 3;
    for (let año = 2006; año <= limiteSuperior; año++) {
        opcionesAños += `<option value="${año}">${año}</option>`;
    }
    
    document.getElementById("selector-año").innerHTML = opcionesAños;
    document.getElementById("mov-año").innerHTML = opcionesAños;
    document.getElementById("copa-año").innerHTML = opcionesAños;
    document.getElementById("premios-año").innerHTML = opcionesAños; 
}

async function cargarEquiposYTemporadas() {
    try {
        const resEq = await fetch(`${API_URL}/equipos/`);
        todosLosEquipos = await resEq.json();

        const resTemp = await fetch(`${API_URL}/temporadas/`);
        const temps = await resTemp.json();
        
        let maxAño = 2006; 
        temps.forEach(t => { 
            mapaTemporadas[t.año] = t.id_temporada; 
            if (t.año > maxAño) maxAño = t.año; 
        });

        generarAños(maxAño);
        actualizarContadores();
        llenarSelectsMovimientos();
        llenarSelectsPremios(); // <- Llamada obligatoria para llenar los equipos de los premios
    } catch (error) { console.error("Error al cargar:", error); }
}

function actualizarContadores() {
    const conteo = { "Serie A": 0, "La Liga": 0, "Bundesliga": 0, "Premier League": 0, "Serie B": 0 };
    todosLosEquipos.forEach(eq => { if (conteo[eq.liga_origen] !== undefined) conteo[eq.liga_origen]++; });

    const IDsDOM = { 
        "Serie A": { num: "count-serie-a", box: "box-serie-a", opt: "opt-serie-a" },
        "La Liga": { num: "count-la-liga", box: "box-la-liga", opt: "opt-la-liga" },
        "Bundesliga": { num: "count-bundesliga", box: "box-bundesliga", opt: "opt-bundesliga" },
        "Premier League": { num: "count-premier", box: "box-premier", opt: "opt-premier" },
        "Serie B": { num: "count-serie-b", box: "box-serie-b", opt: "opt-serie-b" }
    };

    for (const [liga, cantidad] of Object.entries(conteo)) {
        const ui = IDsDOM[liga];
        document.getElementById(ui.num).innerText = cantidad;
        if (cantidad >= LIMITES[liga]) {
            document.getElementById(ui.box).classList.add('full');
            document.getElementById(ui.opt).disabled = true;
        }
    }
}

function bloquearDuplicados(listaIdsSelects) {
    const selects = listaIdsSelects.map(id => document.getElementById(id));
    selects.forEach(select => {
        select.addEventListener('change', () => {
            const valoresSeleccionados = selects.map(s => s.value).filter(val => val !== "");
            selects.forEach(s => {
                const valorActual = s.value;
                Array.from(s.options).forEach(opcion => {
                    if (opcion.value === "") return;
                    opcion.disabled = valoresSeleccionados.includes(opcion.value) && opcion.value !== valorActual;
                });
            });
        });
    });
}

// --- FILTROS INTELIGENTES ---
document.getElementById("selector-liga").addEventListener("change", (e) => {
    const liga = e.target.value;
    if (!liga) return;
    const equiposFiltrados = todosLosEquipos.filter(eq => eq.liga_origen === liga);
    let opciones = '<option value="">Selecciona equipo...</option>';
    equiposFiltrados.forEach(eq => opciones += `<option value="${eq.id_equipo}">${eq.nombre}</option>`);
    for (let i = 1; i <= 4; i++) { document.getElementById(`equipo-${i}`).innerHTML = opciones; }
    bloquearDuplicados(['equipo-1', 'equipo-2', 'equipo-3', 'equipo-4']);
});

function llenarSelectsMovimientos() {
    const eqSerieA = todosLosEquipos.filter(eq => eq.liga_origen === "Serie A");
    const eqSerieB = todosLosEquipos.filter(eq => eq.liga_origen === "Serie B");
    let opA = '<option value="">Serie A...</option>'; eqSerieA.forEach(eq => opA += `<option value="${eq.id_equipo}">${eq.nombre}</option>`);
    let opB = '<option value="">Serie B...</option>'; eqSerieB.forEach(eq => opB += `<option value="${eq.id_equipo}">${eq.nombre}</option>`);
    
    document.getElementById("descendido-1").innerHTML = opA; document.getElementById("descendido-2").innerHTML = opA;
    document.getElementById("ascendido-1").innerHTML = opB; document.getElementById("ascendido-2").innerHTML = opB;
    bloquearDuplicados(['descendido-1', 'descendido-2']); bloquearDuplicados(['ascendido-1', 'ascendido-2']);
}
function llenarSelectsPremios() {
    let opciones = '<option value="">Selecciona equipo...</option>';
    todosLosEquipos.forEach(eq => opciones += `<option value="${eq.id_equipo}">${eq.nombre}</option>`);
    document.getElementById("mvp-equipo").innerHTML = opciones;
    document.getElementById("gol-equipo").innerHTML = opciones;
    document.getElementById("asist-equipo").innerHTML = opciones;
}

document.getElementById("selector-copa").addEventListener("change", (e) => {
    const copa = e.target.value;
    if (!copa) return;
    let eqFiltrados = [];
    if (copa === "Copa Serie A") { eqFiltrados = todosLosEquipos.filter(eq => eq.liga_origen === "Serie A" || eq.liga_origen === "Serie B"); }
    else if (copa === "Copa La Liga") { eqFiltrados = todosLosEquipos.filter(eq => eq.liga_origen === "La Liga"); }
    else if (copa === "Copa Bundesliga") { eqFiltrados = todosLosEquipos.filter(eq => eq.liga_origen === "Bundesliga"); }
    else if (copa === "Copa Premier League") { eqFiltrados = todosLosEquipos.filter(eq => eq.liga_origen === "Premier League"); }
    else { eqFiltrados = todosLosEquipos; }

    let opciones = '<option value="">Selecciona equipo...</option>';
    eqFiltrados.forEach(eq => opciones += `<option value="${eq.id_equipo}">${eq.nombre} (${eq.liga_origen})</option>`);
    document.getElementById("campeon-copa").innerHTML = opciones; document.getElementById("subcampeon-copa").innerHTML = opciones;
    bloquearDuplicados(['campeon-copa', 'subcampeon-copa']);
});

async function obtenerIdTemporada(año) {
    if (mapaTemporadas[año]) return mapaTemporadas[año];
    const res = await fetch(`${API_URL}/temporadas/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ año: año }) });
    const data = await res.json();
    mapaTemporadas[año] = data.id_temporada; 
    generarAños(año);
    return data.id_temporada;
}

// --- FORMULARIOS DE REGISTRO ---
document.getElementById("form-equipo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = { nombre: document.getElementById("nombre-equipo").value, liga_origen: document.getElementById("liga-equipo").value };
    const res = await fetch(`${API_URL}/equipos/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { showToast(`¡${data.nombre} guardado!`, "success"); e.target.reset(); await cargarEquiposYTemporadas(); }
});

document.getElementById("form-bloque-liga").addEventListener("submit", async (e) => {
    e.preventDefault();
    const año = parseInt(document.getElementById("selector-año").value);
    const liga = document.getElementById("selector-liga").value;
    const id_temporada = await obtenerIdTemporada(año);
    const promesas = [];
    for (let i = 1; i <= 4; i++) {
        const data = { id_temporada: id_temporada, liga: liga, posicion: i, id_equipo: parseInt(document.getElementById(`equipo-${i}`).value), pts: parseInt(document.getElementById(`pts-${i}`).value), pg: parseInt(document.getElementById(`pg-${i}`).value), pe: parseInt(document.getElementById(`pe-${i}`).value), pp: parseInt(document.getElementById(`pp-${i}`).value), gf: parseInt(document.getElementById(`gf-${i}`).value), gc: parseInt(document.getElementById(`gc-${i}`).value) };
        promesas.push(fetch(`${API_URL}/top4/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }));
    }
    await Promise.all(promesas);
    showToast(`Top 4 de ${liga} registrado`, "success");
    for (let i = 1; i <= 4; i++) { document.getElementById(`equipo-${i}`).value = ""; ['pts', 'pg', 'pe', 'pp', 'gf', 'gc'].forEach(stat => document.getElementById(`${stat}-${i}`).value = ""); Array.from(document.getElementById(`equipo-${i}`).options).forEach(opt => opt.disabled = false); }
});

document.getElementById("form-movimientos").addEventListener("submit", async (e) => {
    e.preventDefault();
    const año = parseInt(document.getElementById("mov-año").value);
    const data = { id_temporada: await obtenerIdTemporada(año), liga_principal: "Serie A", id_descendido_1: parseInt(document.getElementById("descendido-1").value), id_descendido_2: parseInt(document.getElementById("descendido-2").value), id_ascendido_1: parseInt(document.getElementById("ascendido-1").value), id_ascendido_2: parseInt(document.getElementById("ascendido-2").value) };
    const res = await fetch(`${API_URL}/ascensos_descensos/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { showToast(`Movimientos registrados`, "success"); e.target.reset(); document.getElementById("mov-año").value = año; ['descendido-1', 'descendido-2', 'ascendido-1', 'ascendido-2'].forEach(id => { Array.from(document.getElementById(id).options).forEach(opt => opt.disabled = false); }); }
});

document.getElementById("form-copas").addEventListener("submit", async (e) => {
    e.preventDefault();
    const año = parseInt(document.getElementById("copa-año").value);
    const copa = document.getElementById("selector-copa").value;
    const data = { id_temporada: await obtenerIdTemporada(año), nombre_copa: copa, id_campeon: parseInt(document.getElementById("campeon-copa").value), id_subcampeon: parseInt(document.getElementById("subcampeon-copa").value) };
    const res = await fetch(`${API_URL}/copas/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { showToast(`🏆 ${copa} registrada`, "success"); document.getElementById("campeon-copa").value = ""; document.getElementById("subcampeon-copa").value = ""; Array.from(document.getElementById("campeon-copa").options).forEach(opt => opt.disabled = false); Array.from(document.getElementById("subcampeon-copa").options).forEach(opt => opt.disabled = false); }
});

// --- PESTAÑA DE EDICIÓN DE EQUIPOS ---

document.getElementById('btn-tab-admin').addEventListener('click', () => {
    cambiarPestaña('admin');
});

document.getElementById('admin-filtro-liga').addEventListener('change', (e) => {
    const liga = e.target.value;
    const tbody = document.getElementById("tabla-admin-equipos");
    
    if (!liga) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 15px;">Selecciona una liga arriba</td></tr>';
        return;
    }
    
    tbody.innerHTML = "";
    const equiposFiltrados = todosLosEquipos.filter(eq => eq.liga_origen === liga);
    
    equiposFiltrados.forEach(eq => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #333;">
                <td style="padding: 10px; color: var(--text-muted);">${eq.id_equipo}</td>
                <td style="padding: 10px; font-weight: bold;">${eq.nombre}</td>
                <td style="padding: 10px; text-align: center;">
                    <button onclick="editarEquipo(${eq.id_equipo}, '${eq.nombre}', '${eq.liga_origen}')" style="background: var(--accent); padding: 6px 15px; font-size: 0.85rem; width: auto;">Corregir Nombre</button>
                </td>
            </tr>
        `;
    });
});

async function editarEquipo(id, nombreActual, ligaActual) {
    const nuevoNombre = prompt("Corrige el nombre del equipo:", nombreActual);
    if (!nuevoNombre || nuevoNombre === nombreActual) return;

    const res = await fetch(`${API_URL}/equipos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoNombre, liga_origen: ligaActual })
    });

    if (res.ok) {
        showToast("Nombre actualizado con éxito");
        await cargarEquiposYTemporadas(); // Actualizamos la memoria
        // Refrescamos la tabla disparando el evento de cambio en el selector
        document.getElementById('admin-filtro-liga').dispatchEvent(new Event('change'));
    } else {
        const err = await res.json();
        showToast(err.detail, "error");
    }
}

// --- LÓGICA DE ESTADÍSTICAS GLOBALES ---

document.getElementById('btn-tab-historial').addEventListener('click', () => {
    cambiarPestaña('historial');
    cargarEstadisticasGlobales();
});

async function cargarEstadisticasGlobales() {
    try {
        const res = await fetch(`${API_URL}/estadisticas/globales/`);
        if (!res.ok) throw new Error("Error obteniendo estadísticas");
        const data = await res.json();
        
        // 1. Renderizar Palmarés (NUEVA ESTRUCTURA)
        const divPalmares = document.getElementById("stats-palmares");
        divPalmares.innerHTML = "";
        
        if (Object.keys(data.palmares).length === 0) {
            divPalmares.innerHTML = "<p style='color: var(--text-muted); text-align: center;'>No hay campeones registrados aún.</p>";
        } else {
            // Definimos el orden con imágenes reales de banderas para evitar el error de Windows
            const ordenTorneos = [
                { 
                    titulo: `<img src="https://flagcdn.com/w20/it.png" alt="Italia" style="vertical-align: middle; margin-right: 8px; border-radius: 2px;"> Italia`, 
                    torneos: ["Serie A", "Copa Serie A", "Serie B"] 
                },
                { 
                    titulo: `<img src="https://flagcdn.com/w20/es.png" alt="España" style="vertical-align: middle; margin-right: 8px; border-radius: 2px;"> España`, 
                    torneos: ["La Liga", "Copa La Liga"] 
                },
                { 
                    titulo: `<img src="https://flagcdn.com/w20/gb-eng.png" alt="Inglaterra" style="vertical-align: middle; margin-right: 8px; border-radius: 2px;"> Inglaterra`, 
                    torneos: ["Premier League", "Copa Premier League"] 
                },
                { 
                    titulo: `<img src="https://flagcdn.com/w20/de.png" alt="Alemania" style="vertical-align: middle; margin-right: 8px; border-radius: 2px;"> Alemania`, 
                    torneos: ["Bundesliga", "Copa Bundesliga"] 
                },
                { 
                    titulo: `🌍 Internacional`, 
                    torneos: ["Champions League", "UEFA Europa League"] 
                }
            ];

            let palmaresHtml = "";

            ordenTorneos.forEach(bloque => {
                // Filtramos para ver si este país tiene al menos un campeón registrado
                let torneosActivos = bloque.torneos.filter(t => data.palmares[t]);
                
                if (torneosActivos.length > 0) {
                    palmaresHtml += `
                        <div style="background: #1e1e1e; padding: 15px; border-radius: 8px; border: 1px solid #333;">
                            <h4 style="color: #fff; margin-bottom: 15px; font-size: 1.2rem; border-bottom: 2px solid #444; padding-bottom: 5px;">${bloque.titulo}</h4>`;
                    
                    torneosActivos.forEach(nombreTorneo => {
                        palmaresHtml += `<div style="margin-bottom: 15px; padding-left: 10px;">
                                            <h5 style="color: var(--accent); margin-bottom: 8px; font-size: 1.05rem;">🏆 ${nombreTorneo}</h5>`;
                        
                        // Convertimos el objeto en array y ordenamos por cantidad de títulos (el más ganador primero)
                        const equipos = Object.entries(data.palmares[nombreTorneo]);
                        equipos.sort((a, b) => b[1].length - a[1].length);

                        equipos.forEach(([equipo, años]) => {
                            let textoTitulos = años.length === 1 ? "título" : "títulos";
                            palmaresHtml += `
                                <p style="margin-bottom: 4px; font-size: 0.95rem; line-height: 1.4;">
                                    <strong style="color: var(--text-main); font-size: 1rem;">${equipo}</strong> 
                                    <span style="color: var(--success); font-weight: bold; margin: 0 5px;">(${años.length} ${textoTitulos})</span> 
                                    <span style="color: var(--text-muted); font-size: 0.85rem;">[${años.join(', ')}]</span>
                                </p>`;
                        });
                        
                        palmaresHtml += `</div>`;
                    });
                    
                    palmaresHtml += `</div>`;
                }
            });
            
            divPalmares.innerHTML = palmaresHtml;
        }

        // 2. Renderizar Hitos Históricos (Récords)
        const divHitos = document.getElementById("stats-hitos");
        divHitos.innerHTML = "";
        
        if (!data.hitos || !data.hitos.max_pts) {
            divHitos.innerHTML = "<p style='color: var(--text-muted); text-align: center; grid-column: 1 / -1;'>No hay suficientes datos para generar hitos.</p>";
        } else {
            // Función constructora para evitar repetir HTML
            const crearTarjetaHito = (titulo, icono, hito, sufijo) => {
                if (!hito) return "";
                return `
                    <div style="background: #1e1e1e; padding: 15px; border-radius: 8px; border: 1px solid #333; text-align: center;">
                        <h5 style="color: var(--text-muted); margin-bottom: 10px; font-size: 0.9rem;">${icono} ${titulo}</h5>
                        <p style="font-size: 1.8rem; font-weight: bold; color: var(--accent); margin-bottom: 5px;">${hito.valor} <span style="font-size: 0.9rem; color: #fff;">${sufijo}</span></p>
                        <p style="font-weight: bold; color: var(--text-main); font-size: 1.1rem;">${hito.equipo}</p>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 5px;">${hito.liga} (${hito.año})</p>
                    </div>
                `;
            };

            // Imprimimos las 4 tarjetas
            divHitos.innerHTML = 
                crearTarjetaHito("Récord de Puntos", "📈", data.hitos.max_pts, "PTS") +
                crearTarjetaHito("Ataque Letal", "⚽", data.hitos.max_gf, "GF") +
                crearTarjetaHito("Muro Defensivo", "🛡️", data.hitos.min_gc, "GC") +
                crearTarjetaHito("Menos Derrotas", "💪", data.hitos.min_pp, "PP");
        }

        // --- 2.5 Renderizar Hitos Absolutos de Jugadores ---
        const divHitosJugadores = document.getElementById("stats-hitos-jugadores");
        divHitosJugadores.innerHTML = "";

        if (!data.hitos_jugadores || Object.keys(data.hitos_jugadores).length === 0) {
            divHitosJugadores.innerHTML = "<p style='color: var(--text-muted); text-align: center; grid-column: 1 / -1;'>No hay récords individuales registrados aún.</p>";
        } else {
            // Función constructora para los hitos de jugadores
            const crearTarjetaHitoJugador = (titulo, competicion, icono, hito, sufijo) => {
                if (!hito) return ""; // Si aún no hay récord en esta copa/liga, no dibuja la tarjeta
                return `
                    <div style="background: #1e1e1e; padding: 15px; border-radius: 8px; border: 1px solid #333; text-align: center;">
                        <h5 style="color: var(--text-muted); margin-bottom: 5px; font-size: 0.85rem;">${competicion}</h5>
                        <h4 style="color: #fff; margin-bottom: 10px; font-size: 1rem;">${icono} ${titulo}</h4>
                        <p style="font-size: 1.8rem; font-weight: bold; color: var(--accent); margin-bottom: 5px;">${hito.valor} <span style="font-size: 0.9rem; color: #fff;">${sufijo}</span></p>
                        <p style="font-weight: bold; color: var(--text-main); font-size: 1.1rem;">${hito.jugador}</p>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 5px;">${hito.equipo} (${hito.año})</p>
                    </div>
                `;
            };

            // Imprimimos las 6 tarjetas que solicitaste
            divHitosJugadores.innerHTML = 
                crearTarjetaHitoJugador("Máximo Goleador", "🇮🇹 Serie A", "⚽", data.hitos_jugadores.serie_a_goles, "Goles") +
                crearTarjetaHitoJugador("Máximo Asistente", "🇮🇹 Serie A", "👟", data.hitos_jugadores.serie_a_asist, "Asist.") +
                crearTarjetaHitoJugador("Máximo Goleador", "🏆 Copa Nacional", "⚽", data.hitos_jugadores.copa_goles, "Goles") +
                crearTarjetaHitoJugador("Máximo Asistente", "🏆 Copa Nacional", "👟", data.hitos_jugadores.copa_asist, "Asist.") +
                crearTarjetaHitoJugador("Máximo Goleador", "🌍 Champions League", "⚽", data.hitos_jugadores.champions_goles, "Goles") +
                crearTarjetaHitoJugador("Máximo Asistente", "🌍 Champions League", "👟", data.hitos_jugadores.champions_asist, "Asist.");
        }

        // 3. Renderizar Récords de Jugadores (NUEVA ESTRUCTURA)
        const divJugadores = document.getElementById("stats-jugadores");
        divJugadores.innerHTML = "";
        
        if (Object.keys(data.jugadores).length === 0) {
            divJugadores.innerHTML = "<p style='color: var(--text-muted); text-align: center;'>No hay premios individuales registrados aún.</p>";
        } else {
            // Filtramos únicamente las 3 competiciones de las que tienes visibilidad
            const ordenCompeticiones = [
                { id: "Serie A", titulo: `<img src="https://flagcdn.com/w20/it.png" alt="Italia" style="vertical-align: middle; margin-right: 8px; border-radius: 2px;"> Serie A` },
                { id: "Copa", titulo: `🏆 Copa Nacional` },
                { id: "Champions League", titulo: `🌍 Champions League` }
            ];

            const categoriasOrden = ["MVP", "Goleador", "Asistente"];
            let jugHtml = "";

            ordenCompeticiones.forEach(comp => {
                const premiosComp = data.jugadores[comp.id];
                if (premiosComp) {
                    jugHtml += `
                        <div style="background: #1e1e1e; padding: 15px; border-radius: 8px; border: 1px solid #333;">
                            <h4 style="color: #fff; margin-bottom: 15px; font-size: 1.2rem; border-bottom: 2px solid #444; padding-bottom: 5px;">${comp.titulo}</h4>`;
                    
                    categoriasOrden.forEach(cat => {
                        if (premiosComp[cat]) {
                            let colorCat = cat === "MVP" ? "#ffd700" : cat === "Goleador" ? "var(--success)" : "var(--accent)";
                            let iconoCat = cat === "MVP" ? "🏅" : cat === "Goleador" ? "⚽" : "👟";
                            
                            jugHtml += `<div style="margin-bottom: 15px; padding-left: 10px;">
                                            <h5 style="color: ${colorCat}; margin-bottom: 8px; font-size: 1.05rem;">${iconoCat} ${cat}</h5>`;
                            
                            // Ordenamos de mayor a menor cantidad de veces ganado
                            const jugadores = Object.entries(premiosComp[cat]);
                            jugadores.sort((a, b) => b[1].años.length - a[1].años.length);
                            
                            jugadores.forEach(([nombre, info]) => {
                                let sufijo = cat === "Goleador" ? "goles" : cat === "Asistente" ? "asistencias" : "";
                                // Agrupamos las estadísticas (Ej: "- 25 (2026), 28 (2027) goles")
                                // Limpiamos el texto que viene del backend (ej: "55 (2006)") para que solo quede el número (ej: "55")
let statsLimpios = info.stats.map(stat => stat.split(' ')[0]);
let textoEstadistica = statsLimpios.length > 0 ? ` <span style="color: var(--text-muted); font-size: 0.85rem;">- ${statsLimpios.join(', ')} ${sufijo}</span>` : "";

                                jugHtml += `
                                    <p style="margin-bottom: 4px; font-size: 0.95rem; line-height: 1.4;">
                                        <strong style="color: var(--text-main); font-size: 1rem;">${nombre}</strong> 
                                        <span style="color: var(--text-muted); font-size: 0.85rem;">(${info.equipo})</span> 
                                        <span style="color: ${colorCat}; font-weight: bold; margin: 0 5px;">(${info.años.length}x)</span> 
                                        <span style="color: var(--text-muted); font-size: 0.85rem;">[${info.años.join(', ')}]</span>
                                        ${textoEstadistica}
                                    </p>`;
                            });
                            jugHtml += `</div>`;
                        }
                    });
                    jugHtml += `</div>`;
                }
            });
            divJugadores.innerHTML = jugHtml;
        }

    } catch (error) {
        console.error("Error al cargar stats:", error);
    }

// --- 4. Renderizar Hitos por Liga ---
        const divHitosLigas = document.getElementById("stats-hitos-ligas");
        divHitosLigas.innerHTML = "";
        
        if (!data.hitos_por_liga || Object.keys(data.hitos_por_liga).length === 0) {
            divHitosLigas.innerHTML = "<p style='color: var(--text-muted); text-align: center; grid-column: 1 / -1;'>No hay récords por liga registrados aún.</p>";
        } else {
            const logosLigas = {
                "Serie A": "🇮🇹 Serie A", "La Liga": "🇪🇸 La Liga",
                "Bundesliga": "🇩🇪 Bundesliga", "Premier League": "🇬🇧 Premier League"
            };

            const crearMiniTarjetaHito = (titulo, icono, hito, sufijo) => {
                if (!hito) return `<div></div>`;
                return `
                    <div style="background: #2a2a2a; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #333;">
                        <p style="color: var(--text-muted); font-size: 0.75rem; margin-bottom: 5px;">${icono} ${titulo}</p>
                        <p style="font-size: 1.2rem; font-weight: bold; color: var(--accent); margin-bottom: 2px;">${hito.valor} <span style="font-size: 0.7rem; color: #fff;">${sufijo}</span></p>
                        <p style="font-weight: bold; color: var(--text-main); font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${hito.equipo}</p>
                        <p style="color: var(--text-muted); font-size: 0.75rem;">(${hito.año})</p>
                    </div>
                `;
            };

            let ligasHtml = "";
            for (const [liga, hitos] of Object.entries(data.hitos_por_liga)) {
                if (!hitos.max_pts) continue; // Si la liga aún no tiene registros, la saltamos

                ligasHtml += `
                <div style="background: #1e1e1e; padding: 15px; border-radius: 8px; border: 1px solid #333;">
                    <h4 style="color: #fff; margin-bottom: 15px; font-size: 1.1rem; border-bottom: 2px solid #444; padding-bottom: 5px; text-align: center;">${logosLigas[liga] || liga}</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        ${crearMiniTarjetaHito("Puntos", "📈", hitos.max_pts, "PTS")}
                        ${crearMiniTarjetaHito("Goles", "⚽", hitos.max_gf, "GF")}
                        ${crearMiniTarjetaHito("Defensa", "🛡️", hitos.min_gc, "GC")}
                        ${crearMiniTarjetaHito("Menos Perdidos", "💪", hitos.min_pp, "PP")}
                    </div>
                </div>`;
            }
            divHitosLigas.innerHTML = ligasHtml || "<p style='color: var(--text-muted); text-align: center; grid-column: 1 / -1;'>No hay suficientes datos por liga.</p>";
        }

        // --- 5. Renderizar Movimientos (Ascensos / Descensos) ---
        const divMovimientos = document.getElementById("stats-movimientos");
        divMovimientos.innerHTML = "";
        
        if (!data.movimientos || Object.keys(data.movimientos).length === 0) {
            divMovimientos.innerHTML = "<p style='color: var(--text-muted); text-align: center;'>No hay ascensos o descensos registrados aún.</p>";
        } else {
            // Convertimos a array y ordenamos: 1ro Campeonatos, 2do Ascensos, 3ro Descensos
            const movsArray = Object.entries(data.movimientos).map(([equipo, stats]) => ({equipo, ...stats}));
            movsArray.sort((a, b) => {
                if (b.campeon_B !== a.campeon_B) return b.campeon_B - a.campeon_B;
                if (b.ascensos !== a.ascensos) return b.ascensos - a.ascensos;
                return b.descensos - a.descensos;
            });

            let movsHtml = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.95rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid #444; background-color: #1e1e1e;">
                            <th style="padding: 12px; text-align: left; color: var(--text-muted);">Equipo</th>
                            <th style="padding: 12px; color: #ffd700;" title="Campeonatos de Serie B">🏆 Camp. B</th>
                            <th style="padding: 12px; color: var(--success);" title="Ascensos a Serie A">⬆️ Ascensos</th>
                            <th style="padding: 12px; color: var(--error);" title="Descensos a Serie B">⬇️ Descensos</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            movsArray.forEach((m, index) => {
                // Alternar colores de fondo para las filas (estilo cebra)
                let bgRow = index % 2 === 0 ? "background-color: transparent;" : "background-color: #1e1e1e;";
                movsHtml += `
                <tr style="border-bottom: 1px solid #333; ${bgRow}">
                    <td style="padding: 12px; text-align: left; font-weight: bold; color: var(--text-main);">${m.equipo}</td>
                    <td style="padding: 12px; color: #ffd700; font-weight: bold;">${m.campeon_B > 0 ? m.campeon_B : '-'}</td>
                    <td style="padding: 12px; color: var(--success); font-weight: bold;">${m.ascensos > 0 ? m.ascensos : '-'}</td>
                    <td style="padding: 12px; color: var(--error); font-weight: bold;">${m.descensos > 0 ? m.descensos : '-'}</td>
                </tr>
                `;
            });

            movsHtml += `</tbody></table></div>`;
            divMovimientos.innerHTML = movsHtml;
        }    

}

// --- GUARDADO DE PREMIOS INDIVIDUALES (Restaurado) ---
document.getElementById("form-premios").addEventListener("submit", async (e) => {
    e.preventDefault();
    const año = parseInt(document.getElementById("premios-año").value);
    const competicion = document.getElementById("premios-competicion").value;
    const id_temporada = await obtenerIdTemporada(año);

    const dataMVP = { id_temporada, competicion, categoria: "MVP", nombre_jugador: document.getElementById("mvp-nombre").value, id_equipo: parseInt(document.getElementById("mvp-equipo").value), estadistica: 0 };
    const dataGol = { id_temporada, competicion, categoria: "Goleador", nombre_jugador: document.getElementById("gol-nombre").value, id_equipo: parseInt(document.getElementById("gol-equipo").value), estadistica: parseInt(document.getElementById("gol-cant").value) };
    const dataAsist = { id_temporada, competicion, categoria: "Asistente", nombre_jugador: document.getElementById("asist-nombre").value, id_equipo: parseInt(document.getElementById("asist-equipo").value), estadistica: parseInt(document.getElementById("asist-cant").value) };

    const promesas = [
        fetch(`${API_URL}/premios/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dataMVP) }),
        fetch(`${API_URL}/premios/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dataGol) }),
        fetch(`${API_URL}/premios/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dataAsist) })
    ];

    await Promise.all(promesas);
    showToast(`Distinciones de ${competicion} guardadas`, "success");
    e.target.reset();
    document.getElementById("premios-año").value = año; // Restauramos el año para continuar más rápido
});

// --- LÓGICA PARA OCULTAR PESTAÑAS DE EQUIPOS ---

function verificarEstadoRegistro() {
    // Revisamos si en el navegador ya quedó guardada la orden de ocultar
    if (localStorage.getItem('registroEquiposFinalizado') === 'true') {
        ocultarPestañasEquipos();
    }
}

function ocultarPestañasEquipos() {
    // 1. Ocultar los botones del menú de navegación
    document.getElementById('btn-tab-equipos').style.display = 'none';
    document.getElementById('btn-tab-admin').style.display = 'none';
    
    // 2. Si el usuario estaba en una de las pestañas que se van a ocultar, 
    // lo movemos forzosamente a la pestaña de "Temporadas"
    const tabEquipos = document.getElementById('btn-tab-equipos');
    const tabAdmin = document.getElementById('btn-tab-admin');
    
    if (tabEquipos.classList.contains('active') || tabAdmin.classList.contains('active')) {
        cambiarPestaña('temporadas');
    }
}

// Evento click para el botón rojo
const btnFinalizar = document.getElementById('btn-finalizar-equipos');
if (btnFinalizar) {
    btnFinalizar.addEventListener('click', () => {
        const confirmacion = confirm("¿Estás seguro? Esto ocultará las pestañas de 'Base de Datos' y 'Corrector de Equipos' de forma permanente para dejar la interfaz más limpia.");
        
        if (confirmacion) {
            // Guardamos la decisión en la memoria del navegador
            localStorage.setItem('registroEquiposFinalizado', 'true');
            ocultarPestañasEquipos();
            showToast("Registro finalizado. Pestañas ocultas.", "success");
        }
    });
}


// --- INICIALIZACIÓN DE LA APP (El motor de arranque) ---
document.addEventListener("DOMContentLoaded", iniciarApp);