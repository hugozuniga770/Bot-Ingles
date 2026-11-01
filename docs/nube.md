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

## 3. Ver qué pasó
Lo más simple: en la ejecución, abajo en **Artifacts**, descarga **cuenta-1** (un zip) y pásaselo a Claude tal cual.
Trae `registro.txt` (todo lo que hizo), `reporte.txt` (fallos), `resumen.md` y fotos.

Al terminar, en la página de la ejecución aparece un **resumen**: Course Completion, Average Test Score,
unidades recorridas, tests revisados y el **reporte completo de fallos** (despliégalo y cópialo para el chat).
Además, en la ejecución → **Artifacts → cuenta-1**: trae `reporte.txt` (fallos, igual que el botón 📋),
`barrido.json` y fotos (`despues-del-login.png`, `ultima.png`, `final.png`, `login-fallido.png` si falló).
Los artifacts se borran solos a los 3 días. La memoria del bot (respuestas cosechadas) se guarda aparte
(caché de Actions) y la siguiente ejecución la retoma. **No se guardan cookies de sesión.**

## 4. Más cuentas a la vez
Agrega líneas a `ED_CUENTAS` y lanza con `todas` (o los números que quieras). Ya no hay que tocar el workflow.

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
