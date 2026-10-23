"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Intro de la portada: la puerta de entrada se acerca y se abre hacia el interior, donde
 * aparece la marca con "INGRESAR AL SITIO WEB". Se ve una sola vez por visitante
 * (localStorage) y se puede saltear. El script en línea oculta la intro antes de pintar
 * si ya se vio, así no hay parpadeo.
 */
const CLAVE = "denunzio-intro-vista";

// Botón dibujado en la imagen interior (en % del ancho/alto de la imagen 1673×940).
const BOTON = { left: 36.6, top: 68.6, width: 27.4, height: 9.4 };

export default function IntroPortada() {
  const [estado, setEstado] = useState<"corriendo" | "saliendo" | "fin">("corriendo");
  const [listo, setListo] = useState(false); // el botón responde cuando ya se ve la marca
  const ref = useRef<HTMLDivElement>(null);

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
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setListo(true), reducido ? 0 : 4300);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && entrar();
    window.addEventListener("keydown", tecla);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", tecla);
      document.documentElement.style.overflow = "";
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function entrar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {}
    setEstado("saliendo");
    document.documentElement.style.overflow = "";
    setTimeout(() => setEstado("fin"), 750);
  }

  if (estado === "fin") return null;

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
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenida — De Nunzio Negocios Inmobiliarios"
        className={estado === "saliendo" ? "intro-salida" : ""}
      >
        {/* 1. Exterior: la puerta pivotante */}
        <div className="intro-capa intro-puerta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/intro/puerta.webp" alt="" fetchPriority="high" />
        </div>
        <div className="intro-destello" aria-hidden />

        {/* 2. Interior con la marca */}
        <div className="intro-capa intro-interior">
          <div className="intro-marco">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/intro/interior.webp" alt="De Nunzio Negocios Inmobiliarios — Tu próximo capítulo comienza en casa." fetchPriority="high" />
            <button
              type="button"
              onClick={entrar}
              disabled={!listo}
              className="intro-boton"
              style={{ left: `${BOTON.left}%`, top: `${BOTON.top}%`, width: `${BOTON.width}%`, height: `${BOTON.height}%` }}
            >
              <span className="sr-only">Ingresar al sitio web</span>
            </button>
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
#intro-portada{position:fixed;inset:0;z-index:100;background:#050505;overflow:hidden;animation:intro-in .9s ease-out both}
#intro-portada.intro-salida{animation:intro-out .75s ease-in forwards}
.intro-capa{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.intro-puerta img{width:100%;height:100%;object-fit:cover;object-position:34% 55%;transform-origin:33% 56%;
  animation:intro-acercar 3.9s cubic-bezier(.55,0,.35,1) .2s both, intro-ocultar .9s ease-in 3.2s forwards}
.intro-destello{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 55%,rgba(255,214,150,.95),rgba(255,180,90,.35) 45%,transparent 75%);
  opacity:0;animation:intro-destello 1.5s ease-in-out 2.9s both}
.intro-interior{opacity:0;animation:intro-mostrar 1.3s ease-out 3.3s forwards}
/* En celulares la imagen no llega a cubrir el alto: el fondo es la misma imagen difuminada. */
.intro-interior::before{content:"";position:absolute;inset:-40px;background:url(/intro/interior.webp) center/cover;filter:blur(28px) brightness(.5)}
.intro-interior::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.45))}
/* La imagen interior cubre la pantalla, pero en celulares se achica lo justo para que la marca y el botón entren enteros. */
.intro-marco{position:relative;z-index:1;flex:none;aspect-ratio:1673/940;width:max(100vw,177.98vh);
  animation:intro-asentar 2.4s cubic-bezier(.2,.7,.2,1) 3.3s both}
@media (max-aspect-ratio:3/4){.intro-marco{width:265vw;-webkit-mask-image:linear-gradient(transparent,#000 9%,#000 91%,transparent);mask-image:linear-gradient(transparent,#000 9%,#000 91%,transparent)}}
.intro-marco img{display:block;width:100%;height:100%}
.intro-boton{position:absolute;border-radius:14px;cursor:pointer;background:transparent;transition:box-shadow .3s,background .3s}
.intro-boton:not(:disabled){animation:intro-latido 2.4s ease-in-out infinite}
.intro-boton:hover:not(:disabled),.intro-boton:focus-visible{background:rgba(255,215,140,.08);box-shadow:0 0 0 2px rgba(231,196,120,.9),0 0 38px rgba(231,196,120,.55);outline:none}
.intro-boton:disabled{cursor:default}
.intro-saltar{position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;z-index:2;padding:8px 16px;border-radius:999px;
  font:600 12px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,236,200,.85);
  background:rgba(0,0,0,.35);border:1px solid rgba(231,196,120,.4);backdrop-filter:blur(6px);cursor:pointer}
.intro-saltar:hover{color:#fff;border-color:rgba(231,196,120,.9)}
@keyframes intro-in{from{opacity:0}to{opacity:1}}
@keyframes intro-out{to{opacity:0;transform:scale(1.04)}}
@keyframes intro-acercar{0%{transform:scale(1);filter:brightness(.85)}100%{transform:scale(3.1);filter:brightness(1.25) blur(1.5px)}}
@keyframes intro-ocultar{to{opacity:0}}
@keyframes intro-destello{0%{opacity:0}45%{opacity:.85}100%{opacity:0}}
@keyframes intro-mostrar{to{opacity:1}}
@keyframes intro-asentar{0%{transform:scale(1.14);filter:blur(10px) brightness(1.3)}100%{transform:scale(1);filter:none}}
@keyframes intro-latido{0%,100%{box-shadow:0 0 0 0 rgba(231,196,120,0)}50%{box-shadow:0 0 26px 2px rgba(231,196,120,.45)}}
@media (prefers-reduced-motion:reduce){
  #intro-portada,.intro-puerta img,.intro-destello,.intro-marco,.intro-boton:not(:disabled){animation:none!important}
  .intro-puerta,.intro-destello{display:none}.intro-interior{opacity:1;animation:none}
}
`;
