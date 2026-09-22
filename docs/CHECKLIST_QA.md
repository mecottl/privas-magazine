# Checklist antes de cerrar una issue con flujo de usuario (issue #74)

Nace de varios bugs de una misma sesión que pasaron "revisión de código"
sin errores pero no funcionaban de verdad: el formulario de newsletter
nunca se habilitaba (bug de signals), el broadcast de Resend se creaba
pero nunca se enviaba (faltaba un segundo paso), y "Publicar ahora" no
disparaba newsletter/rebuild. Ninguno tronaba ni aparecía en los logs —
solo se notaron al probarlos en vivo.

**Regla:** si la issue toca un flujo que un usuario real (público, admin,
o la clienta) va a usar, no se cierra solo porque el build pasa y el
código se ve bien. Se corre esto primero:

## 1. Camino feliz, de principio a fin

- [ ] Reproducir el flujo completo como lo haría la persona real (no solo
      la parte que cambiaste) — ej. si tocaste el newsletter, suscribirse
      Y confirmar Y que llegue el correo, no solo que el POST responda 200.
- [ ] Si el flujo involucra un correo real (invitación, MFA, confirmación,
      newsletter), esperar a que de verdad llegue y abrirlo — un 200 de la
      Edge Function no prueba que Resend lo haya mandado ni que el usuario
      lo vaya a recibir.
- [ ] Si el flujo cambia algo que otro proceso lee después (ej. un cron,
      un trigger, otra función), probar también ESE consumidor, no solo el
      punto donde se guardó el dato.

## 2. El caso "no debería pasar nada"

- [ ] Probar la acción bloqueada (usuario sin permiso, token inválido,
      campo vacío) y confirmar que el error se ve bien, no solo que no
      truena.

## 3. Antes de cerrar

- [ ] `npm test` pasa en local.
- [ ] Si el cambio toca `articulos`/`ediciones_revista`/`perfiles_admin` o
      cualquier policy de RLS, correr una consulta de verificación contra
      la base real (Supabase MCP) confirmando el comportamiento esperado,
      no solo leer la policy.
- [ ] El comentario de cierre de la issue describe qué se probó en vivo,
      no solo qué se construyó.

## No es una lista para todo

Un cambio puramente de estilos, un typo, o un refactor sin cambio de
comportamiento no necesita este checklist completo — es para flujos con
lógica real (permisos, correos, dinero/estado persistente, Edge
Functions), no para cualquier commit.
