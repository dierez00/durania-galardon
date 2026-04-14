# Durania App - 8A

> Gestión inteligente de ganado bovino para productores de Durango, México.

---

## ¿Qué es 8A

8A es una app iOS diseñada para ranchos ganaderos que necesitan llevar un control preciso de su hato. Permite identificar animales con escaneo NFC, QR y realidad aumentada, registrar su estado sanitario, consultar su ubicación GPS en tiempo real, y tener un historial completo de vacunas y eventos de salud — todo desde el campo.

---

## Funcionalidades principales

### Dashboard
Vista general del hato con estadísticas en vivo:
- Conteo total de bovinos
- Animales en observación y cuarentena
- Vacunas próximas con alertas por urgencia (vencida / hoy / en N días)
- Accesos rápidos a escaneo y ubicación

### Catálogo de ganado
- Lista de bovinos con búsqueda por arete o nombre
- Ficha completa: raza, sexo, peso, estado sanitario, historial de vacunas y eventos
- Edición de datos desde la propia ficha
- Alta de nuevos bovinos con formulario

### Escaneo de bovinos
Tres modos de identificación:

| Modo | Tecnología | Estado |
|------|-----------|--------|
| NFC | CoreNFC | Simulado (sin Developer Program activo) |
| QR | AVFoundation | Funcional |
| AR | ARKit + RealityKit | Funcional — muestra poster con estado sanitario real |

Los aretes se identifican en formato `MX-NNNNN` o como URL `https://api.durania.app/bovine/MX-NNNNN`.

### Ubicación en tiempo real
Mapa con la posición de cada animal:
- **MX-20395 (Niebla)** — GPS en vivo vía collar IoT (stream SSE desde backend Railway)
- Resto del hato — coordenadas mock hasta asignación de collar
- Indicadores de movimiento, temperatura corporal y nivel de batería del collar

### Historial sanitario
- Registro de vacunas con dosis, lote y fecha de próxima aplicación
- Eventos de salud: revisiones, cuarentenas, desparasitaciones, etc.

---

## Stack técnico

```
Swift + SwiftUI (iOS 17+)
├── ARKit + RealityKit    — image tracking para escaneo AR
├── AVFoundation          — escaneo QR con cámara
├── MapKit                — mapa de ubicación del ganado
└── SwiftData             — persistencia local de modelos de negocio
```

**Backend IoT (externo):**
```
GET https://backend-iot-production.up.railway.app/api/collars/{collarId}/realtime/stream
    ?tenantId={tenantId}
```
Streaming SSE con datos de GPS, velocidad, temperatura, batería y señal por collar.

---

## Modelos de datos

```
Bovine              — arete, nombre, raza, sexo, peso, estado sanitario, rancho
  ├── [Vaccine]     — nombre, dosis, lote, fecha, próxima dosis
  └── [HealthEvent] — título, descripción, fecha

CowLocation         — lat/lon, estado de movimiento, batería?, temperatura?
CollarReading       — payload del stream SSE (lat, lon, spd, temp, activity, bat...)
```

---

## Catálogo inicial (seed)

| Arete | Nombre | Raza | Estado |
|-------|--------|------|--------|
| MX-20394 | Luna | Angus | Sano |
| MX-20395 | Niebla | Brahman | Observación |
| MX-20396 | Rayo | Charolais | Cuarentena |
| MX-20397 | Brisa | Angus | Sano |

Todos en **Rancho El Roble**, Durango. Se insertan automáticamente al primer arranque si el store está vacío.

---

## Estructura del proyecto

```
durania-app/
├── Models/
│   ├── Bovine.swift
│   ├── Vaccine.swift
│   ├── HealthEvent.swift
│   ├── CowLocation.swift
│   ├── CollarReading.swift
│   ├── Ranch.swift
│   └── Producer.swift
├── Views/
│   ├── HomeView.swift
│   ├── Cattle/
│   │   ├── CattleListView.swift
│   │   ├── BovineDetailView.swift
│   │   ├── AddCattleView.swift
│   │   └── EditBovineView.swift
│   ├── CattleLocationView.swift
│   ├── CowCard.swift
│   └── ReportsView.swift      ← pendiente de implementar
├── Scan/
│   ├── ScanView.swift
│   ├── ARView.swift
│   ├── QRCodeScannerView.swift
│   └── BovineScanViewModel.swift
├── Services/
│   ├── CollarStreamService.swift
│   ├── NFCService.swift
│   └── NFCTagData.swift
├── Components/
│   ├── DashboardCard.swift
│   ├── QuickActionButton.swift
│   ├── HomeButton.swift
│   └── InfoRow.swift
├── Resources/
│   └── AppColors.swift
└── durania_appApp.swift
```

---

## Paleta de colores

| Token | Hex | Uso |
|-------|-----|-----|
| `tealGreen` | `#00A385` | Color principal de acción |
| `forestGreen` | `#00493A` | Títulos y encabezados |
| `lint` | `#D7D7A8` | Verde claro de fondo |

---

## Notas de desarrollo

- **NFC simulado:** `NFCService.startSimulatedScan` devuelve siempre `MX-20394` tras 1 segundo. No se modificará hasta tener Apple Developer Program activo.
- **CollarStreamService:** `@Observable @MainActor` sin Combine. Reconexión automática con 3 s de espera si el stream SSE se corta.
- **ReportsView:** esqueleto UI sin datos reales. Pendiente.
- **AR image group:** las imágenes de referencia están en el asset group `CodigosGanado`. El nombre de cada imagen debe coincidir exactamente con el arete del bovino.

---

## Requisitos

- Xcode 15+
- iOS 17+
- Apple Developer Program (para NFC real en dispositivo físico)

---

*Hecho con Swift en Durango, México.*
