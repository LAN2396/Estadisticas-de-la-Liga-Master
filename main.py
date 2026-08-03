import os
import psycopg2
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="API Liga Máster - WE10")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Esto le permite al servidor leer tus carpetas de diseño y funciones
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")
app.mount("/img", StaticFiles(directory="img"), name="img")

# Esto le dice que al entrar al link principal, muestre tu página web
@app.get("/")
async def leer_index():
    return FileResponse("index.html")

@app.get("/manifest.json")
async def leer_manifest():
    return FileResponse("manifest.json")

@app.get("/index.html")
async def leer_index_directo():
    return FileResponse("index.html")
def get_db_connection():
    # Conexión a la base de datos PostgreSQL en Neon
    conexion = psycopg2.connect(os.environ.get("DATABASE_URL"))
    return conexion

@app.on_event("startup")
def startup_db():
    conexion = get_db_connection()
    cursor = conexion.cursor()

    # 1. Equipos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Equipos (
            id_equipo SERIAL PRIMARY KEY,
            nombre VARCHAR UNIQUE NOT NULL,
            liga_origen VARCHAR NOT NULL
        )
    ''')

    # 2. Temporadas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Temporadas (
            id_temporada SERIAL PRIMARY KEY,
            año INTEGER UNIQUE NOT NULL
        )
    ''')

    # 3. Historial Top 4
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Historial_Top4 (
            id_registro SERIAL PRIMARY KEY,
            id_temporada INTEGER REFERENCES Temporadas(id_temporada) ON DELETE CASCADE,
            liga VARCHAR NOT NULL,
            posicion INTEGER NOT NULL,
            id_equipo INTEGER REFERENCES Equipos(id_equipo),
            pts INTEGER, pg INTEGER, pe INTEGER, pp INTEGER, gf INTEGER, gc INTEGER
        )
    ''')

    # 4. Ascensos y Descensos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Ascensos_Descensos (
            id_registro SERIAL PRIMARY KEY,
            id_temporada INTEGER REFERENCES Temporadas(id_temporada) ON DELETE CASCADE,
            liga_principal VARCHAR NOT NULL,
            id_descendido_1 INTEGER REFERENCES Equipos(id_equipo),
            id_descendido_2 INTEGER REFERENCES Equipos(id_equipo),
            id_ascendido_1 INTEGER REFERENCES Equipos(id_equipo),
            id_ascendido_2 INTEGER REFERENCES Equipos(id_equipo)
        )
    ''')

    # 5. Historial de Copas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Historial_Copas (
            id_registro SERIAL PRIMARY KEY,
            id_temporada INTEGER REFERENCES Temporadas(id_temporada) ON DELETE CASCADE,
            nombre_copa VARCHAR NOT NULL,
            id_campeon INTEGER REFERENCES Equipos(id_equipo),
            id_subcampeon INTEGER REFERENCES Equipos(id_equipo)
        )
    ''')

    # 6. Premios Individuales
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Premios_Individuales (
            id_premio SERIAL PRIMARY KEY,
            id_temporada INTEGER REFERENCES Temporadas(id_temporada) ON DELETE CASCADE,
            competicion VARCHAR NOT NULL,
            categoria VARCHAR NOT NULL,
            nombre_jugador VARCHAR NOT NULL,
            id_equipo INTEGER REFERENCES Equipos(id_equipo),
            estadistica INTEGER
        )
    ''')

    conexion.commit()
    conexion.close()

# --- MODELOS PYDANTIC ---
class Equipo(BaseModel):
    nombre: str
    liga_origen: str 

class Temporada(BaseModel):
    año: int

class RegistroTop4(BaseModel):
    id_temporada: int
    liga: str
    posicion: int
    id_equipo: int
    pts: int
    pg: int
    pe: int
    pp: int
    gf: int
    gc: int

class AscensoDescenso(BaseModel):
    id_temporada: int
    liga_principal: str
    id_descendido_1: int
    id_descendido_2: int
    id_ascendido_1: int
    id_ascendido_2: int

class RegistroCopa(BaseModel):
    id_temporada: int
    nombre_copa: str
    id_campeon: int
    id_subcampeon: int

class PremioIndividual(BaseModel):
    id_temporada: int
    competicion: str
    categoria: str
    nombre_jugador: str
    id_equipo: int
    estadistica: int = 0

# --- RUTAS POST ---
@app.post("/equipos/")
def crear_equipo(equipo: Equipo):
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("INSERT INTO Equipos (nombre, liga_origen) VALUES (%s, %s) RETURNING id_equipo", (equipo.nombre, equipo.liga_origen))
        nuevo_id = cursor.fetchone()['id_equipo']
        conexion.commit()
        return {"mensaje": "Equipo registrado", "id_equipo": nuevo_id}
    except psycopg2.IntegrityError:
        conexion.rollback()
        raise HTTPException(status_code=400, detail="El equipo ya existe.")
    finally:
        conexion.close()

@app.post("/temporadas/")
def crear_temporada(temporada: Temporada):
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("INSERT INTO Temporadas (año) VALUES (%s) RETURNING id_temporada", (temporada.año,))
        nuevo_id = cursor.fetchone()['id_temporada']
        conexion.commit()
        return {"mensaje": "Temporada registrada", "id_temporada": nuevo_id}
    except psycopg2.IntegrityError:
        conexion.rollback()
        raise HTTPException(status_code=400, detail="Ese año ya está registrado.")
    finally:
        conexion.close()

@app.post("/top4/")
def registrar_top4(registro: RegistroTop4):
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT id_registro FROM Historial_Top4 WHERE id_temporada = %s AND liga = %s AND posicion = %s", 
                   (registro.id_temporada, registro.liga, registro.posicion))
    row = cursor.fetchone()
    
    if row: 
        cursor.execute('''UPDATE Historial_Top4 SET id_equipo=%s, pts=%s, pg=%s, pe=%s, pp=%s, gf=%s, gc=%s WHERE id_registro=%s''', 
                       (registro.id_equipo, registro.pts, registro.pg, registro.pe, registro.pp, registro.gf, registro.gc, row['id_registro']))
    else: 
        cursor.execute('''INSERT INTO Historial_Top4 (id_temporada, liga, posicion, id_equipo, pts, pg, pe, pp, gf, gc) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''', 
                       (registro.id_temporada, registro.liga, registro.posicion, registro.id_equipo, registro.pts, registro.pg, registro.pe, registro.pp, registro.gf, registro.gc))
    
    conexion.commit()
    conexion.close()
    return {"mensaje": "Registro de liga guardado/actualizado"}

@app.post("/ascensos_descensos/")
def registrar_movimientos(mov: AscensoDescenso):
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT id_registro FROM Ascensos_Descensos WHERE id_temporada = %s AND liga_principal = %s", (mov.id_temporada, mov.liga_principal))
    row = cursor.fetchone()
    
    if row:
        cursor.execute('''UPDATE Ascensos_Descensos SET id_descendido_1=%s, id_descendido_2=%s, id_ascendido_1=%s, id_ascendido_2=%s WHERE id_registro=%s''', 
                       (mov.id_descendido_1, mov.id_descendido_2, mov.id_ascendido_1, mov.id_ascendido_2, row['id_registro']))
    else:
        cursor.execute('''INSERT INTO Ascensos_Descensos (id_temporada, liga_principal, id_descendido_1, id_descendido_2, id_ascendido_1, id_ascendido_2) VALUES (%s, %s, %s, %s, %s, %s)''', 
                       (mov.id_temporada, mov.liga_principal, mov.id_descendido_1, mov.id_descendido_2, mov.id_ascendido_1, mov.id_ascendido_2))
    
    # --- NUEVA LÓGICA: ACTUALIZACIÓN AUTOMÁTICA EN LA TABLA EQUIPOS ---
    # 1. Los equipos que descienden pasan a la Serie B
    cursor.execute("UPDATE Equipos SET liga_origen = 'Serie B' WHERE id_equipo IN (%s, %s)", 
                   (mov.id_descendido_1, mov.id_descendido_2))
    
    # 2. Los equipos que ascienden pasan a la liga principal (Ej: Serie A)
    cursor.execute("UPDATE Equipos SET liga_origen = %s WHERE id_equipo IN (%s, %s)", 
                   (mov.liga_principal, mov.id_ascendido_1, mov.id_ascendido_2))
    # -------------------------------------------------------------------

    conexion.commit()
    conexion.close()
    return {"mensaje": "Movimientos guardados y liga de equipos actualizada"}

@app.post("/copas/")
def registrar_copa(registro: RegistroCopa):
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT id_registro FROM Historial_Copas WHERE id_temporada = %s AND nombre_copa = %s", (registro.id_temporada, registro.nombre_copa))
    row = cursor.fetchone()
    
    if row:
        cursor.execute('''UPDATE Historial_Copas SET id_campeon=%s, id_subcampeon=%s WHERE id_registro=%s''', (registro.id_campeon, registro.id_subcampeon, row['id_registro']))
    else:
        cursor.execute('''INSERT INTO Historial_Copas (id_temporada, nombre_copa, id_campeon, id_subcampeon) VALUES (%s, %s, %s, %s)''', 
                       (registro.id_temporada, registro.nombre_copa, registro.id_campeon, registro.id_subcampeon))
    
    conexion.commit()
    conexion.close()
    return {"mensaje": "Copa guardada/actualizada"}

@app.post("/premios/")
def registrar_premio(premio: PremioIndividual):
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT id_premio FROM Premios_Individuales WHERE id_temporada = %s AND competicion = %s AND categoria = %s", 
                   (premio.id_temporada, premio.competicion, premio.categoria))
    row = cursor.fetchone()
    
    if row:
        cursor.execute('''UPDATE Premios_Individuales SET nombre_jugador=%s, id_equipo=%s, estadistica=%s WHERE id_premio=%s''', 
                       (premio.nombre_jugador, premio.id_equipo, premio.estadistica, row['id_premio']))
    else:
        cursor.execute('''INSERT INTO Premios_Individuales (id_temporada, competicion, categoria, nombre_jugador, id_equipo, estadistica) VALUES (%s, %s, %s, %s, %s, %s)''', 
                       (premio.id_temporada, premio.competicion, premio.categoria, premio.nombre_jugador, premio.id_equipo, premio.estadistica))
    
    conexion.commit()
    conexion.close()
    return {"mensaje": "Premio guardado/actualizado"}

# --- RUTAS GET ---
@app.get("/equipos/")
def obtener_equipos():
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT id_equipo, nombre, liga_origen FROM Equipos ORDER BY nombre ASC")
    equipos = [dict(row) for row in cursor.fetchall()]
    conexion.close()
    return equipos

@app.get("/temporadas/")
def obtener_temporadas():
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT id_temporada, año FROM Temporadas ORDER BY año DESC")
    temporadas = [dict(row) for row in cursor.fetchall()]
    conexion.close()
    return temporadas

def agrupar_hitos(rows):
    """Agrupa empates históricos para mostrarlos juntos en el frontend."""
    if not rows:
        return None
    
    valor = rows[0]['valor']
    
    # Extraemos los años únicos, los ordenamos y los unimos con comas
    anos = ", ".join(sorted(list(set(str(r['año']) for r in rows))))
    
    # Si es un récord de jugador
    if 'jugador' in rows[0]:
        nombres = " / ".join(list(set(r['jugador'] for r in rows)))
        equipos = " / ".join(list(set(r['equipo'] for r in rows)))
    # Si es un récord de equipo
    else:
        nombres = " / ".join(list(set(r['equipo'] for r in rows)))
        equipos = nombres
        
    # Si la consulta incluye liga (como en los hitos globales)
    ligas = " / ".join(list(set(r['liga'] for r in rows))) if 'liga' in rows[0] else ""
    
    resultado = {
        "valor": valor,
        "equipo": equipos,
        "año": anos
    }
    
    if 'jugador' in rows[0]:
        resultado["jugador"] = nombres
    if ligas:
        resultado["liga"] = ligas
        
    return resultado

@app.get("/estadisticas/globales/")
def obtener_estadisticas_globales():
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    
    # --- 1. HITOS HISTÓRICOS GLOBALES ---
    cursor.execute('''WITH Ranked AS (SELECT E.nombre as equipo, H.liga, T.año, H.pts as valor, RANK() OVER(ORDER BY H.pts DESC) as rnk FROM Historial_Top4 H JOIN Equipos E ON H.id_equipo = E.id_equipo JOIN Temporadas T ON H.id_temporada = T.id_temporada) SELECT * FROM Ranked WHERE rnk = 1''')
    max_pts = agrupar_hitos(cursor.fetchall())

    cursor.execute('''WITH Ranked AS (SELECT E.nombre as equipo, H.liga, T.año, H.gf as valor, RANK() OVER(ORDER BY H.gf DESC) as rnk FROM Historial_Top4 H JOIN Equipos E ON H.id_equipo = E.id_equipo JOIN Temporadas T ON H.id_temporada = T.id_temporada) SELECT * FROM Ranked WHERE rnk = 1''')
    max_gf = agrupar_hitos(cursor.fetchall())

    cursor.execute('''WITH Ranked AS (SELECT E.nombre as equipo, H.liga, T.año, H.gc as valor, RANK() OVER(ORDER BY H.gc ASC) as rnk FROM Historial_Top4 H JOIN Equipos E ON H.id_equipo = E.id_equipo JOIN Temporadas T ON H.id_temporada = T.id_temporada) SELECT * FROM Ranked WHERE rnk = 1''')
    min_gc = agrupar_hitos(cursor.fetchall())

    cursor.execute('''WITH Ranked AS (SELECT E.nombre as equipo, H.liga, T.año, H.pp as valor, RANK() OVER(ORDER BY H.pp ASC) as rnk FROM Historial_Top4 H JOIN Equipos E ON H.id_equipo = E.id_equipo JOIN Temporadas T ON H.id_temporada = T.id_temporada) SELECT * FROM Ranked WHERE rnk = 1''')
    min_pp = agrupar_hitos(cursor.fetchall())

    hitos = {
        "max_pts": max_pts,
        "max_gf": max_gf,
        "min_gc": min_gc,
        "min_pp": min_pp
    }

    # --- 2. RÉCORDS INDIVIDUALES ---
    cursor.execute('''
        SELECT P.competicion, P.categoria, P.nombre_jugador, E.nombre as equipo, P.estadistica, T.año
        FROM Premios_Individuales P
        JOIN Equipos E ON P.id_equipo = E.id_equipo
        JOIN Temporadas T ON P.id_temporada = T.id_temporada
        ORDER BY T.año ASC
    ''')
    premios_raw = [dict(row) for row in cursor.fetchall()]
    
    premios_agrupados = {}
    for p in premios_raw:
        comp = p['competicion']
        cat = p['categoria']
        jug = p['nombre_jugador']
        eq = p['equipo']
        
        if comp not in premios_agrupados:
            premios_agrupados[comp] = {}
        if cat not in premios_agrupados[comp]:
            premios_agrupados[comp][cat] = {}
        if jug not in premios_agrupados[comp][cat]:
            premios_agrupados[comp][cat][jug] = {"equipo": eq, "años": [], "stats": []}
            
        premios_agrupados[comp][cat][jug]["años"].append(p['año'])
        if p['estadistica'] > 0:
            premios_agrupados[comp][cat][jug]["stats"].append(f"{p['estadistica']} ({p['año']})")

    # --- 3. PALMARÉS DE TORNEOS ---
    cursor.execute('''
        SELECT E.nombre as equipo, H.liga as torneo, T.año 
        FROM Historial_Top4 H 
        JOIN Equipos E ON H.id_equipo = E.id_equipo 
        JOIN Temporadas T ON H.id_temporada = T.id_temporada 
        WHERE H.posicion = 1
    ''')
    campeones_ligas = [dict(row) for row in cursor.fetchall()]

    cursor.execute('''
        SELECT E.nombre as equipo, H.nombre_copa as torneo, T.año 
        FROM Historial_Copas H 
        JOIN Equipos E ON H.id_campeon = E.id_equipo 
        JOIN Temporadas T ON H.id_temporada = T.id_temporada
    ''')
    campeones_copas = [dict(row) for row in cursor.fetchall()]
    
    palmares_agrupado = {}
    for row in campeones_ligas + campeones_copas:
        torneo = row['torneo']
        equipo = row['equipo']
        año = row['año']
        
        if torneo not in palmares_agrupado:
            palmares_agrupado[torneo] = {}
        if equipo not in palmares_agrupado[torneo]:
            palmares_agrupado[torneo][equipo] = []
        
        palmares_agrupado[torneo][equipo].append(año)
        
    for torneo in palmares_agrupado:
        for equipo in palmares_agrupado[torneo]:
            palmares_agrupado[torneo][equipo].sort()

    # --- 4. HITOS ABSOLUTOS DE JUGADORES ---
    hitos_jugadores = {}
    configuracion_hitos = [
        ("Serie A", "Goleador", "serie_a_goles"),
        ("Serie A", "Asistente", "serie_a_asist"),
        ("Copa", "Goleador", "copa_goles"),
        ("Copa", "Asistente", "copa_asist"),
        ("Champions League", "Goleador", "champions_goles"),
        ("Champions League", "Asistente", "champions_asist"),
    ]

    for comp, cat, key in configuracion_hitos:
        cursor.execute('''
            WITH Ranked AS (
                SELECT P.nombre_jugador as jugador, E.nombre as equipo, P.estadistica as valor, T.año,
                       RANK() OVER(ORDER BY P.estadistica DESC) as rnk
                FROM Premios_Individuales P
                JOIN Equipos E ON P.id_equipo = E.id_equipo
                JOIN Temporadas T ON P.id_temporada = T.id_temporada
                WHERE P.competicion = %s AND P.categoria = %s
            ) SELECT * FROM Ranked WHERE rnk = 1
        ''', (comp, cat))
        hitos_jugadores[key] = agrupar_hitos(cursor.fetchall())
    
    # --- 5. HITOS HISTÓRICOS POR LIGA ---
    ligas = ["Serie A", "La Liga", "Bundesliga", "Premier League"]
    hitos_por_liga = {}
    for liga in ligas:
        cursor.execute('''WITH Ranked AS (SELECT E.nombre as equipo, T.año, H.pts as valor, RANK() OVER(ORDER BY H.pts DESC) as rnk FROM Historial_Top4 H JOIN Equipos E ON H.id_equipo = E.id_equipo JOIN Temporadas T ON H.id_temporada = T.id_temporada WHERE H.liga = %s) SELECT * FROM Ranked WHERE rnk = 1''', (liga,))
        m_pts = agrupar_hitos(cursor.fetchall())
        
        cursor.execute('''WITH Ranked AS (SELECT E.nombre as equipo, T.año, H.gf as valor, RANK() OVER(ORDER BY H.gf DESC) as rnk FROM Historial_Top4 H JOIN Equipos E ON H.id_equipo = E.id_equipo JOIN Temporadas T ON H.id_temporada = T.id_temporada WHERE H.liga = %s) SELECT * FROM Ranked WHERE rnk = 1''', (liga,))
        m_gf = agrupar_hitos(cursor.fetchall())
        
        cursor.execute('''WITH Ranked AS (SELECT E.nombre as equipo, T.año, H.gc as valor, RANK() OVER(ORDER BY H.gc ASC) as rnk FROM Historial_Top4 H JOIN Equipos E ON H.id_equipo = E.id_equipo JOIN Temporadas T ON H.id_temporada = T.id_temporada WHERE H.liga = %s) SELECT * FROM Ranked WHERE rnk = 1''', (liga,))
        m_gc = agrupar_hitos(cursor.fetchall())
        
        cursor.execute('''WITH Ranked AS (SELECT E.nombre as equipo, T.año, H.pp as valor, RANK() OVER(ORDER BY H.pp ASC) as rnk FROM Historial_Top4 H JOIN Equipos E ON H.id_equipo = E.id_equipo JOIN Temporadas T ON H.id_temporada = T.id_temporada WHERE H.liga = %s) SELECT * FROM Ranked WHERE rnk = 1''', (liga,))
        m_pp = agrupar_hitos(cursor.fetchall())

        hitos_por_liga[liga] = {
            "max_pts": m_pts,
            "max_gf": m_gf,
            "min_gc": m_gc,
            "min_pp": m_pp
        }

    # --- 6. PALMARÉS DE ASCENSOS Y DESCENSOS (SERIE B) ---
    cursor.execute("SELECT id_descendido_1, id_descendido_2, id_ascendido_1, id_ascendido_2 FROM Ascensos_Descensos")
    movs_raw = cursor.fetchall()
    
    cursor.execute("SELECT id_equipo, nombre FROM Equipos")
    eq_dict = {row['id_equipo']: row['nombre'] for row in cursor.fetchall()}

    movimientos = {}
    for row in movs_raw:
        d1 = eq_dict.get(row['id_descendido_1'])
        d2 = eq_dict.get(row['id_descendido_2'])
        a1 = eq_dict.get(row['id_ascendido_1']) 
        a2 = eq_dict.get(row['id_ascendido_2']) 

        for eq in [d1, d2, a1, a2]:
            if eq and eq not in movimientos:
                movimientos[eq] = {"campeon_B": 0, "ascensos": 0, "descensos": 0}
        
        if d1: movimientos[d1]["descensos"] += 1
        if d2: movimientos[d2]["descensos"] += 1
        if a1: 
            movimientos[a1]["campeon_B"] += 1
            movimientos[a1]["ascensos"] += 1
        if a2:
            movimientos[a2]["ascensos"] += 1

    movimientos_filtrados = {k: v for k, v in movimientos.items() if v["campeon_B"]>0 or v["ascensos"]>0 or v["descensos"]>0}
            
    conexion.close()

    # --- EL RETORNO QUE SOLUCIONA EL ERROR ---
    return {
        "hitos": hitos,
        "palmares": palmares_agrupado,
        "jugadores": premios_agrupados,
        "hitos_jugadores": hitos_jugadores,
        "hitos_por_liga": hitos_por_liga,
        "movimientos": movimientos_filtrados
    }

@app.delete("/equipos/{id_equipo}")
def eliminar_equipo(id_equipo: int):
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("DELETE FROM Equipos WHERE id_equipo = %s", (id_equipo,))
        conexion.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")
        return {"mensaje": "Equipo eliminado"}
    except psycopg2.IntegrityError:
        conexion.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar: el equipo tiene historial en temporadas pasadas.")
    finally:
        conexion.close()

@app.delete("/temporadas/{id_temporada}")
def eliminar_temporada(id_temporada: int):
    conexion = get_db_connection()
    cursor = conexion.cursor(cursor_factory=RealDictCursor)
    try:
        # En PostgreSQL, el ON DELETE CASCADE elimina el historial asociado automáticamente
        cursor.execute("DELETE FROM Temporadas WHERE id_temporada = %s", (id_temporada,))
        conexion.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Temporada no encontrada")
        return {"mensaje": "Temporada y todo su historial eliminados"}
    finally:
        conexion.close()
