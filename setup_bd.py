import sqlite3

def crear_base_datos():
    conexion = sqlite3.connect("liga_master.db")
    cursor = conexion.cursor()

    # 1. Catálogo de Equipos
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Equipos (
        id_equipo INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        liga_origen TEXT NOT NULL -- Serie A, La Liga, Bundesliga, Premier League, Serie B
    )
    ''')

    # 2. Temporadas (Un solo año para WE10)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Temporadas (
        id_temporada INTEGER PRIMARY KEY AUTOINCREMENT,
        año INTEGER UNIQUE NOT NULL
    )
    ''')

    # 3. Historial Top 4 con Estadísticas
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Historial_Top4 (
        id_registro INTEGER PRIMARY KEY AUTOINCREMENT,
        id_temporada INTEGER,
        liga TEXT NOT NULL,
        posicion INTEGER NOT NULL, -- 1, 2, 3 o 4
        id_equipo INTEGER,
        pts INTEGER,
        pg INTEGER,
        pe INTEGER,
        pp INTEGER,
        gf INTEGER,
        gc INTEGER,
        FOREIGN KEY (id_temporada) REFERENCES Temporadas (id_temporada),
        FOREIGN KEY (id_equipo) REFERENCES Equipos (id_equipo)
    )
    ''')

    # 4. Ascensos y Descensos (Para tu liga)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Ascensos_Descensos (
        id_registro INTEGER PRIMARY KEY AUTOINCREMENT,
        id_temporada INTEGER,
        liga_principal TEXT NOT NULL, -- La liga donde juegas y ocurren los descensos
        id_descendido_1 INTEGER,
        id_descendido_2 INTEGER,
        id_ascendido_1 INTEGER, -- Campeón Serie B
        id_ascendido_2 INTEGER, -- Subcampeón Serie B
        FOREIGN KEY (id_temporada) REFERENCES Temporadas (id_temporada),
        FOREIGN KEY (id_descendido_1) REFERENCES Equipos (id_equipo),
        FOREIGN KEY (id_descendido_2) REFERENCES Equipos (id_equipo),
        FOREIGN KEY (id_ascendido_1) REFERENCES Equipos (id_equipo),
        FOREIGN KEY (id_ascendido_2) REFERENCES Equipos (id_equipo)
    )
    ''')

    conexion.commit()
    conexion.close()
    print("¡Base de datos de Winning Eleven 10 creada con éxito!")

if __name__ == "__main__":
    crear_base_datos()