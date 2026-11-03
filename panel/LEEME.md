# 📱 Panel del bot (desde el teléfono) — v21.16

Correr, parar, agregar cuentas y ver cómo va cada una, desde el celular. Es una página quieta: no hay servidor
propio; habla directo con GitHub usando **tu** token, que queda **cifrado con tu clave** en tu teléfono.

## Ponerlo en línea (una sola vez, 3 clics)
1. En GitHub, en el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Haz `git push` (o en **Actions → panel → Run workflow**). En 1 minuto queda en
   **https://hugozuniga770.github.io/Bot-Ingles/**
3. Ábrelo en el teléfono → menú del navegador → **Agregar a la pantalla de inicio** (queda como app, con atajo
   "▶ Todas" si mantienes apretado el ícono en Android).

## Configurarlo en el teléfono (una sola vez)
1. Saca un token: **github.com → tu foto → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
   - Repository access: **Only select repositories → Bot-Ingles**.
   - Permissions (Repository): **Actions: Read and write · Secrets: Read and write · Issues: Read and write**.
2. En el panel pega el token, tu lista de cuentas (lo mismo que tienes en `ED_CUENTAS`) y elige **tu clave**.

## Qué hace cada botón
- **▶ Correr todas**: todas las líneas de `ED_CUENTAS`, a la vez (3 por máquina; GitHub gratis da 20 máquinas).
- **＋ Cuenta**: la agrega al final de `ED_CUENTAS` (los números de las demás no cambian) y, si marcas "Correrla
  ya", arranca **en ese momento**, en su propia máquina, sin esperar a las otras.
- **⏹ Parar** (una cuenta): las demás de su máquina siguen; esa guarda todo y termina en 1–3 minutos.
- **🔁 Otra vez**: lanza la cuenta de nuevo; la corrida nueva le pide a la vieja que la deje y entra (nunca dos
  sesiones de la misma cuenta a la vez).
- **📊 Tablero**: unidad por unidad, paso por paso (lo mismo que el issue del tablero).
- **⚡ Corridas**: todas las corridas, con ⏹ para cancelar una entera.
- Todo lo que cambia algo **pide tu clave** otra vez. Se bloquea solo si lo dejas 15 min en segundo plano.

## Seguridad (en corto)
- El código del panel es público (como el del bot). Sin TU token y TU clave no puede tocar tu repo.
- En el teléfono solo queda el token y la lista **cifrados** (PBKDF2 600 000 + AES-GCM). La clave no se guarda.
- Las cuentas nuevas viajan a GitHub cifradas con la llave pública del repo (libsodium "sealed box"): ni el
  panel puede volver a leerlas desde GitHub.
- Si pierdes el teléfono: en GitHub borra el token (Settings → Developer settings → tokens) y listo.

Probado con un teléfono emulado contra una GitHub falsa: `tools/panel-prueba/probar.js`.
