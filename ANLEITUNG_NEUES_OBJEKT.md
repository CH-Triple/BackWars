# Anleitung: Neues Objekt zum UnitDisplay hinzufügen

Diese Anleitung erklärt Schritt für Schritt, wie man ein neues Gebäude, eine neue Rakete oder ein anderes Objekt zum UnitDisplay hinzufügt. Als Beispiel dient die Implementierung von **Farmland**.

---

## Inhaltsverzeichnis

1. [Übersicht und Architektur](#übersicht-und-architektur)
2. [Schritt-für-Schritt Anleitung](#schritt-für-schritt-anleitung)
3. [Detaillierte Erklärungen](#detaillierte-erklärungen)
4. [Referenz-Tabellen](#referenz-tabellen)

---

## Übersicht und Architektur

### System-Architektur

Das BackWars-Spiel verwendet eine klare Trennung zwischen Core-Logik (Server) und Client-Logik (UI). Ein neues Objekt muss in beiden Bereichen integriert werden:

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE (Server-Logik)                      │
├─────────────────────────────────────────────────────────────┤
│ 1. UnitType Enum (Game.ts)                                 │
│ 2. UnitInfo Konfiguration (DefaultConfig.ts)                │
│ 3. Execution-Klasse (z.B. FarmlandExecution.ts)             │
│ 4. ConstructionExecution Integration                        │
│ 5. UnitImpl Erweiterung                                     │
│ 6. PlayerImpl Spawn-Logik                                   │
│ 7. StatsSchemas Integration                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (UI-Logik)                        │
├─────────────────────────────────────────────────────────────┤
│ 8. UnitDisplay Integration (Gebäudeleiste)                  │
│ 9. BuildMenu Integration (Build-Menü)                       │
│ 10. InputHandler Keybinds (Tastatursteuerung)              │
│ 11. Grafische Darstellung (Icons, StructureLayer)          │
│ 12. Sprachdateien (Übersetzungen)                           │
└─────────────────────────────────────────────────────────────┘
```

### Wichtige Konzepte

#### Execution Interface
Das `Execution` Interface ist das Herzstück der Game-Loop. Jedes Objekt im Spiel hat eine Execution-Klasse, die in jedem Tick aufgerufen wird:

```typescript
export interface Execution {
  init(mg: Game, ticks: number): void;
  tick(ticks: number): void;
  isActive(): boolean;
  activeDuringSpawnPhase(): boolean;
}
```

**Was macht Execution?**
- `init()`: Wird einmal beim Start aufgerufen, initialisiert das Objekt
- `tick()`: Wird in jedem Game-Tick aufgerufen, enthält die Hauptlogik
- `isActive()`: Gibt zurück, ob die Execution noch aktiv ist
- `activeDuringSpawnPhase()`: Bestimmt, ob die Execution während der Spawn-Phase aktiv ist

#### Unit Interface
Das `Unit` Interface repräsentiert eine Einheit im Spiel (Gebäude, Rakete, etc.):

```typescript
export interface Unit {
  id(): number;
  type(): UnitType;
  owner(): Player;
  tile(): TileRef;
  isActive(): boolean;
  // ... viele weitere Methoden
}
```

**Was macht Unit?**
- Speichert alle Daten einer Einheit (Position, Besitzer, Typ, etc.)
- Bietet Methoden zum Zugriff auf Eigenschaften
- Wird von `UnitImpl` implementiert

#### Game Loop
Der Game Loop läuft kontinuierlich und ruft für jede aktive Execution die `tick()`-Methode auf. Dies ermöglicht kontinuierliche Updates (z.B. Gold-Generierung bei Farmland).

---

## Schritt-für-Schritt Anleitung

### Schritt 1: UnitType Enum hinzufügen

**Datei:** `src/core/game/Game.ts`  
**Zeilen:** 181-200

Füge den neuen UnitType zum Enum hinzu:

```typescript
export enum UnitType {
  // ... bestehende Typen
  Farmland = "Farmland",
  DeinNeuerTyp = "Dein Neuer Typ",  // ← Hier hinzufügen
}
```

**Was macht diese Datei?**
- Definiert alle verfügbaren Unit-Typen im Spiel
- Wird überall im Code verwendet, um Unit-Typen zu identifizieren
- Der String-Wert wird für Serialisierung/Deserialisierung verwendet

**Wichtig:** Füge den neuen Typ auch zur `_structureTypes` Set hinzu (Zeile 207-216), wenn es ein Gebäude ist:

```typescript
const _structureTypes: ReadonlySet<UnitType> = new Set([
  // ... bestehende Typen
  UnitType.Farmland,
  UnitType.DeinNeuerTyp,  // ← Hier hinzufügen
]);
```

Die Funktion `isStructureType()` (Zeile 218-220) prüft, ob ein UnitType ein Gebäude ist.

---

### Schritt 2: UnitParamsMap erweitern

**Datei:** `src/core/game/Game.ts`  
**Zeilen:** 230-279

Füge Parameter-Typ für deinen neuen UnitType hinzu:

```typescript
export interface UnitParamsMap {
  // ... bestehende Einträge
  [UnitType.Farmland]: Record<string, never>;
  [UnitType.DeinNeuerTyp]: Record<string, never>;  // ← Hier hinzufügen
}
```

**Was macht UnitParamsMap?**
- Definiert die Parameter, die beim Erstellen einer Unit übergeben werden können
- `Record<string, never>` bedeutet "keine Parameter"
- Für komplexere Units können hier spezifische Parameter definiert werden (z.B. `Warship` hat `patrolTile`)

---

### Schritt 3: UnitInfo in DefaultConfig hinzufügen

**Datei:** `src/core/configuration/DefaultConfig.ts`  
**Zeilen:** 454-599

Füge einen neuen `case` in der `unitInfo()` Methode hinzu:

```typescript
unitInfo(type: UnitType): UnitInfo {
  switch (type) {
    // ... bestehende cases
    case UnitType.Farmland:
      return {
        cost: this.costWrapper(
          (numUnits: number) =>
            Math.min(500_000, Math.pow(2, numUnits) * 75_000),
          UnitType.Farmland,
        ),
        territoryBound: true,
        constructionDuration: this.instantBuild() ? 0 : 2 * 10,
        upgradable: true,
        maxHealth: 500,
        canBuildTrainStation: true,
      };
    case UnitType.DeinNeuerTyp:  // ← Hier hinzufügen
      return {
        cost: this.costWrapper(
          (numUnits: number) =>
            Math.min(500_000, Math.pow(2, numUnits) * 75_000),
          UnitType.DeinNeuerTyp,
        ),
        territoryBound: true,
        constructionDuration: this.instantBuild() ? 0 : 2 * 10,
        upgradable: true,
        maxHealth: 500,
        canBuildTrainStation: false,  // Anpassen je nach Bedarf
      };
    default:
      assertNever(type);
  }
}
```

**Was macht diese Methode?**
- Definiert alle Eigenschaften eines UnitTypes (Kosten, Bauzeit, etc.)
- `cost`: Funktion, die die Kosten basierend auf Anzahl bereits gebauter Units berechnet
- `territoryBound`: Ob die Unit nur auf eigenem Territorium gebaut werden kann
- `constructionDuration`: Bauzeit in Ticks (10 Ticks = 1 Sekunde)
- `upgradable`: Ob die Unit aufgewertet werden kann
- `maxHealth`: Maximale Lebenspunkte
- `canBuildTrainStation`: Ob die Unit eine Zugstation bauen kann

**Was macht `costWrapper()`?**
- Wrapper-Funktion, die die Kostenberechnung vereinfacht
- Berücksichtigt bereits gebaute Units (Kosten steigen exponentiell)
- Gibt eine Funktion zurück, die die tatsächlichen Kosten berechnet

---

### Schritt 4: Execution-Klasse erstellen

**Datei:** `src/core/execution/DeinNeuerTypExecution.ts` (neue Datei erstellen)

Erstelle eine neue Execution-Klasse basierend auf `FarmlandExecution.ts`:

```typescript
import { Execution, Game, Gold, Player, Unit, UnitType } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { TrainStationExecution } from "./TrainStationExecution";

export class DeinNeuerTypExecution implements Execution {
  private unit: Unit | null = null;
  private active: boolean = true;
  private game: Game;
  // Weitere private Variablen je nach Bedarf

  constructor(
    private player: Player,
    private tile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.game = mg;
    // Initialisierung
  }

  tick(ticks: number): void {
    if (!this.unit) {
      // Unit noch nicht gebaut - baue sie
      const spawnTile = this.player.canBuild(UnitType.DeinNeuerTyp, this.tile);
      if (spawnTile === false) {
        console.warn("cannot build deinNeuerTyp");
        this.active = false;
        return;
      }
      this.unit = this.player.buildUnit(UnitType.DeinNeuerTyp, spawnTile, {});
      // Weitere Initialisierung nach dem Bauen
    }
    
    if (!this.unit.isActive()) {
      this.active = false;
      return;
    }

    if (this.player !== this.unit.owner()) {
      this.player = this.unit.owner();
    }

    // Hauptlogik hier - wird jeden Tick aufgerufen
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;  // Meist false für Gebäude
  }
}
```

**Was macht diese Klasse?**
- Implementiert das `Execution` Interface
- Verwaltet den Lebenszyklus der Unit (Bauen, Aktivität, Zerstörung)
- Enthält die Hauptlogik, die jeden Tick ausgeführt wird
- `tick()` wird kontinuierlich aufgerufen, solange `isActive()` true zurückgibt

**Wichtige Methoden:**
- `player.canBuild()`: Prüft, ob an dieser Position gebaut werden kann
- `player.buildUnit()`: Erstellt die tatsächliche Unit im Spiel
- `unit.isActive()`: Prüft, ob die Unit noch existiert (nicht zerstört)

---

### Schritt 5: ConstructionExecution erweitern

**Datei:** `src/core/execution/ConstructionExecution.ts`  
**Zeilen:** 102-146

Füge einen neuen `case` in der `completeConstruction()` Methode hinzu:

```typescript
private completeConstruction() {
  const player = this.player;
  switch (this.constructionType) {
    // ... bestehende cases
    case UnitType.Farmland:
      this.mg.addExecution(new FarmlandExecution(player, this.tile));
      break;
    case UnitType.DeinNeuerTyp:  // ← Hier hinzufügen
      this.mg.addExecution(new DeinNeuerTypExecution(player, this.tile));
      break;
    default:
      console.warn(
        `unit type ${this.constructionType} cannot be constructed`,
      );
      break;
  }
}
```

**Was macht ConstructionExecution?**
- Verwaltet den Bauprozess von Gebäuden
- Erstellt zunächst eine `Construction` Unit (Bauplatzhalter)
- Zählt die Bauzeit herunter
- Ruft nach Fertigstellung die entsprechende Execution-Klasse auf
- `completeConstruction()` wird aufgerufen, wenn die Bauzeit abgelaufen ist

**Ablauf:**
1. Spieler klickt auf Position → `ConstructionExecution` wird erstellt
2. `Construction` Unit wird gebaut (sichtbarer Bauplatzhalter)
3. Gold wird abgezogen
4. Bauzeit wird heruntergezählt
5. Nach Ablauf: `Construction` wird gelöscht, Gold zurückerstattet
6. Eigentliche Execution wird gestartet

---

### Schritt 6: UnitImpl erweitern

**Datei:** `src/core/game/UnitImpl.ts`  
**Zeilen:** 71-82

Füge den neuen Typ zum `switch` Statement hinzu:

```typescript
switch (this._type) {
  case UnitType.Warship:
  case UnitType.Port:
  case UnitType.MissileSilo:
  case UnitType.DefensePost:
  case UnitType.SAMLauncher:
  case UnitType.City:
  case UnitType.Factory:
  case UnitType.Farmland:
  case UnitType.DeinNeuerTyp:  // ← Hier hinzufügen
    this.mg.stats().unitBuild(_owner, this._type);
}
```

**Was macht UnitImpl?**
- Konkrete Implementierung des `Unit` Interface
- Verwaltet alle Daten einer Unit (Position, Besitzer, Typ, etc.)
- Dieser spezifische Code-Abschnitt registriert den Bau einer Unit in den Statistiken
- `stats().unitBuild()` wird aufgerufen, um zu tracken, dass eine Unit gebaut wurde

---

### Schritt 7: PlayerImpl Spawn-Logik erweitern

**Datei:** `src/core/game/PlayerImpl.ts`  
**Zeilen:** 980-993

Füge den neuen Typ zur `spawn()` Methode hinzu:

```typescript
switch (unitType) {
  // ... bestehende cases
  case UnitType.MissileSilo:
  case UnitType.DefensePost:
  case UnitType.SAMLauncher:
  case UnitType.City:
  case UnitType.Factory:
  case UnitType.Construction:
  case UnitType.Farmland:
  case UnitType.DeinNeuerTyp:  // ← Hier hinzufügen
    return this.landBasedStructureSpawn(targetTile, validTiles);
  default:
    assertNever(unitType);
}
```

**Was macht PlayerImpl?**
- Verwaltet alle Spieler-spezifischen Daten und Aktionen
- `spawn()` bestimmt, wo eine Unit gebaut werden kann
- `landBasedStructureSpawn()` findet eine gültige Position auf Land
- Prüft Territorium, Kollisionen, etc.

**Wichtig:** 
- Für Land-Gebäude: `landBasedStructureSpawn()`
- Für Wasser-Einheiten: `waterBasedUnitSpawn()`
- Für Raketen: `nukeSpawn()`

---

### Schritt 8: StatsSchemas erweitern

**Datei:** `src/core/StatsSchemas.ts`  
**Zeilen:** 30-61

Füge den neuen Typ zu den Arrays und Typen hinzu:

```typescript
export const otherUnits = [
  "city",
  "defp",
  "port",
  "wshp",
  "silo",
  "saml",
  "fact",
  "farm",
  "deinNeuerTyp",  // ← Hier hinzufügen (Kurzform, max 4 Zeichen)
] as const;

export type OtherUnitType =
  | UnitType.City
  | UnitType.DefensePost
  | UnitType.MissileSilo
  | UnitType.Port
  | UnitType.SAMLauncher
  | UnitType.Warship
  | UnitType.Factory
  | UnitType.Farmland
  | UnitType.DeinNeuerTyp;  // ← Hier hinzufügen

export const unitTypeToOtherUnit = {
  [UnitType.City]: "city",
  [UnitType.DefensePost]: "defp",
  [UnitType.MissileSilo]: "silo",
  [UnitType.Port]: "port",
  [UnitType.SAMLauncher]: "saml",
  [UnitType.Warship]: "wshp",
  [UnitType.Factory]: "fact",
  [UnitType.Farmland]: "farm",
  [UnitType.DeinNeuerTyp]: "deinNeuerTyp",  // ← Hier hinzufügen
} as const satisfies Record<OtherUnitType, OtherUnit>;
```

**Was macht StatsSchemas?**
- Definiert Schema für Statistiken (wie viele Units gebaut, zerstört, etc.)
- `otherUnits`: Array mit Kurzformen für Statistiken (max 4 Zeichen empfohlen)
- `unitTypeToOtherUnit`: Mapping von UnitType zu Kurzform
- Wird für die Speicherung und Übertragung von Statistiken verwendet

---

### Schritt 9: UnitDisplay Integration (Gebäudeleiste)

**Datei:** `src/client/graphics/layers/UnitDisplay.ts`

#### 9.1: Icon importieren

**Zeilen:** 1-13

```typescript
import deinNeuerTypIcon from "../../../../resources/images/DeinNeuerTypIconWhite.svg";
```

**Wichtig:** Das Icon muss im Ordner `resources/images/` vorhanden sein.

#### 9.2: Private Variable hinzufügen

**Zeilen:** 32-39

```typescript
private _cities = 0;
private _warships = 0;
private _factories = 0;
private _missileSilo = 0;
private _port = 0;
private _defensePost = 0;
private _samLauncher = 0;
private _farmland = 0;
private _deinNeuerTyp = 0;  // ← Hier hinzufügen
```

#### 9.3: allDisabled prüfung erweitern

**Zeilen:** 59-71

```typescript
this.allDisabled =
  config.isUnitDisabled(UnitType.City) &&
  config.isUnitDisabled(UnitType.Factory) &&
  config.isUnitDisabled(UnitType.Port) &&
  config.isUnitDisabled(UnitType.DefensePost) &&
  config.isUnitDisabled(UnitType.MissileSilo) &&
  config.isUnitDisabled(UnitType.SAMLauncher) &&
  config.isUnitDisabled(UnitType.Farmland) &&
  config.isUnitDisabled(UnitType.DeinNeuerTyp) &&  // ← Hier hinzufügen
  config.isUnitDisabled(UnitType.Warship) &&
  config.isUnitDisabled(UnitType.AtomBomb) &&
  config.isUnitDisabled(UnitType.HydrogenBomb) &&
  config.isUnitDisabled(UnitType.MIRV);
```

#### 9.4: tick() Methode erweitern

**Zeilen:** 104-119

```typescript
tick() {
  const player = this.game?.myPlayer();
  player?.actions().then((actions) => {
    this.playerActions = actions;
  });
  if (!player) return;
  this._cities = player.totalUnitLevels(UnitType.City);
  this._missileSilo = player.totalUnitLevels(UnitType.MissileSilo);
  this._port = player.totalUnitLevels(UnitType.Port);
  this._defensePost = player.totalUnitLevels(UnitType.DefensePost);
  this._samLauncher = player.totalUnitLevels(UnitType.SAMLauncher);
  this._factories = player.totalUnitLevels(UnitType.Factory);
  this._farmland = player.totalUnitLevels(UnitType.Farmland);
  this._deinNeuerTyp = player.totalUnitLevels(UnitType.DeinNeuerTyp);  // ← Hier hinzufügen
  this._warships = player.totalUnitLevels(UnitType.Warship);
  this.requestUpdate();
}
```

**Was macht `totalUnitLevels()`?**
- Gibt die Gesamtzahl der Levels aller Units dieses Typs zurück
- Berücksichtigt Upgrades (Level 2 = 2 Units)
- Wird für die Anzeige der Anzahl verwendet

#### 9.5: render() Methode erweitern

**Zeilen:** 183-189 (Gebäudeleiste) oder 194-221 (Raketenleiste)

Für Gebäude (erste Leiste):

```typescript
${this.renderUnitItem(
  farmlandIcon,
  this._farmland,
  UnitType.Farmland,
  "farmland",
  this.keybinds["buildFarmland"]?.key ?? "F",
)}
${this.renderUnitItem(
  deinNeuerTypIcon,  // ← Hier hinzufügen
  this._deinNeuerTyp,
  UnitType.DeinNeuerTyp,
  "dein_neuer_typ",  // Übersetzungsschlüssel
  this.keybinds["buildDeinNeuerTyp"]?.key ?? "X",  // Standard-Taste
)}
```

**Was macht `renderUnitItem()`?**
- Rendert ein einzelnes Element in der Gebäudeleiste
- Zeigt Icon, Anzahl, Hotkey
- Verwaltet Klick-Events (Ghost Structure Modus)
- Zeigt Tooltip beim Hover

**Parameter:**
1. `icon`: Pfad zum Icon
2. `number`: Anzahl der Units (oder `null` für Raketen)
3. `unitType`: Der UnitType
4. `structureKey`: Übersetzungsschlüssel (für Name und Beschreibung)
5. `hotkey`: Tastenkürzel

---

### Schritt 10: BuildMenu Integration

**Datei:** `src/client/graphics/layers/BuildMenu.ts`

#### 10.1: Icon importieren

**Zeilen:** 1-14

```typescript
import deinNeuerTypIcon from "../../../../resources/images/DeinNeuerTypIconWhite.svg";
```

#### 10.2: buildTable erweitern

**Zeilen:** 47-128

```typescript
export const buildTable: BuildItemDisplay[][] = [
  [
    // ... bestehende Einträge
    {
      unitType: UnitType.Farmland,
      icon: farmlandIcon,
      description: "build_menu.desc.farmland",
      key: "unit_type.farmland",
      countable: true,
    },
    {
      unitType: UnitType.DeinNeuerTyp,  // ← Hier hinzufügen
      icon: deinNeuerTypIcon,
      description: "build_menu.desc.dein_neuer_typ",
      key: "unit_type.dein_neuer_typ",
      countable: true,  // false für Raketen
    },
  ],
];
```

**Was macht buildTable?**
- Definiert alle Objekte, die im Build-Menü angezeigt werden
- Wird beim Rechtsklick oder Build-Event angezeigt
- `countable`: true = zeigt Anzahl an, false = keine Anzahl (z.B. Raketen)

**Was macht BuildMenu?**
- Zeigt ein Popup-Menü mit allen baubaren Objekten
- Wird durch `ShowBuildMenuEvent` ausgelöst
- Zeigt Kosten, Beschreibung, Anzahl
- Verwaltet Klick-Events zum Bauen

---

### Schritt 11: InputHandler Keybinds

**Datei:** `src/client/InputHandler.ts`

#### 11.1: Standard-Keybind hinzufügen

**Zeilen:** 190-217

```typescript
this.keybinds = {
  // ... bestehende Keybinds
  buildFarmland: "KeyF",
  buildDeinNeuerTyp: "KeyX",  // ← Hier hinzufügen (z.B. "KeyX" für X-Taste)
  ...saved,
};
```

**Was macht InputHandler?**
- Verwaltet alle Tastatur-Eingaben
- Speichert Keybinds im localStorage
- Reagiert auf Tastendrücke und löst Events aus

**Key-Codes:**
- `"KeyF"` = F-Taste
- `"Digit1"` = 1-Taste
- `"Space"` = Leertaste
- Siehe [MDN KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)

#### 11.2: Event-Handler hinzufügen

**Zeilen:** 395-404

```typescript
if (e.code === this.keybinds.buildSamLauncher) {
  e.preventDefault();
  this.setGhostStructure(UnitType.SAMLauncher);
}

if (e.code === this.keybinds.buildFarmland) {
  e.preventDefault();
  this.setGhostStructure(UnitType.Farmland);
}

if (e.code === this.keybinds.buildDeinNeuerTyp) {  // ← Hier hinzufügen
  e.preventDefault();
  this.setGhostStructure(UnitType.DeinNeuerTyp);
}
```

**Was macht `setGhostStructure()`?**
- Aktiviert den "Ghost Structure" Modus
- Zeigt eine Vorschau der Unit beim Bewegen der Maus
- Ermöglicht Platzierung durch Klick
- Wird durch `GhostStructureChangedEvent` kommuniziert

---

### Schritt 12: Grafische Darstellung

#### 12.1: StructureDrawingUtils

**Datei:** `src/client/graphics/layers/StructureDrawingUtils.ts`

**Zeilen:** 10 (Icon importieren)

```typescript
import deinNeuerTypIcon from "../../../../resources/images/FarmlandUnit.png";
```

**Zeilen:** 15-27 (Shape definieren)

```typescript
export const STRUCTURE_SHAPES: Partial<Record<UnitType, ShapeType>> = {
  // ... bestehende Shapes
  [UnitType.Farmland]: "circle",
  [UnitType.DeinNeuerTyp]: "circle",  // ← Hier hinzufügen (circle, square, triangle, etc.)
};
```

**Zeilen:** 58-69 (Icon-Mapping)

```typescript
private readonly structuresInfos: Map<
  UnitType,
  { iconPath: string; image: HTMLImageElement | null }
> = new Map([
  // ... bestehende Einträge
  [UnitType.Farmland, { iconPath: farmlandIcon, image: null }],
  [UnitType.DeinNeuerTyp, { iconPath: deinNeuerTypIcon, image: null }],  // ← Hier hinzufügen
]);
```

**Was macht StructureDrawingUtils?**
- Verwaltet die grafische Darstellung von Strukturen auf der Karte
- `STRUCTURE_SHAPES`: Definiert die Form (Kreis, Quadrat, etc.)
- `structuresInfos`: Mapping von UnitType zu Icon-Pfad
- Wird für die minimap und Kartenansicht verwendet

#### 12.2: StructureLayer

**Datei:** `src/client/graphics/layers/StructureLayer.ts`

**Zeilen:** 1-12 (Icon importieren)

```typescript
import deinNeuerTypIcon from "../../../../resources/images/buildings/deinNeuerTypAlt1.png";
```

**Zeilen:** 27-78 (Render-Config)

```typescript
const UNIT_RENDER_CONFIG: Record<UnitType, UnitRenderConfig> = {
  // ... bestehende Configs
  [UnitType.Farmland]: {
    icon: factoryIcon,
    borderRadius: BASE_BORDER_RADIUS * RADIUS_SCALE_FACTOR,
    territoryRadius: BASE_TERRITORY_RADIUS * RADIUS_SCALE_FACTOR,
  },
  [UnitType.DeinNeuerTyp]: {  // ← Hier hinzufügen
    icon: deinNeuerTypIcon,
    borderRadius: BASE_BORDER_RADIUS * RADIUS_SCALE_FACTOR,
    territoryRadius: BASE_TERRITORY_RADIUS * RADIUS_SCALE_FACTOR,
  },
};
```

**Was macht StructureLayer?**
- Rendert alle Gebäude auf der Karte
- Zeigt Icons, Territorium-Radius, Border
- Verwaltet die visuelle Darstellung während des Spiels

#### 12.3: StructureIconsLayer

**Datei:** `src/client/graphics/layers/StructureIconsLayer.ts`

**Zeilen:** 80-87

```typescript
private readonly structureVisibility = new Map<UnitType, { visible: boolean }>([
  [UnitType.City, { visible: true }],
  [UnitType.Factory, { visible: true }],
  [UnitType.DefensePost, { visible: true }],
  [UnitType.Port, { visible: true }],
  [UnitType.MissileSilo, { visible: true }],
  [UnitType.SAMLauncher, { visible: true }],
  [UnitType.Farmland, { visible: true }],
  [UnitType.DeinNeuerTyp, { visible: true }],  // ← Hier hinzufügen
]);
```

**Was macht StructureIconsLayer?**
- Verwaltet die Sichtbarkeit von Struktur-Icons
- Kann Icons ein-/ausblenden
- Wird für die minimap verwendet

---

### Schritt 13: Sprachdateien

**Dateien:** `resources/lang/en.json` und `resources/lang/de.json`

#### 13.1: unit_type Übersetzung

**Zeilen:** ~280-320 (en.json)

```json
"unit_type": {
  "city": "City",
  "factory": "Factory",
  "port": "Port",
  "defense_post": "Defense Post",
  "missile_silo": "Missile Silo",
  "sam_launcher": "SAM Launcher",
  "warship": "Warship",
  "atom_bomb": "Atom Bomb",
  "hydrogen_bomb": "Hydrogen Bomb",
  "mirv": "MIRV",
  "farmland": "Farmland",
  "dein_neuer_typ": "Dein Neuer Typ"  // ← Hier hinzufügen
}
```

#### 13.2: build_menu.desc Übersetzung

**Zeilen:** ~500-510 (en.json)

```json
"build_menu": {
  "desc": {
    "city": "Increases max population",
    "factory": "Creates railroads and spawns trains",
    "farmland": "Gives you 25k gold each 10 seconds",
    "dein_neuer_typ": "Beschreibung deines neuen Objekts"  // ← Hier hinzufügen
  }
}
```

**Wichtig:** Füge die Übersetzungen in **beiden** Dateien hinzu (en.json und de.json)!

**Was machen die Sprachdateien?**
- Enthalten alle Text-Übersetzungen
- Werden durch `translateText()` Funktion geladen
- Unterstützen mehrere Sprachen (en, de, etc.)

---

### Schritt 14: Weitere Integrationen (Optional)

#### 14.1: RadialMenuElements

**Datei:** `src/client/graphics/layers/RadialMenuElements.ts`

**Zeilen:** ~334

```typescript
addStructureIfEnabled(UnitType.Farmland);
addStructureIfEnabled(UnitType.DeinNeuerTyp);  // ← Hier hinzufügen
```

**Was macht RadialMenuElements?**
- Verwaltet das Radial-Menü (Kontextmenü)
- Zeigt verfügbare Aktionen für Strukturen

#### 14.2: CityExecution (wenn relevant)

**Datei:** `src/core/execution/CityExecution.ts`

Wenn dein neues Objekt von Cities beeinflusst wird oder Cities beeinflusst, hier anpassen.

#### 14.3: TrainStation (wenn relevant)

**Datei:** `src/core/game/TrainStation.ts`

Wenn dein Objekt Zugstationen unterstützt, hier einen Handler hinzufügen.

---

## Detaillierte Erklärungen

### Wichtige Klassen und Interfaces

#### Execution Interface

```typescript
export interface Execution {
  init(mg: Game, ticks: number): void;
  tick(ticks: number): void;
  isActive(): boolean;
  activeDuringSpawnPhase(): boolean;
}
```

**Zweck:** Basis-Interface für alle Game-Logik-Objekte

**Methoden:**
- `init()`: Einmalige Initialisierung beim Start
- `tick()`: Wird jeden Game-Tick aufgerufen (60x pro Sekunde)
- `isActive()`: Gibt zurück, ob die Execution noch aktiv ist
- `activeDuringSpawnPhase()`: Ob die Execution während Spawn-Phase läuft

**Verwendung:** Jedes Objekt im Spiel (Gebäude, Rakete, etc.) hat eine Execution-Klasse.

---

#### Game Interface

```typescript
export interface Game {
  config(): Config;
  unitInfo(type: UnitType): UnitInfo;
  nearbyUnits(tile: TileRef, range: number, types: UnitType[]): NearbyUnit[];
  railNetwork(): RailNetwork;
  // ... viele weitere Methoden
}
```

**Zweck:** Zentrale Schnittstelle zum Spielzustand

**Wichtige Methoden:**
- `config()`: Zugriff auf Konfiguration
- `unitInfo()`: Informationen über Unit-Typen
- `nearbyUnits()`: Findet Units in der Nähe
- `railNetwork()`: Zugriff auf das Schienennetz

---

#### Player Interface

```typescript
export interface Player {
  canBuild(type: UnitType, tile: TileRef): TileRef | false;
  buildUnit(type: UnitType, tile: TileRef, params: UnitParams): Unit;
  units(type: UnitType): Unit[];
  totalUnitLevels(type: UnitType): number;
  gold(): Gold;
  addGold(amount: Gold, tile: TileRef): void;
  removeGold(amount: Gold): void;
  // ... viele weitere Methoden
}
```

**Zweck:** Repräsentiert einen Spieler im Spiel

**Wichtige Methoden:**
- `canBuild()`: Prüft, ob an Position gebaut werden kann
- `buildUnit()`: Erstellt eine neue Unit
- `units()`: Gibt alle Units eines Typs zurück
- `totalUnitLevels()`: Gesamtzahl der Levels (berücksichtigt Upgrades)
- `gold()`: Aktuelles Gold
- `addGold()` / `removeGold()`: Gold verwalten

---

#### Unit Interface

```typescript
export interface Unit {
  id(): number;
  type(): UnitType;
  owner(): Player;
  tile(): TileRef;
  isActive(): boolean;
  level(): number;
  increaseLevel(): void;
  hasTrainStation(): boolean;
  setTrainStation(trainStation: boolean): void;
  // ... viele weitere Methoden
}
```

**Zweck:** Repräsentiert eine einzelne Einheit im Spiel

**Wichtige Methoden:**
- `id()`: Eindeutige ID
- `type()`: UnitType
- `owner()`: Besitzer
- `tile()`: Position
- `isActive()`: Ob die Unit noch existiert
- `level()`: Aktuelles Level (für Upgrades)
- `hasTrainStation()`: Ob Zugstation vorhanden

---

#### GameView Interface

```typescript
export interface GameView {
  myPlayer(): PlayerView | null;
  config(): Config;
  isValidCoord(x: number, y: number): boolean;
  ref(x: number, y: number): TileRef;
  // ... viele weitere Methoden
}
```

**Zweck:** Client-seitige Ansicht des Spiels

**Unterschied zu Game:**
- `Game`: Server-seitig, voller Zugriff
- `GameView`: Client-seitig, eingeschränkter Zugriff (nur sichtbare Daten)

---

#### EventBus

```typescript
export class EventBus {
  on<T>(event: GameEvent, handler: (event: T) => void): void;
  emit(event: GameEvent): void;
  off<T>(event: GameEvent, handler: (event: T) => void): void;
}
```

**Zweck:** Event-System für Kommunikation zwischen Komponenten

**Verwendung:**
- Komponenten können Events senden (`emit`)
- Komponenten können auf Events hören (`on`)
- Ermöglicht lose Kopplung zwischen Komponenten

**Beispiele:**
- `GhostStructureChangedEvent`: Ghost Structure Modus geändert
- `ShowBuildMenuEvent`: Build-Menü anzeigen
- `ToggleStructureEvent`: Struktur-Highlighting ein/aus

---

#### UIState

```typescript
export interface UIState {
  attackRatio: number;
  ghostStructure: UnitType | null;
}
```

**Zweck:** Verwaltet UI-Zustand

**Eigenschaften:**
- `attackRatio`: Angriffs-Verhältnis
- `ghostStructure`: Aktuell ausgewählte Unit für Platzierung (null = keine)

---

### Datenfluss

#### Bauprozess (Client → Server)

```
1. Spieler klickt auf UnitDisplay-Element
   ↓
2. UnitDisplay emittiert GhostStructureChangedEvent
   ↓
3. InputHandler reagiert auf Klick
   ↓
4. ClientGameRunner sendet BuildUnitIntentEvent
   ↓
5. Server empfängt Intent
   ↓
6. Server erstellt ConstructionExecution
   ↓
7. ConstructionExecution zählt Bauzeit herunter
   ↓
8. Nach Ablauf: Eigentliche Execution wird gestartet
```

#### Game Loop

```
1. Game.tick() wird aufgerufen (60x pro Sekunde)
   ↓
2. Für jede aktive Execution:
   - execution.tick(currentTick) aufrufen
   ↓
3. Execution führt Logik aus:
   - Gold generieren (Farmland)
   - Einheiten bewegen
   - etc.
   ↓
4. Updates werden an Client gesendet
   ↓
5. Client rendert neue Zustände
```

---

## Referenz-Tabellen

### Alle betroffenen Dateien

| Datei | Zeilen | Zweck |
|-------|--------|-------|
| `src/core/game/Game.ts` | 181-200 | UnitType Enum Definition |
| `src/core/game/Game.ts` | 207-216 | Structure Types Set |
| `src/core/game/Game.ts` | 230-279 | UnitParamsMap Interface |
| `src/core/configuration/DefaultConfig.ts` | 454-599 | UnitInfo Konfiguration |
| `src/core/execution/[Name]Execution.ts` | Ganz | Execution-Klasse (neu erstellen) |
| `src/core/execution/ConstructionExecution.ts` | 102-146 | Construction Completion |
| `src/core/game/UnitImpl.ts` | 71-82 | Stats Registration |
| `src/core/game/PlayerImpl.ts` | 980-993 | Spawn-Logik |
| `src/core/StatsSchemas.ts` | 30-61 | Statistiken Schema |
| `src/client/graphics/layers/UnitDisplay.ts` | 1-328 | Gebäudeleiste UI |
| `src/client/graphics/layers/BuildMenu.ts` | 47-128 | Build-Menü |
| `src/client/InputHandler.ts` | 190-217 | Keybind Definition |
| `src/client/InputHandler.ts` | 395-404 | Keybind Handler |
| `src/client/graphics/layers/StructureDrawingUtils.ts` | 15-69 | Minimap Icons |
| `src/client/graphics/layers/StructureLayer.ts` | 27-78 | Karten-Rendering |
| `src/client/graphics/layers/StructureIconsLayer.ts` | 80-87 | Icon Sichtbarkeit |
| `resources/lang/en.json` | ~280-320 | Englische Übersetzungen |
| `resources/lang/de.json` | ~280-320 | Deutsche Übersetzungen |

---

### Funktionen-Übersicht

| Funktion/Klasse | Datei | Zweck |
|----------------|-------|-------|
| `UnitType` (Enum) | `Game.ts` | Definiert alle Unit-Typen |
| `Execution` (Interface) | `Game.ts` | Basis für Game-Logik |
| `Unit` (Interface) | `Game.ts` | Repräsentiert eine Einheit |
| `Player` (Interface) | `Game.ts` | Repräsentiert einen Spieler |
| `Game` (Interface) | `Game.ts` | Zentrale Spiel-Schnittstelle |
| `unitInfo()` | `DefaultConfig.ts` | Unit-Eigenschaften |
| `costWrapper()` | `DefaultConfig.ts` | Kostenberechnung |
| `canBuild()` | `PlayerImpl.ts` | Prüft Bau-Möglichkeit |
| `buildUnit()` | `PlayerImpl.ts` | Erstellt Unit |
| `totalUnitLevels()` | `PlayerImpl.ts` | Anzahl der Units |
| `tick()` | `[Name]Execution.ts` | Hauptlogik (jeden Tick) |
| `init()` | `[Name]Execution.ts` | Initialisierung |
| `isActive()` | `[Name]Execution.ts` | Aktivitäts-Status |
| `renderUnitItem()` | `UnitDisplay.ts` | Rendert Leisten-Element |
| `setGhostStructure()` | `InputHandler.ts` | Aktiviert Platzierungs-Modus |
| `translateText()` | `Utils.ts` | Lädt Übersetzung |

---

### Abhängigkeiten

```
UnitType Enum
    ↓
UnitInfo (DefaultConfig)
    ↓
Execution-Klasse
    ↓
ConstructionExecution (verwendet Execution)
    ↓
UnitImpl (registriert Stats)
    ↓
PlayerImpl (Spawn-Logik)
    ↓
StatsSchemas (Statistiken)
    ↓
UnitDisplay (UI)
    ↓
BuildMenu (UI)
    ↓
InputHandler (Steuerung)
    ↓
Grafische Darstellung (Icons, Layer)
    ↓
Sprachdateien (Übersetzungen)
```

---

### Checkliste

- [ ] UnitType Enum hinzugefügt
- [ ] Structure Types Set erweitert
- [ ] UnitParamsMap erweitert
- [ ] UnitInfo in DefaultConfig hinzugefügt
- [ ] Execution-Klasse erstellt
- [ ] ConstructionExecution erweitert
- [ ] UnitImpl erweitert
- [ ] PlayerImpl erweitert
- [ ] StatsSchemas erweitert
- [ ] UnitDisplay: Icon importiert
- [ ] UnitDisplay: Variable hinzugefügt
- [ ] UnitDisplay: allDisabled erweitert
- [ ] UnitDisplay: tick() erweitert
- [ ] UnitDisplay: render() erweitert
- [ ] BuildMenu: Icon importiert
- [ ] BuildMenu: buildTable erweitert
- [ ] InputHandler: Keybind hinzugefügt
- [ ] InputHandler: Handler hinzugefügt
- [ ] StructureDrawingUtils erweitert
- [ ] StructureLayer erweitert
- [ ] StructureIconsLayer erweitert
- [ ] Sprachdateien erweitert (en.json)
- [ ] Sprachdateien erweitert (de.json)
- [ ] Icons erstellt (White.svg für UI, Unit.png für Karte)
- [ ] Getestet: Bauen funktioniert
- [ ] Getestet: Anzeige in Leiste funktioniert
- [ ] Getestet: Keybind funktioniert
- [ ] Getestet: Übersetzungen funktionieren

---

## Tipps und Warnungen

### Tipps

1. **Icons erstellen:**
   - Für UI: `[Name]IconWhite.svg` (weißes Icon für dunklen Hintergrund)
   - Für Karte: `[Name]Unit.png` (farbiges Icon)
   - Für Gebäude: `buildings/[name]Alt1.png`

2. **Kostenberechnung:**
   - Exponentielles Wachstum: `Math.pow(2, numUnits) * baseCost`
   - Lineares Wachstum: `(numUnits + 1) * baseCost`
   - Maximum setzen: `Math.min(maxCost, calculatedCost)`

3. **Bauzeit:**
   - `2 * 10` = 2 Sekunden (10 Ticks = 1 Sekunde)
   - `instantBuild()` prüft, ob Instant-Build aktiviert ist

4. **Territorium:**
   - `territoryBound: true` = nur auf eigenem Territorium
   - `territoryBound: false` = überall (z.B. Raketen)

5. **Upgrades:**
   - `upgradable: true` ermöglicht Level-Erhöhung
   - Level wird in `totalUnitLevels()` berücksichtigt

### Warnungen

1. **Vergiss nicht:**
   - Alle Dateien müssen konsistent sein
   - Übersetzungen in **allen** Sprachdateien
   - Icons müssen existieren (sonst Fehler)

2. **Typ-Sicherheit:**
   - TypeScript wird Fehler zeigen, wenn etwas fehlt
   - `assertNever()` hilft, alle Cases abzudecken

3. **Performance:**
   - `tick()` wird sehr oft aufgerufen
   - Schwere Berechnungen vermeiden
   - Caching verwenden wo möglich

4. **Spawn-Logik:**
   - Richtige Methode wählen:
     - `landBasedStructureSpawn()` für Land-Gebäude
     - `waterBasedUnitSpawn()` für Wasser-Einheiten
     - `nukeSpawn()` für Raketen

---

## Beispiel: Farmland-Implementierung

Als Referenz hier die vollständige Farmland-Implementierung:

### FarmlandExecution.ts

```typescript
export class FarmlandExecution implements Execution {
  private farmland: Unit | null = null;
  private active: boolean = true;
  private game: Game;
  private ticksUntilGold: number = 0;
  private lastGoldGeneration: number = 0;

  constructor(
    private player: Player,
    private tile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.game = mg;
    this.setNextGoldInterval();
    this.lastGoldGeneration = ticks;
  }

  private setNextGoldInterval(): void {
    if (!this.game) return;
    const min = this.game.config().farmlandGoldIntervalMin();
    const max = this.game.config().farmlandGoldIntervalMax();
    this.ticksUntilGold = Math.floor(Math.random() * (max - min + 1)) + min;
  }

  tick(ticks: number): void {
    // Bauen der Unit beim ersten Tick
    if (!this.farmland) {
      const spawnTile = this.player.canBuild(UnitType.Farmland, this.tile);
      if (spawnTile === false) {
        console.warn("cannot build farmland");
        this.active = false;
        return;
      }
      this.farmland = this.player.buildUnit(UnitType.Farmland, spawnTile, {});
      this.createStation();
      this.setNextGoldInterval();
      this.lastGoldGeneration = ticks;
    }
    
    // Prüfen ob Unit noch existiert
    if (!this.farmland.isActive()) {
      this.active = false;
      return;
    }

    // Besitzer-Update (falls erobert)
    if (this.player !== this.farmland.owner()) {
      this.player = this.farmland.owner();
    }

    // Gold-Generierung
    if (!this.game) return;
    const ticksSinceLastGold = ticks - this.lastGoldGeneration;
    if (ticksSinceLastGold >= this.ticksUntilGold) {
      let goldAmount = this.game.config().farmlandGoldAmount();
      
      // Level-Multiplikator
      const level = this.farmland.level();
      goldAmount = goldAmount * BigInt(level);
      
      // Rail-Boost (50%)
      const hasStation = this.farmland.hasTrainStation() || 
                         this.game.railNetwork().findStation(this.farmland) !== null;
      if (hasStation) {
        goldAmount = (goldAmount * 15n) / 10n;
      }
      
      if (goldAmount > 0n) {
        this.player.addGold(goldAmount, this.farmland.tile());
      }
      this.lastGoldGeneration = ticks;
      this.setNextGoldInterval();
    }
  }

  createStation(): void {
    if (this.farmland !== null) {
      const nearbyFactories = this.game.nearbyUnits(
        this.farmland.tile()!,
        this.game.config().trainStationMaxRange(),
        [UnitType.Factory],
      );

      if (nearbyFactories.length > 0) {
        this.game.addExecution(new TrainStationExecution(this.farmland, false));
      }
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
```

**Wichtige Punkte:**
- Gold wird in zufälligen Intervallen generiert
- Level wird berücksichtigt (mehr Level = mehr Gold)
- Rail-Verbindung gibt 50% Boost
- Station wird nur erstellt, wenn Factory in der Nähe

---

## Zusammenfassung

Um ein neues Objekt hinzuzufügen, musst du:

1. **Core-Logik:** UnitType, UnitInfo, Execution, Construction, UnitImpl, PlayerImpl, Stats
2. **UI:** UnitDisplay, BuildMenu, InputHandler
3. **Grafik:** Icons, StructureLayer, StructureDrawingUtils
4. **Übersetzungen:** Sprachdateien

Jeder Schritt ist wichtig und muss konsistent sein. Folge der Checkliste und teste jeden Schritt!

---

**Viel Erfolg beim Implementieren!** 🚀

