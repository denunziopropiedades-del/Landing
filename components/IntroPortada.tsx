"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Intro de la portada: la puerta cerrada con la marca, la cámara se acerca, la puerta se
 * abre y aparece el interior con "INGRESAR AL SITIO WEB". Se ve una sola vez por visitante
 * (localStorage) y se puede saltear. El script en línea oculta la intro antes de pintar
 * si ya se vio, así no hay parpadeo.
 */
const CLAVE = "denunzio-intro-vista";
// Si nadie toca nada, entra solo al sitio cuando termina la animación (con la marca a la vista un par de segundos).
const ENTRADA_AUTOMATICA_MS = 8000;

// Botón "INGRESAR AL SITIO WEB" dibujado en cada imagen (en % de la imagen, ~1672×940).
const BOTON_CERRADA = { left: 39.8, top: 67.5, width: 23.3, height: 7.6 };
const BOTON_ABIERTA = { left: 36.6, top: 68.6, width: 27.4, height: 9.4 };

export default function IntroPortada() {
  const [estado, setEstado] = useState<"corriendo" | "saliendo" | "fin">("corriendo");
  const salio = useRef(false);

  useEffect(() => {
    let vista = false;
    try {
      vista = localStorage.getItem(CLAVE) === "1";
    } catch {}
    if (vista || document.documentElement.classList.contains("intro-vista")) {
      setEstado("fin");
      return;
    }
    document.documentElement.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && entrar();
    window.addEventListener("keydown", tecla);
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const auto = setTimeout(entrar, reducido ? 3000 : ENTRADA_AUTOMATICA_MS);
    return () => {
      clearTimeout(auto);
      window.removeEventListener("keydown", tecla);
      document.documentElement.style.overflow = "";
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function entrar() {
    if (salio.current) return;
    salio.current = true;
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {}
    setEstado("saliendo");
    document.documentElement.style.overflow = "";
    setTimeout(() => setEstado("fin"), 750);
  }

  if (estado === "fin") return null;

  const boton = (b: typeof BOTON_CERRADA) => (
    <button
      type="button"
      onClick={entrar}
      className="intro-boton"
      style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` }}
    >
      <span className="sr-only">Ingresar al sitio web</span>
    </button>
  );

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem("${CLAVE}")==="1")document.documentElement.classList.add("intro-vista")}catch(e){}`,
        }}
      />
      <style>{CSS}</style>
      <div
        id="intro-portada"
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenida — De Nunzio Negocios Inmobiliarios"
        className={estado === "saliendo" ? "intro-salida" : ""}
      >
        {/* 1. Puerta cerrada con la marca */}
        <div className="intro-capa intro-cerrada">
          <div className="intro-marco">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/intro/puerta-cerrada.webp" alt="" fetchPriority="high" />
            {boton(BOTON_CERRADA)}
          </div>
        </div>
        <div className="intro-destello" aria-hidden />

        {/* 2. La puerta se abre: interior con la marca */}
        <div className="intro-capa intro-abierta">
          <div className="intro-marco">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/intro/interior.webp" alt="De Nunzio Negocios Inmobiliarios — Tu próximo capítulo comienza en casa." />
            {boton(BOTON_ABIERTA)}
          </div>
        </div>

        <button type="button" onClick={entrar} className="intro-saltar">
          Saltar intro
        </button>
      </div>
    </>
  );
}

const CSS = `
.intro-vista #intro-portada{display:none}
#intro-portada{position:fixed;inset:0;z-index:100;background:#050505;overflow:hidden;animation:intro-in 1s ease-out both}
#intro-portada.intro-salida{animation:intro-out .75s ease-in forwards}
.intro-capa{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
/* En celulares la imagen no llega a cubrir el alto: de fondo va la misma imagen difuminada. */
.intro-capa::before{content:"";position:absolute;inset:-40px;background-position:center;background-size:cover;filter:blur(28px) brightness(.5)}
.intro-cerrada::before{background-image:url(/intro/puerta-cerrada.webp)}
.intro-abierta::before{background-image:url(/intro/interior.webp)}
.intro-capa::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.45))}
/* La imagen cubre la pantalla; en celulares se achica lo justo para que la marca y el botón entren enteros. */
.intro-marco{position:relative;z-index:1;flex:none;aspect-ratio:1672/940;width:max(100vw,177.9vh)}
@media (max-aspect-ratio:3/4){.intro-marco{width:265vw;-webkit-mask-image:linear-gradient(transparent,#000 9%,#000 91%,transparent);mask-image:linear-gradient(transparent,#000 9%,#000 91%,transparent)}}
.intro-marco img{display:block;width:100%;height:100%}
/* Puerta cerrada: la cámara se acerca despacio y la puerta "se abre" hacia el interior. */
.intro-cerrada .intro-marco{transform-origin:50% 48%;animation:intro-acercar 3.6s cubic-bezier(.4,0,.3,1) .3s both}
.intro-cerrada{animation:intro-ocultar 1.1s ease-in-out 3.2s forwards}
.intro-destello{position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(255,214,150,.75),rgba(255,180,90,.25) 45%,transparent 75%);
  opacity:0;animation:intro-destello 1.6s ease-in-out 2.9s both}
.intro-abierta{opacity:0;pointer-events:none;animation:intro-mostrar 1.2s ease-out 3.3s forwards}
.intro-abierta .intro-marco{animation:intro-asentar 2.6s cubic-bezier(.2,.7,.2,1) 3.3s both}
.intro-boton{position:absolute;border-radius:14px;cursor:pointer;background:transparent;transition:box-shadow .3s,background .3s;animation:intro-latido 2.4s ease-in-out 1.5s infinite}
.intro-boton:hover,.intro-boton:focus-visible{background:rgba(255,215,140,.08);box-shadow:0 0 0 2px rgba(231,196,120,.9),0 0 38px rgba(231,196,120,.55);outline:none}
.intro-saltar{position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;z-index:3;padding:8px 16px;border-radius:999px;
  font:600 12px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,236,200,.85);
  background:rgba(0,0,0,.35);border:1px solid rgba(231,196,120,.4);backdrop-filter:blur(6px);cursor:pointer}
.intro-saltar:hover{color:#fff;border-color:rgba(231,196,120,.9)}
@keyframes intro-in{from{opacity:0}to{opacity:1}}
@keyframes intro-out{to{opacity:0;transform:scale(1.04)}}
@keyframes intro-acercar{0%{transform:scale(1)}100%{transform:scale(1.16);filter:brightness(1.12)}}
@keyframes intro-ocultar{to{opacity:0;visibility:hidden}}
@keyframes intro-destello{0%{opacity:0}45%{opacity:.7}100%{opacity:0}}
@keyframes intro-mostrar{to{opacity:1;pointer-events:auto}}
@keyframes intro-asentar{0%{transform:scale(1.12);filter:blur(6px) brightness(1.25)}100%{transform:scale(1);filter:none}}
@keyframes intro-latido{0%,100%{box-shadow:0 0 0 0 rgba(231,196,120,0)}50%{box-shadow:0 0 26px 2px rgba(231,196,120,.45)}}
@media (prefers-reduced-motion:reduce){
  #intro-portada,.intro-cerrada .intro-marco,.intro-abierta .intro-marco,.intro-destello,.intro-boton{animation:none!important}
  .intro-cerrada,.intro-destello{display:none}.intro-abierta{opacity:1;pointer-events:auto;animation:none}
}
`;
