Status: Reference
Owner: Product and Engineering
Last Updated: 2026-03-19
Source of Truth: Product background and onboarding context. Runtime behavior and implementation rules live in the canonical docs under `docs/architecture`, `docs/data`, and `docs/security`.
# DURANIA 2026  
## Sistema Integral de Gestión Ganadera  

---

# 1. Contexto del Proyecto

El sector ganadero estatal actualmente opera bajo un modelo fragmentado, dependiente de documentación física, procesos manuales y múltiples bases de datos aisladas (principalmente en sistemas heredados como Microsoft Access).

Esta situación genera:

- Desconexión entre información sanitaria, inventarios y movilizaciones.
- Procesos burocráticos lentos y propensos a errores humanos.
- Dificultad para garantizar trazabilidad completa del ganado.
- Riesgo sanitario y comercial en procesos de exportación.
- Limitaciones operativas en zonas rurales sin conectividad.

En un entorno donde la trazabilidad sanitaria es crítica para mantener el comercio internacional (especialmente con EE.UU.), la digitalización del ecosistema ganadero no es solo una mejora tecnológica, sino una necesidad estratégica.

El proyecto **DURANIA 2026** surge como respuesta a esta problemática, proponiendo una plataforma digital unificada que transforme la gestión ganadera estatal mediante automatización, validación sanitaria inteligente y operación offline.

---

# 2. ¿Qué es DURANIA?

DURANIA es un **Sistema Integral de Gestión Ganadera** diseñado para modernizar completamente la administración del ganado bovino en el estado.

Se trata de una plataforma tecnológica híbrida compuesta por:

- 📱 Aplicación móvil Offline-First (estilo PWA instalable tipo Spotify).
- 🖥️ Plataforma Web Administrativa (Back-Office centralizado).
- ☁️ Backend unificado en la nube.
- 🧠 Motor de reglas de negocio e Inteligencia Artificial.
- 📡 Integración con tecnologías IoT (BLE / LoRaWAN).

El sistema cubre el ciclo de vida completo del ganado bovino:

1. Identidad digital del productor y su UPP.
2. Control sanitario (Tuberculosis y Brucelosis).
3. Inventario y trazabilidad genealógica.
4. Movilización digital (REEMO 2.0).
5. Exportación automatizada con validación normativa.
6. Innovación en campo con AR, biometría nasal y análisis de movimiento.

---

# 3. Problema que Resuelve

El sistema aborda tres problemas estructurales principales:

## 3.1 Fragmentación de Sistemas

Actualmente existen múltiples bases de datos independientes (Pruebas ComiTB, Cuarentenas, REEMO, Rastros), lo que impide el cruce automático de información.

Consecuencia:
- Un animal puede tener permiso de movilización aun estando sanitariamente restringido.
- Inconsistencias entre inventarios reales y registros oficiales.

---

## 3.2 Dependencia del Papel

La gestión se realiza mediante:

- Solicitudes físicas.
- Dictámenes llenados a mano.
- Revisión manual de expedientes.
- Archivo físico de documentos.

Consecuencia:
- Lentitud administrativa.
- Alto riesgo de pérdida o alteración de información.
- Sobrecarga operativa para más de 45,000 UPPs registradas.

---

## 3.3 Falta de Conectividad Rural

En campo, los productores y MVZ frecuentemente no cuentan con acceso continuo a internet.

Consecuencia:
- No se pueden registrar eventos en tiempo real.
- Retrasos en actualización sanitaria.
- Riesgo de movilización sin validación inmediata.

DURANIA soluciona esto mediante una arquitectura **Offline-First con sincronización diferida (Store & Forward)**.

---

# 4. Objetivo General

Desarrollar e implementar un sistema digital integral que modernice la gestión ganadera mediante:

- Automatización de procesos.
- Validación sanitaria inteligente.
- Trazabilidad completa del ganado.
- Operación en entornos sin conectividad.

---

# 5. Objetivos Específicos

1. Digitalizar la administración de UPP e identidad del productor.
2. Automatizar el control sanitario (TB y BR).
3. Implementar movilización digital con validaciones automáticas.
4. Optimizar procesos de exportación conforme a reglas oficiales (ej. Regla del 60%).
5. Incorporar innovación tecnológica offline y basada en IA.
6. Integrar datos históricos de sistemas legados en una base de datos unificada.
7. Garantizar trazabilidad genealógica y sanitaria del ganado bovino.

---

# 6. Alcance del Proyecto

## 6.1 Dentro del Alcance (In Scope)

✔ Gestión digital de Productores y UPP.  
✔ Expediente digital con validación OCR.  
✔ Registro sanitario offline (TB/BR).  
✔ Gestión automática de animales "Reactores".  
✔ Geocercas sanitarias.  
✔ REEMO digital con QR dinámico.  
✔ Actualización automática de inventarios.  
✔ Validación algorítmica de exportación (Regla 60%).  
✔ Arquitectura Offline-First.  
✔ Biometría nasal y conteo BLE.  
✔ Migración de bases de datos legadas.

---

## 6.2 Fuera del Alcance (Out of Scope)

✖ Compra de hardware móvil para usuarios.  
✖ Instalación de infraestructura de telecomunicaciones.  
✖ Gestión de especies no bovinas.  
✖ Mantenimiento de sistemas Access antiguos.  
✖ Integraciones privadas no oficiales.

---

# 7. Módulos del Sistema

## Módulo 1: Administración de UPP e Identidad Digital
- Expediente digital del productor.
- Validación OCR de documentos.
- Cálculo automático de capacidad de carga.
- Gestión de roles (RBAC).

---

## Módulo 2: Control Sanitario e Inventario
- Registro offline de pruebas TB/BR.
- Bloqueo automático de Reactores.
- Trazabilidad madre-cría.
- Geocercas sanitarias.

---

## Módulo 3: Movilización Inteligente (REEMO 2.0)
- Emisión de pase digital con QR.
- Validación sanitaria previa.
- Transferencia automática de inventarios.

---

## Módulo 4: Exportación y Comercio
- Asignación de Arete Azul.
- Validación Regla del 60%.
- Verificación integral sanitaria antes de emitir certificado.

---

## Módulo 5: Innovación en Campo (IoT & AI)
- Conteo por proximidad BLE.
- Identificación biométrica nasal.
- Realidad aumentada (AR).
- Análisis de patrones de movimiento (Edge AI).
- Integración LoRaWAN.

---

# 8. Solución Tecnológica Propuesta

## Arquitectura Híbrida PWA (Write Once, Run Anywhere)

Se desarrollará una **Progressive Web App (PWA)** que funcione:

- Como aplicación móvil instalable.
- Como sistema web administrativo.
- Con una sola base de código.

Esto evita:
- Desarrollo doble (iOS + Android nativo).
- Mantenimiento de múltiples plataformas.

---

## Modelo Offline-First

La App móvil:

- Guarda datos en base local (SQLite/IndexedDB).
- Funciona 100% sin internet.
- Encola transacciones localmente.
- Sincroniza automáticamente cuando detecta conexión.

Este modelo garantiza operación continua en zonas rurales.

---

## Backend Centralizado

- API RESTful segura.
- Base de datos relacional en la nube.
- Motor de reglas de negocio.
- Validación sanitaria automática.
- Generación de reportes para autoridades.

---

# 9. Beneficios Esperados

- Eliminación del papel.
- Reducción de fraude sanitario.
- Trazabilidad completa desde nacimiento hasta exportación.
- Agilización de cruces fronterizos.
- Mayor capacidad de respuesta ante brotes.
- Operación digital incluso sin conectividad.
- Transparencia total en inventarios y movilizaciones.

---

# 10. Impacto Estratégico

DURANIA no es únicamente una aplicación, sino una transformación digital del ecosistema ganadero estatal.

El sistema:

- Conecta Productores, MVZ, Unión Ganadera y Autoridades.
- Centraliza información dispersa.
- Automatiza reglas sanitarias críticas.
- Reduce riesgos comerciales internacionales.
- Introduce tecnologías emergentes (IoT, IA, AR) al sector agropecuario.

---

# 11. Duración Estimada

- Duración: 8 a 12 semanas (según estrategia adoptada).
- Metodología: Ágil (Scrum).
- Desarrollo en paralelo (Frontend + Backend).
- MVP operativo desde Fase intermedia.

---

# 12. Conclusión

DURANIA 2026 representa un salto tecnológico en la gestión ganadera estatal.

Mediante una arquitectura offline-first, reglas sanitarias automatizadas y herramientas de inteligencia artificial en campo, el proyecto busca garantizar:

- Seguridad sanitaria.
- Trazabilidad total.
- Cumplimiento normativo.
- Eficiencia operativa.
- Sostenibilidad tecnológica.

Es una plataforma diseñada no solo para resolver problemas actuales, sino para preparar al sector ganadero para el futuro digital.
