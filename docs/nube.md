# Correr el bot en la nube (sin tu PC)

GitHub Actions enciende una computadora virtual con Chrome, inicia sesión en ED con tu cuenta,
carga el bot y lo deja trabajar hasta ~5,5 h. Gratis en repos públicos.

## 1. Guardar las cuentas (una vez; las editas cuando quieras)
GitHub → tu repo → **Settings → Secrets and variables → Actions → New repository secret**:

- **Name:** `ED_CUENTAS`
- **Secret:** una cuenta por línea → `usuario contraseña Nombre` (el Nombre es opcional, solo para reconocerla en el resumen):

```
hugo123 miClave1 Hugo
otro456 otraClave Prueba
```

Para agregar, quitar o cambiar cuentas: en la lista de secrets, el lápiz ✏️ de `ED_CUENTAS` → **Update**
(GitHub no te deja ver lo que había: vuelve a escribir la lista completa).
Las líneas que empiezan con `#` se ignoran. También vale `usuario:contraseña` o `usuario,contraseña`.

⚠ **Nunca** escribas contraseñas en el formulario de *Run workflow*, en el código ni en el chat: en un repo público
eso queda visible en los registros. En el secret están cifradas y en los registros salen como `***`.
(Compatibilidad: si no existe `ED_CUENTAS`, se usa `ED_USER_1` / `ED_PASS_1`.)

## 2. Lanzarlo
GitHub → **Actions → nube → Run workflow**:
- **cuentas:** cuáles de la lista correr → `1` · `2,3` · `todas` (cada una en su propia máquina, en paralelo).
- **modo:**
- `completar` (recomendado): en el Home lee **Course Completion** y **Average Test Score**, entra a la primera
  unidad sin "Completed!" (despliega su lista y abre la 1.ª lección incompleta), hace prácticas y tests, vuelve
  al Home y sigue con la siguiente. Al final, si el promedio de tests < 100, pasa solo al barrido de tests.
  Lo que no logra queda en el reporte y sigue con lo siguiente.
- `barrer`: solo busca y rehace tests < 100, lección por lección y unidad por unidad.
- `auto`: entra a la lección donde ibas (botón del Home) y sigue.
- `explorar` (v21.16): recorre TODAS las unidades y cataloga el nivel (sin tests).
- `auditoria` (NUEVO v21.18): solo lee My Progress, actualiza el tablero y termina (~10 min). Para ver cómo está una cuenta.
- **cadena** (NUEVO v21.18): no lo toques. Si a una cuenta se le acaban las 6 h de GitHub sin terminar, la nube la
  relanza sola (hasta 3 vueltas) y este número cuenta las vueltas. Las que terminan, se paran, tienen la contraseña
  mala o un captcha NO se relanzan.
- **ritmo** (NUEVO v21.14): segundos, en promedio, entre un paso y otro (pausa al azar de la mitad a 1,5 veces).
  `5` (por defecto) es ritmo de persona: un curso grande lleva ~4 h. Más alto = más lento; `0` = lo más rápido.
  El tablero muestra cuánto tiempo lleva en la plataforma.

## 3. Ver qué pasó
Lo más simple: en la ejecución, abajo en **Artifacts**, descarga **cuenta-1** (un zip) y pásaselo a Claude tal cual.
Trae `registro.txt` (todo lo que hizo), `reporte.txt` (fallos), `resumen.md` y fotos.

Al terminar, en la página de la ejecución aparece un **resumen**: Course Completion, Average Test Score,
unidades recorridas, tests revisados y el **reporte completo de fallos** (despliégalo y cópialo para el chat).
Además, en la ejecución → **Artifacts → cuenta-1**: trae `reporte.txt` (fallos, igual que el botón 📋),
`barrido.json` y fotos (`despues-del-login.png`, `ultima.png`, `final.png`, `login-fallido.png` si falló).
Los artifacts se borran solos a los 3 días. La memoria del bot (respuestas cosechadas) se guarda aparte
(caché de Actions) y la siguiente ejecución la retoma. **No se guardan cookies de sesión.**

## 3b. Tablero en vivo (NUEVO v21.13)
En el repo → pestaña **Issues** → **"📊 Tablero del bot"**. Cada cuenta tiene su cuadro con su **nombre** (la 3.ª
palabra de su línea en `ED_CUENTAS`) y se actualiza solo cada ~3 minutos mientras corre:
- arriba, una fila de **cuadritos** como el gráfico de Actions: `1 · Login` → `U1` → `U2` → … y en la unidad donde
  está, por dónde va (p. ej. `🔄 L3 · Test 4/10`);
- debajo, **cada unidad es un desplegable**: al tocarla se ve lección por lección, paso por paso y cada test
  (✅ hecho · ❌ falló + n.º de reporte · ⚠️ test < 100 · ⏭️ ya falló, no se repite · ⬜ pendiente · 🔄 ahora);
- al final, "Qué falló en esta corrida", con el lugar exacto y el n.º de reporte (el dump completo de ese momento
  está en `reporte.txt` del zip, con ese mismo número).
El mismo cuadro sale en el resumen de la ejecución y en el zip (`tablero.md`). **El repo es público**: el issue lo
puede ver cualquiera. Nunca salen usuarios ni contraseñas, pero sí el nombre que pongas en el secret: si no quieres
nombres reales, usa apodos o iniciales ahí.

## 3c. Banco de respuestas por curso (NUEVO v21.13)
Las respuestas que cosecha una cuenta se guardan en un **banco por curso** (UPB Beginners 1, Beginners 2,
Intermediate…), en la memoria privada de Actions (nunca en el repo). Las demás cuentas del mismo curso entran a los
tests con esas respuestas y no necesitan cosechar. El banco se junta al final de cada ejecución (job **juntar**): las
cuentas que corren al mismo tiempo no se pasan respuestas entre sí; la ejecución siguiente ya las tiene todas.
En el registro: `📚 Banco de "UPB Beginners 2": N tests con respuestas · esta cuenta tenía X, ahora Y`.

## 4. Más cuentas a la vez (AJUSTADA v21.16: sin cola)
Agrega líneas a `ED_CUENTAS` y lanza con `todas` (o los números que quieras). Ya no hay que tocar el workflow.
- **3 cuentas por máquina** (`por_maquina`, 1 a 4): `cloud/lote.js` arranca un Chrome por cuenta, 20 s de diferencia.
  GitHub gratis da **20 máquinas a la vez** → con 3 por máquina, hasta 60 cuentas al mismo tiempo (40 = 14 máquinas).
- **Sin fila**: cada corrida es independiente. Lanzar una cuenta más (p. ej. desde el panel) NO espera a las otras.
- **La misma cuenta dos veces**: la corrida nueva le pide a la vieja que la suelte (orden en el issue del tablero) y
  entra cuando quedó libre (máx. 6 min). Nunca hay dos sesiones de la misma cuenta.
- **Parar UNA cuenta** (sin tocar a las de su máquina): comentario `<!-- orden:parar N de:panel -->` en el issue del
  tablero (el panel lo hace solo); `lote.js` lo mira cada 2 min y esa cuenta guarda todo y termina.
- Opcional: un secret por cuenta `ED_CUENTA_<APODO>` (una línea) y lanzar por apodo.
- Zips: uno por cuenta (`cuenta-N`), como siempre. Nuevo en cada zip: `fotos/` (cada reporte + los 30 s anteriores),
  `diagnostico.json`, `resumen-para-ia.txt`, `catalogo.json`, `aprendido.json`.

## 4b. Panel del teléfono (NUEVO v21.16)
Ver `panel/LEEME.md`: Settings → Pages → Source: GitHub Actions (una vez) → https://hugozuniga770.github.io/Bot-Ingles/.
Correr todas / una / varias, agregar cuenta y correrla ya, parar, otra vez, tablero y corridas; pide tu clave en
cada acción. Modo **explorar**: recorre TODAS las unidades y arma el catálogo del nivel (sin tests).
Prueba diaria opcional: `canario.yml` (quita los `#` del `schedule`).
**Sin el panel** (NUEVO v21.18): en el issue "📊 Tablero del bot" escribe un comentario `/correr 3`, `/correr 1,2`,
`/parar 3`, `/explorar 3` o `/auditoria 3` (solo funciona si lo escribes tú, el dueño del repo). Te responde ahí mismo.

## 5. Que se relance solo
En `nube.yml`, quita los `#` de `schedule` / `cron` (cada 6 h). Ojo: corre aunque no lo mires.

## Límites conocidos
- Si entras a la cuenta mientras el robot corre, ED cierra una de las dos sesiones y el robot vuelve a entrar
  pulsando "Login on This Device" (te sacaría a ti). Si necesitas entrar, primero cancela la ejecución en Actions.
- GitHub corta cada ejecución a las 6 h (por eso el tope de 330 min).
- ED podría pedir captcha, desconfiar de servidores o de la misma cuenta abierta en 2 lugares:
  no abras la cuenta en tu PC mientras corre en la nube (ED cierra la sesión del robot: "Tu sesión no está más
  activa"; el robot vuelve a entrar solo, pero pierde tiempo y tras 6 veces se detiene).
- El login está probado contra una copia de la página real (dump del 31/10), no contra ED en vivo.
