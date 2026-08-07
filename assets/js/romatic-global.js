(() => {
  const FOTOS_COLLAGE = [
    "https://res.cloudinary.com/nrfykjzk/image/upload/v1785785634/IMG-20260802-WA0103_disrne.jpg",
    "https://res.cloudinary.com/nrfykjzk/image/upload/v1785785630/IMG-20260802-WA0082_faxfvd.jpg",
    "https://res.cloudinary.com/nrfykjzk/image/upload/v1785785557/IMG-20260802-WA0072_vw5sfq.jpg",
    "https://res.cloudinary.com/nrfykjzk/image/upload/v1785785554/IMG-20260802-WA0055_mzyi8d.jpg",
    "https://res.cloudinary.com/nrfykjzk/image/upload/v1785785493/IMG-20260802-WA0054_xthuta.jpg",
    "https://res.cloudinary.com/nrfykjzk/image/upload/v1785785338/IMG-20260802-WA0014_hjsvsl.jpg",
    "https://res.cloudinary.com/nrfykjzk/image/upload/v1785785313/IMG-20260802-WA0004_k9pi3j.jpg",
    "https://res.cloudinary.com/nrfykjzk/image/upload/v1785785276/IMG-20260802-WA0011_1_juwuxg.jpg",
    "https://res.cloudinary.com/nrfykjzk/image/upload/v1785785141/IMG-20260802-WA0003_vtnnbk.jpg",
    "https://res.cloudinary.com/nrfykjzk/image/upload/v1785784779/IMG_20260620_200356_076_jh2rwc.jpg"
  ];

  function barajar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  function poblarCollage(doc = document) {
    const cont = doc.getElementById('collageFondo');

    if (!cont) return;

    const win = doc.defaultView || window;

    const columnas = Math.ceil((win.innerWidth || 1200) / 115);
    const filas = Math.ceil((win.innerHeight || 800) / 115);

    const total = Math.max(18, columnas * filas);

    const indices = barajar(
      Array.from(
        { length: total },
        (_, i) => i % FOTOS_COLLAGE.length
      )
    );

    cont.innerHTML = '';

    indices.forEach(idx => {
      const img = doc.createElement('img');

      img.src = FOTOS_COLLAGE[idx];
      img.loading = 'lazy';
      img.alt = '';

      cont.appendChild(img);
    });
  }

  function montarCollage(doc = document) {
    if (!doc.body) return;

    if (!doc.getElementById('collageFondo')) {
      const fondo = doc.createElement('div');

      fondo.id = 'collageFondo';

      doc.body.insertBefore(
        fondo,
        doc.body.firstChild
      );
    }

    if (!doc.getElementById('collageVeladura')) {
      const veladura = doc.createElement('div');

      veladura.id = 'collageVeladura';

      const fondo = doc.getElementById('collageFondo');

      if (fondo.nextSibling) {
        doc.body.insertBefore(
          veladura,
          fondo.nextSibling
        );
      } else {
        doc.body.appendChild(veladura);
      }
    }

    poblarCollage(doc);
  }

  function mostrarToast(texto) {
    let host = document.getElementById('romanticToastHost');

    if (!host) {
      host = document.createElement('div');
      host.id = 'romanticToastHost';

      document.body.appendChild(host);
    }

    const t = document.createElement('div');

    t.className = 'romantic-toast';
    t.textContent = texto;

    host.appendChild(t);

    setTimeout(() => {
      t.remove();
    }, 5200);
  }

  async function pedirNotificaciones() {
    if (!('Notification' in window)) {
      mostrarToast(
        'Este navegador no admite notificaciones del sistema. Los avisos dentro de la página sí funcionarán.'
      );

      return false;
    }

    if (Notification.permission === 'granted') {
      mostrarToast(
        '🔔 Las notificaciones ya están activadas.'
      );

      return true;
    }

    if (Notification.permission === 'denied') {
      mostrarToast(
        'Las notificaciones están bloqueadas en el navegador. Puedes habilitarlas desde los permisos del sitio.'
      );

      return false;
    }

    const permiso = await Notification.requestPermission();

    if (permiso === 'granted') {
      mostrarToast(
        '🔔 Notificaciones activadas.'
      );
    }

    return permiso === 'granted';
  }

  function notificar(texto) {
    mostrarToast(
      '💜 ' + texto
    );

    if (
      'Notification' in window &&
      Notification.permission === 'granted' &&
      document.hidden
    ) {
      try {
        new Notification(
          'Para ti 💜',
          {
            body: texto
          }
        );
      } catch (_) {
      }
    }
  }

  async function registrarActividad(
    db,
    auth,
    tipo,
    mensaje,
    extra = {}
  ) {
    if (
      !db ||
      !auth ||
      !auth.currentUser
    ) {
      return;
    }

    try {
      await db.collection('actividad').add({
        tipo: tipo,
        mensaje: mensaje,
        autorUid: auth.currentUser.uid,
        autorEmail: auth.currentUser.email || '',
        fecha: Date.now(),
        ...extra
      });

    } catch (err) {
      console.warn(
        'No se pudo registrar actividad:',
        err
      );
    }
  }

  let unsubscribeActividad = null;

  function escucharActividad(
    db,
    auth
  ) {
    if (!db || !auth) {
      return;
    }

    if (unsubscribeActividad) {
      try {
        unsubscribeActividad();
      } catch (_) {
      }

      unsubscribeActividad = null;
    }

    let primeraCarga = true;

    try {
      unsubscribeActividad = db
        .collection('actividad')
        .orderBy('fecha', 'desc')
        .limit(12)
        .onSnapshot(
          (snap) => {
            if (primeraCarga) {
              primeraCarga = false;
              return;
            }

            snap.docChanges().forEach(cambio => {
              if (cambio.type !== 'added') {
                return;
              }

              const actividad = cambio.doc.data();

              const usuarioActual = auth.currentUser;

              if (!usuarioActual) {
                return;
              }

              if (
                actividad.autorUid === usuarioActual.uid
              ) {
                return;
              }

              notificar(
                actividad.mensaje ||
                'Hay algo nuevo en su página.'
              );
            });
          },

          err => {
            console.warn(
              'Avisos en tiempo real no disponibles:',
              err
            );
          }
        );

    } catch (err) {
      console.warn(
        'No se pudo iniciar el listener de actividad:',
        err
      );
    }
  }

  function aplicarCollageAIframe(iframe) {
    if (!iframe) {
      return;
    }

    try {
      const doc = iframe.contentDocument;

      if (
        !doc ||
        !doc.head ||
        !doc.body
      ) {
        return;
      }

      if (!doc.getElementById('romanticIframeStyle')) {
        const style = doc.createElement('style');

        style.id = 'romanticIframeStyle';

        style.textContent = `
          #collageFondo {
            position: fixed;
            inset: 0;
            z-index: 0;

            display: grid;

            grid-template-columns:
              repeat(auto-fill, 110px);

            grid-auto-rows: 110px;

            gap: 5px;

            justify-content: center;

            opacity: .5;

            filter:
              blur(1px)
              saturate(.85);

            pointer-events: none;

            overflow: hidden;
          }

          #collageFondo img {
            width: 100%;
            height: 100%;

            object-fit: cover;

            border-radius: 4px;
          }

          #collageVeladura {
            position: fixed;

            inset: 0;

            z-index: 1;

            background:
              linear-gradient(
                180deg,
                rgba(42,22,80,.72),
                rgba(74,42,128,.68) 50%,
                rgba(107,74,160,.72)
              );

            pointer-events: none;
          }

          body > *:not(#collageFondo):not(#collageVeladura) {
            position: relative;

            z-index: 2;
          }
        `;

        doc.head.appendChild(style);
      }

      montarCollage(doc);

    } catch (err) {
      console.warn(
        'No se pudo aplicar el collage al contenido embebido:',
        err
      );
    }
  }

  function chispa(
    x,
    y,
    emoji = '💜'
  ) {
    const s = document.createElement('span');

    s.className = 'romantic-spark';

    s.textContent = emoji;

    s.style.left = x + 'px';
    s.style.top = y + 'px';

    document.body.appendChild(s);

    setTimeout(() => {
      s.remove();
    }, 800);
  }

  function activarChispas() {
    document.addEventListener(
      'click',
      e => {
        const objetivo = e.target.closest(
          `
          button,
          a.card,
          .card-categoria,
          .festivo-card,
          .carpeta-card,
          .reaccion-btn
          `
        );

        if (!objetivo) {
          return;
        }

        const emoji =
          Math.random() > 0.75
            ? '✨'
            : '💜';

        chispa(
          e.clientX,
          e.clientY,
          emoji
        );
      }
    );
  }

  const iniciar = () => {
    montarCollage(document);

    activarChispas();

    let timer;

    window.addEventListener(
      'resize',
      () => {
        clearTimeout(timer);

        timer = setTimeout(
          () => {
            poblarCollage(document);
          },
          180
        );
      }
    );
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      iniciar
    );
  } else {
    iniciar();
  }

  window.RomanticApp = {
    fotos: FOTOS_COLLAGE,
    montarCollage: montarCollage,
    poblarCollage: poblarCollage,
    mostrarToast: mostrarToast,
    pedirNotificaciones: pedirNotificaciones,
    registrarActividad: registrarActividad,
    escucharActividad: escucharActividad,
    aplicarCollageAIframe: aplicarCollageAIframe
  };
})();