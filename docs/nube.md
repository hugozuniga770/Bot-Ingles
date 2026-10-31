# Correr el bot en la nube (sin tu PC)

GitHub Actions enciende una computadora virtual con Chrome, inicia sesión en ED con tu cuenta,
carga el bot y lo deja trabajar hasta ~5,5 h. Gratis en repos públicos.

## 1. Guardar la cuenta (una sola vez)
GitHub → tu repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Nombre | Valor |
|---|---|
| `ED_USER_1` | tu usuario de ED |
| `ED_PASS_1` | tu contraseña de ED |

Los secrets están cifrados: nadie los puede leer (ni siquiera tú después) y en los registros salen como `***`.
**Nunca** escribas usuarios o contraseñas en el código ni en el chat.

## 2. Lanzarlo
GitHub → **Actions → nube → Run workflow** → elige el modo:
- `completar` (recomendado): en el Home lee **Course Completion** y **Average Test Score**, entra a la primera
  unidad sin "Completed!" (despliega su lista y abre la 1.ª lección incompleta), hace prácticas y tests, vuelve
  al Home y sigue con la siguiente. Al final, si el promedio de tests < 100, pasa solo al barrido de tests.
  Lo que no logra queda en el reporte y sigue con lo siguiente.
- `barrer`: solo busca y rehace tests < 100, lección por lección y unidad por unidad.
- `auto`: entra a la lección donde ibas (botón del Home) y sigue.

## 3. Ver qué pasó
Al terminar, en la página de la ejecución aparece un **resumen**: Course Completion, Average Test Score,
unidades recorridas, tests revisados y el **reporte completo de fallos** (despliégalo y cópialo para el chat).
Además, en la ejecución → **Artifacts → cuenta-1**: trae `reporte.txt` (fallos, igual que el botón 📋),
`barrido.json` y fotos (`despues-del-login.png`, `ultima.png`, `final.png`, `login-fallido.png` si falló).
Los artifacts se borran solos a los 3 días. La memoria del bot (respuestas cosechadas) se guarda aparte
(caché de Actions) y la siguiente ejecución la retoma. **No se guardan cookies de sesión.**

## 4. Más cuentas a la vez
1. Agrega `ED_USER_2` / `ED_PASS_2`, `ED_USER_3` / `ED_PASS_3`, …
2. En `.github/workflows/nube.yml` cambia `cuenta: [1]` por `cuenta: [1, 2, 3]`.
Cada cuenta corre en su propia máquina, en paralelo.

## 5. Que se relance solo
En `nube.yml`, quita los `#` de `schedule` / `cron` (cada 6 h). Ojo: corre aunque no lo mires.

## Límites conocidos
- GitHub corta cada ejecución a las 6 h (por eso el tope de 330 min).
- ED podría pedir captcha, desconfiar de servidores o de la misma cuenta abierta en 2 lugares:
  no abras la cuenta en tu PC mientras corre en la nube.
- El login está probado contra una copia de la página real (dump del 31/10), no contra ED en vivo.
