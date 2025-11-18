# BackWars - Vollständige Code-Dokumentation

Diese Dokumentation erklärt das gesamte BackWars-Projekt, seine Architektur, alle wichtigen Dateien, Klassen und Methoden.

---

## Inhaltsverzeichnis

1. [System-Übersicht](#system-übersicht)
2. [Core-Modul](#core-modul)
3. [Client-Modul](#client-modul)
4. [Server-Modul](#server-modul)
5. [Hilfs-Module](#hilfs-module)
6. [Zusammenfassung](#zusammenfassung)

---

## System-Übersicht

### Architektur

BackWars ist ein Multiplayer-Strategiespiel mit einer Client-Server-Architektur:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  UI Layer (Lit Elements, HTML/CSS)                   │   │
│  │  - Modals, Buttons, Menüs                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Rendering Layer (Canvas, PIXI.js)                   │   │
│  │  - GameRenderer, Layers, Sprites                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Game Logic Layer (ClientGameRunner)                 │   │
│  │  - Input Handling, Event Bus, Transport              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Worker Layer (Web Worker)                           │   │
│  │  - Game Updates verarbeiten                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Node.js)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Master Process                                      │   │
│  │  - Lobby Management, Load Balancing                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Worker Processes (Cluster)                          │   │
│  │  - GameManager, GameServer, WebSocket                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Core Game Logic (Shared)                            │   │
│  │  - Game, Unit, Player, Execution                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Hauptkomponenten

1. **Core-Modul** (`src/core/`): Geteilte Spiel-Logik (Client & Server)
   - Game-Kern (Game, GameImpl)
   - Unit-System (Unit, UnitImpl)
   - Player-System (Player, PlayerImpl)
   - Execution-System (alle Execution-Klassen)
   - Konfiguration, Pathfinding, Rail-Netzwerk, Statistiken

2. **Client-Modul** (`src/client/`): Browser-Client
   - UI-Komponenten (Modals, Buttons)
   - Rendering (GameRenderer, Layers)
   - Input-Handling (InputHandler)
   - Kommunikation (Transport, WebSocket)

3. **Server-Modul** (`src/server/`): Node.js-Server
   - Master-Prozess (Lobby-Management)
   - Worker-Prozesse (Spiel-Instanzen)
   - GameManager (Spiel-Verwaltung)
   - WebSocket-Kommunikation

### Datenfluss

#### Spiel-Start

```
1. Client: Main.ts initialisiert
   ↓
2. Client: Lobby beitreten (Public/Private/Singleplayer)
   ↓
3. Server: GameManager erstellt GameServer
   ↓
4. Server: GameRunner wird erstellt (createGameRunner)
   ↓
5. Server: Game wird initialisiert (createGame)
   ↓
6. Server: Spieler werden gespawnt
   ↓
7. Server: Game Loop startet
```

#### Game Loop

```
1. Client sendet Intent (z.B. Attack, Build)
   ↓
2. Server empfängt Intent über WebSocket
   ↓
3. Server: Executor erstellt Execution aus Intent
   ↓
4. Server: GameRunner.executeNextTick()
   ↓
5. Server: GameImpl.executeNextTick()
   ↓
6. Server: Alle aktiven Executions werden getickt
   ↓
7. Server: Game Updates werden erstellt
   ↓
8. Server: Updates werden an Client gesendet
   ↓
9. Client: Worker verarbeitet Updates
   ↓
10. Client: GameView wird aktualisiert
   ↓
11. Client: GameRenderer rendert neue Zustände
```

### Execution-System

Das Herzstück der Game-Logik ist das Execution-System:

- **Execution Interface**: Basis für alle Game-Logik-Objekte
- **ExecutionManager (Executor)**: Erstellt Executions aus Intents
- **GameImpl**: Verwaltet alle Executions und ruft `tick()` auf
- **GameRunner**: Koordiniert Turns und ruft Game-Loop auf

Jede Aktion im Spiel (Angriff, Bauen, etc.) wird als Execution implementiert.

---

## Core-Modul

### Game-Kern

#### `src/core/game/Game.ts`

**Zweck:** Definiert alle Interfaces, Enums und Typen für das Spiel.

**Wichtige Interfaces:**

##### `Game` Interface

```typescript
export interface Game {
  config(): Config;
  ticks(): number;
  executeNextTick(): GameUpdates;
  addExecution(...executions: Execution[]): void;
  player(id: PlayerID): Player;
  players(): Player[];
  // ... viele weitere Methoden
}
```

**Zweck:** Zentrale Schnittstelle zum Spielzustand.

**Wichtige Methoden:**
- `config()`: Zugriff auf Konfiguration
- `ticks()`: Aktueller Tick-Zähler
- `executeNextTick()`: Führt einen Game-Tick aus
- `addExecution()`: Fügt neue Executions hinzu
- `player()`: Gibt Spieler nach ID zurück
- `players()`: Gibt alle Spieler zurück

##### `Execution` Interface

```typescript
export interface Execution {
  init(mg: Game, ticks: number): void;
  tick(ticks: number): void;
  isActive(): boolean;
  activeDuringSpawnPhase(): boolean;
}
```

**Zweck:** Basis-Interface für alle Game-Logik-Objekte.

**Methoden:**
- `init()`: Einmalige Initialisierung beim Start
- `tick()`: Wird jeden Game-Tick aufgerufen (60x pro Sekunde)
- `isActive()`: Gibt zurück, ob die Execution noch aktiv ist
- `activeDuringSpawnPhase()`: Ob die Execution während Spawn-Phase läuft

##### `Unit` Interface

```typescript
export interface Unit {
  id(): number;
  type(): UnitType;
  owner(): Player;
  tile(): TileRef;
  isActive(): boolean;
  level(): number;
  health(): number;
  // ... viele weitere Methoden
}
```

**Zweck:** Repräsentiert eine einzelne Einheit im Spiel (Gebäude, Rakete, etc.).

**Wichtige Methoden:**
- `id()`: Eindeutige ID
- `type()`: UnitType (City, Factory, etc.)
- `owner()`: Besitzer (Player)
- `tile()`: Position auf der Karte
- `isActive()`: Ob die Unit noch existiert
- `level()`: Aktuelles Level (für Upgrades)

##### `Player` Interface

```typescript
export interface Player {
  id(): PlayerID;
  gold(): Gold;
  troops(): number;
  canBuild(type: UnitType, tile: TileRef): TileRef | false;
  buildUnit(type: UnitType, tile: TileRef, params: UnitParams): Unit;
  units(type: UnitType): Unit[];
  canAttack(tile: TileRef): boolean;
  // ... viele weitere Methoden
}
```

**Zweck:** Repräsentiert einen Spieler im Spiel.

**Wichtige Methoden:**
- `id()`: Eindeutige Spieler-ID
- `gold()`: Aktuelles Gold
- `troops()`: Anzahl der Truppen
- `canBuild()`: Prüft, ob an Position gebaut werden kann
- `buildUnit()`: Erstellt eine neue Unit
- `units()`: Gibt alle Units eines Typs zurück
- `canAttack()`: Prüft, ob angegriffen werden kann

**Wichtige Enums:**

##### `UnitType` Enum

```typescript
export enum UnitType {
  TransportShip = "Transport",
  Warship = "Warship",
  City = "City",
  Factory = "Factory",
  Farmland = "Farmland",
  // ... weitere Typen
}
```

**Zweck:** Definiert alle verfügbaren Unit-Typen im Spiel.

##### `PlayerType` Enum

```typescript
export enum PlayerType {
  Human = "Human",
  Bot = "Bot",
  FakeHuman = "FakeHuman",
}
```

**Zweck:** Definiert die verschiedenen Spieler-Typen.

#### `src/core/game/GameImpl.ts`

**Zweck:** Konkrete Implementierung des `Game` Interface.

**Klasse:** `GameImpl`

**Wichtige Eigenschaften:**

```typescript
export class GameImpl implements Game {
  private _ticks = 0;                    // Tick-Zähler
  private execs: Execution[] = [];        // Aktive Executions
  private unInitExecs: Execution[] = []; // Noch nicht initialisierte Executions
  private _players: Map<PlayerID, PlayerImpl>; // Alle Spieler
  private unitGrid: UnitGrid;            // Grid für schnelle Unit-Suche
  private _railNetwork: RailNetwork;      // Schienennetzwerk
  private updates: GameUpdates;           // Game Updates für diesen Tick
  // ... weitere Eigenschaften
}
```

**Wichtige Methoden:**

##### `executeNextTick(): GameUpdates`

**Zweck:** Führt einen Game-Tick aus.

**Ablauf:**
1. Erstellt neue GameUpdates-Map
2. Ruft `tick()` für alle aktiven Executions auf
3. Initialisiert neue Executions (ruft `init()` auf)
4. Entfernt inaktive Executions
5. Erstellt Player-Updates
6. Erstellt Hash-Update (alle 10 Ticks)
7. Erhöht Tick-Zähler
8. Gibt Updates zurück

**Code:**
```typescript
executeNextTick(): GameUpdates {
  this.updates = createGameUpdatesMap();
  
  // Tick alle aktiven Executions
  this.execs.forEach((e) => {
    if ((!this.inSpawnPhase() || e.activeDuringSpawnPhase()) && e.isActive()) {
      e.tick(this._ticks);
    }
  });
  
  // Initialisiere neue Executions
  const inited: Execution[] = [];
  const unInited: Execution[] = [];
  this.unInitExecs.forEach((e) => {
    if (!this.inSpawnPhase() || e.activeDuringSpawnPhase()) {
      e.init(this, this._ticks);
      inited.push(e);
    } else {
      unInited.push(e);
    }
  });
  
  this.removeInactiveExecutions();
  this.execs.push(...inited);
  this.unInitExecs = unInited;
  
  // Player Updates
  for (const player of this._players.values()) {
    this.addUpdate(player.toUpdate());
  }
  
  // Hash Update (alle 10 Ticks)
  if (this.ticks() % 10 === 0) {
    this.addUpdate({
      type: GameUpdateType.Hash,
      tick: this.ticks(),
      hash: this.hash(),
    });
  }
  
  this._ticks++;
  return this.updates;
}
```

##### `addExecution(...executions: Execution[]): void`

**Zweck:** Fügt neue Executions hinzu.

**Verhalten:**
- Fügt Executions zu `unInitExecs` hinzu
- Werden beim nächsten Tick initialisiert

##### `createGame()`

**Zweck:** Factory-Funktion zum Erstellen eines neuen Spiels.

**Parameter:**
- `humans`: Liste der menschlichen Spieler
- `nations`: Liste der NPC-Nationen
- `gameMap`: Haupt-Karte
- `miniGameMap`: Mini-Karte
- `config`: Konfiguration

**Rückgabewert:** `Game` Instanz

### Unit-System

#### `src/core/game/UnitImpl.ts`

**Zweck:** Konkrete Implementierung des `Unit` Interface.

**Klasse:** `UnitImpl`

**Wichtige Eigenschaften:**

```typescript
export class UnitImpl implements Unit {
  private _type: UnitType;           // Typ der Unit
  private _tile: TileRef;            // Position
  private _owner: PlayerImpl;        // Besitzer
  private _id: number;               // Eindeutige ID
  private _active = true;            // Aktivitäts-Status
  private _health: bigint;           // Lebenspunkte
  private _level: number = 1;        // Level (für Upgrades)
  private _hasTrainStation: boolean; // Zugstation vorhanden?
  // ... weitere Eigenschaften
}
```

**Wichtige Methoden:**

##### `constructor()`

**Zweck:** Erstellt eine neue Unit.

**Parameter:**
- `_type`: UnitType
- `mg`: Game-Instanz
- `_tile`: Start-Position
- `_id`: Eindeutige ID
- `_owner`: Besitzer
- `params`: Zusätzliche Parameter

**Verhalten:**
- Initialisiert alle Eigenschaften
- Registriert Unit in UnitGrid
- Registriert Stats (wenn relevant)

##### `delete(displayMessage?: boolean, destroyer?: Player): void`

**Zweck:** Löscht die Unit.

**Parameter:**
- `displayMessage`: Ob eine Nachricht angezeigt werden soll
- `destroyer`: Spieler, der die Unit zerstört hat

**Verhalten:**
- Markiert Unit als inaktiv
- Entfernt aus UnitGrid
- Erstellt Delete-Update
- Registriert Stats

##### `move(tile: TileRef): void`

**Zweck:** Bewegt die Unit zu einer neuen Position.

**Parameter:**
- `tile`: Neue Position

**Verhalten:**
- Aktualisiert Position
- Aktualisiert UnitGrid
- Erstellt Move-Update

### Player-System

#### `src/core/game/PlayerImpl.ts`

**Zweck:** Konkrete Implementierung des `Player` Interface.

**Klasse:** `PlayerImpl`

**Wichtige Eigenschaften:**

```typescript
export class PlayerImpl implements Player {
  private _id: PlayerID;              // Eindeutige ID
  private _gold: Gold = 0n;           // Gold
  private _troops: number = 0;        // Truppen
  private _units: Map<number, Unit>;  // Alle Units
  private _territory: Set<TileRef>;    // Territorium
  private _borderTiles: Set<TileRef>;  // Grenz-Kacheln
  // ... viele weitere Eigenschaften
}
```

**Wichtige Methoden:**

##### `canBuild(type: UnitType, tile: TileRef): TileRef | false`

**Zweck:** Prüft, ob an einer Position gebaut werden kann.

**Parameter:**
- `type`: UnitType
- `tile`: Position

**Rückgabewert:** Gültige Spawn-Position oder `false`

**Verhalten:**
- Prüft, ob Position gültig ist
- Prüft Territorium (wenn `territoryBound`)
- Prüft Kollisionen
- Findet beste Spawn-Position

##### `buildUnit(type: UnitType, tile: TileRef, params: UnitParams): Unit`

**Zweck:** Erstellt eine neue Unit.

**Parameter:**
- `type`: UnitType
- `tile`: Position
- `params`: Zusätzliche Parameter

**Rückgabewert:** Erstellte Unit

**Verhalten:**
- Prüft, ob gebaut werden kann (`canBuild`)
- Erstellt UnitImpl-Instanz
- Fügt zu `_units` hinzu
- Aktualisiert Territorium
- Registriert Stats

##### `spawn(unitType: UnitType, targetTile: TileRef): TileRef | false`

**Zweck:** Findet Spawn-Position für eine Unit.

**Parameter:**
- `unitType`: UnitType
- `targetTile`: Ziel-Position

**Rückgabewert:** Spawn-Position oder `false`

**Verhalten:**
- Ruft spezifische Spawn-Methode auf (je nach UnitType)
- `landBasedStructureSpawn()`: Für Land-Gebäude
- `waterBasedUnitSpawn()`: Für Wasser-Einheiten
- `nukeSpawn()`: Für Raketen

### Execution-System

#### `src/core/execution/ExecutionManager.ts`

**Zweck:** Erstellt Executions aus Spieler-Intents.

**Klasse:** `Executor`

**Wichtige Methoden:**

##### `createExec(intent: Intent): Execution`

**Zweck:** Erstellt eine Execution aus einem Intent.

**Parameter:**
- `intent`: Spieler-Intent (Attack, Build, etc.)

**Rückgabewert:** Execution-Instanz

**Verhalten:**
- Findet Spieler nach clientID
- Erstellt entsprechende Execution basierend auf Intent-Typ
- Gibt `NoOpExecution` zurück, wenn Spieler nicht gefunden

**Intent-Typen:**
- `"attack"`: `AttackExecution`
- `"build_unit"`: `ConstructionExecution`
- `"spawn"`: `SpawnExecution`
- `"boat"`: `TransportShipExecution`
- `"allianceRequest"`: `AllianceRequestExecution`
- `"emoji"`: `EmojiExecution`
- `"donate_gold"`: `DonateGoldExecution`
- `"donate_troops"`: `DonateTroopsExecution`
- `"embargo"`: `EmbargoExecution`
- `"upgrade_structure"`: `UpgradeStructureExecution`
- `"delete_unit"`: `DeleteUnitExecution`
- `"quick_chat"`: `QuickChatExecution`
- ... weitere

##### `createExecs(turn: Turn): Execution[]`

**Zweck:** Erstellt Executions für einen ganzen Turn.

**Parameter:**
- `turn`: Turn mit mehreren Intents

**Rückgabewert:** Array von Executions

**Verhalten:**
- Ruft `createExec()` für jeden Intent auf
- Gibt Array zurück

##### `spawnBots(numBots: number): Execution[]`

**Zweck:** Erstellt Executions zum Spawnen von Bots.

**Parameter:**
- `numBots`: Anzahl der Bots

**Rückgabewert:** Array von BotExecution-Instanzen

##### `spawnPlayers(): Execution[]`

**Zweck:** Erstellt Executions zum Spawnen von Spielern.

**Rückgabewert:** Array von SpawnExecution-Instanzen

##### `fakeHumanExecutions(): Execution[]`

**Zweck:** Erstellt Executions für NPC-Nationen.

**Rückgabewert:** Array von FakeHumanExecution-Instanzen

#### Wichtige Execution-Klassen

##### `AttackExecution`

**Datei:** `src/core/execution/AttackExecution.ts`

**Zweck:** Verwaltet Angriffe zwischen Spielern.

**Wichtige Methoden:**
- `tick()`: Bewegt Truppen, führt Kämpfe aus
- Verwaltet Angriffs-Logik (Truppen-Bewegung, Eroberung)

##### `ConstructionExecution`

**Datei:** `src/core/execution/ConstructionExecution.ts`

**Zweck:** Verwaltet den Bauprozess von Gebäuden.

**Wichtige Methoden:**

##### `tick(ticks: number): void`

**Zweck:** Führt den Bauprozess aus.

**Ablauf:**
1. Beim ersten Tick: Erstellt Construction-Unit, zieht Gold ab, setzt Bauzeit
2. In jedem Tick: Zählt Bauzeit herunter
3. Wenn Bauzeit = 0: Löscht Construction, erstattet Gold, ruft `completeConstruction()` auf

**Code:**
```typescript
tick(ticks: number): void {
  if (this.construction === null) {
    // Erstelle Construction-Unit
    const spawnTile = this.player.canBuild(this.constructionType, this.tile);
    if (spawnTile === false) {
      this.active = false;
      return;
    }
    this.construction = this.player.buildUnit(UnitType.Construction, spawnTile, {});
    this.cost = this.mg.unitInfo(this.constructionType).cost(this.player);
    this.player.removeGold(this.cost);
    this.construction.setConstructionType(this.constructionType);
    this.ticksUntilComplete = info.constructionDuration;
    return;
  }

  // Zähle Bauzeit herunter
  if (this.ticksUntilComplete === 0) {
    this.construction.delete(false);
    this.player.addGold(this.cost); // Gold zurückerstattet
    this.completeConstruction(); // Erstellt eigentliche Execution
    this.active = false;
    return;
  }
  this.ticksUntilComplete--;
}
```

##### `completeConstruction(): void`

**Zweck:** Erstellt die eigentliche Execution nach Bauabschluss.

**Verhalten:**
- Erstellt entsprechende Execution basierend auf `constructionType`
- Z.B. `CityExecution`, `FactoryExecution`, `FarmlandExecution`, etc.

#### `src/core/GameRunner.ts`

**Zweck:** Koordiniert die Game-Loop und verwaltet Turns.

**Klasse:** `GameRunner`

**Wichtige Eigenschaften:**

```typescript
export class GameRunner {
  private turns: Turn[] = [];              // Queue von Turns
  private currTurn = 0;                    // Aktueller Turn-Index
  private isExecuting = false;             // Verhindert parallele Ausführung
  private playerViewData: Record<PlayerID, NameViewData>; // Spieler-Namen-Daten
  public game: Game;                       // Game-Instanz
  private execManager: Executor;           // Erstellt Executions
  private callBack: (gu: GameUpdateViewData | ErrorUpdate) => void; // Callback für Updates
}
```

**Wichtige Methoden:**

##### `createGameRunner()`

**Zweck:** Factory-Funktion zum Erstellen eines GameRunners.

**Parameter:**
- `gameStart`: GameStartInfo mit Spiel-Konfiguration
- `clientID`: Client-ID
- `mapLoader`: Lädt Karten-Daten
- `callBack`: Callback für Game-Updates

**Rückgabewert:** `Promise<GameRunner>`

**Ablauf:**
1. Lädt Konfiguration
2. Lädt Karte
3. Erstellt Spieler-Infos
4. Erstellt Nationen (NPCs)
5. Erstellt Game-Instanz
6. Erstellt GameRunner mit Executor
7. Initialisiert GameRunner

##### `init(): void`

**Zweck:** Initialisiert das Spiel.

**Verhalten:**
- Spawnt Spieler (wenn `randomSpawn`)
- Spawnt Bots (wenn konfiguriert)
- Spawnt NPCs (wenn konfiguriert)
- Fügt WinCheckExecution hinzu

##### `executeNextTick(): void`

**Zweck:** Führt einen Game-Tick aus.

**Ablauf:**
1. Prüft, ob bereits ausgeführt wird (verhindert Parallelität)
2. Prüft, ob noch Turns vorhanden sind
3. Erstellt Executions aus aktuellem Turn
4. Ruft `game.executeNextTick()` auf
5. Misst Ausführungsdauer
6. Aktualisiert Spieler-Namen-Daten
7. Packt Tile-Updates in BigUint64Array (Performance)
8. Ruft Callback mit Updates auf

**Code:**
```typescript
public executeNextTick() {
  if (this.isExecuting) return;
  if (this.currTurn >= this.turns.length) return;
  
  this.isExecuting = true;
  
  // Erstelle Executions aus Turn
  this.game.addExecution(
    ...this.execManager.createExecs(this.turns[this.currTurn])
  );
  this.currTurn++;
  
  // Führe Game-Tick aus
  const startTime = performance.now();
  const updates = this.game.executeNextTick();
  const tickExecutionDuration = performance.now() - startTime;
  
  // Packe Tile-Updates (Performance-Optimierung)
  const packedTileUpdates = updates[GameUpdateType.Tile].map(u => u.update);
  updates[GameUpdateType.Tile] = [];
  
  // Callback mit Updates
  this.callBack({
    tick: this.game.ticks(),
    packedTileUpdates: new BigUint64Array(packedTileUpdates),
    updates: updates,
    playerNameViewData: this.playerViewData,
    tickExecutionDuration: tickExecutionDuration,
  });
  
  this.isExecuting = false;
}
```

##### `addTurn(turn: Turn): void`

**Zweck:** Fügt einen neuen Turn zur Queue hinzu.

**Parameter:**
- `turn`: Turn mit Intents von Clients

**Verhalten:**
- Fügt Turn zu `turns` Array hinzu
- Wird beim nächsten `executeNextTick()` verarbeitet

##### `playerActions(playerID: PlayerID, x?: number, y?: number): PlayerActions`

**Zweck:** Gibt verfügbare Aktionen für einen Spieler zurück.

**Parameter:**
- `playerID`: Spieler-ID
- `x`, `y`: Optionale Position

**Rückgabewert:** `PlayerActions` mit verfügbaren Aktionen

**Verhalten:**
- Prüft, ob angegriffen werden kann
- Gibt baubare Units zurück
- Prüft Interaktionen mit anderen Spielern (Allianzen, Embargos, etc.)

### Konfiguration

#### `src/core/configuration/DefaultConfig.ts`

**Zweck:** Standard-Konfiguration für das Spiel.

**Klasse:** `DefaultConfig`

**Wichtige Methoden:**

##### `unitInfo(type: UnitType): UnitInfo`

**Zweck:** Gibt Konfiguration für einen UnitType zurück.

**Parameter:**
- `type`: UnitType

**Rückgabewert:** `UnitInfo` mit Kosten, Bauzeit, etc.

**Verhalten:**
- Switch-Statement für jeden UnitType
- Definiert Kosten, Bauzeit, Upgradability, etc.

##### `costWrapper()`

**Zweck:** Wrapper für Kostenberechnung.

**Verhalten:**
- Berücksichtigt bereits gebaute Units (exponentielles Wachstum)
- Gibt Funktion zurück, die Kosten berechnet

### Pathfinding

#### `src/core/pathfinding/AStar.ts`

**Zweck:** A*-Pathfinding-Algorithmus.

**Verwendung:**
- Findet Pfade zwischen Positionen
- Berücksichtigt Terrain, Hindernisse
- Wird für Unit-Bewegung verwendet

#### `src/core/pathfinding/MiniAStar.ts`

**Zweck:** Optimierte Version für kleine Distanzen.

**Verwendung:**
- Für kurze Pfade (z.B. Rail-Verbindungen)
- Schneller als vollständiger A*

### Rail-Netzwerk

#### `src/core/game/RailNetwork.ts` / `RailNetworkImpl.ts`

**Zweck:** Verwaltet das Schienennetzwerk.

**Klasse:** `RailNetworkImpl`

**Wichtige Methoden:**

##### `connectStation(station: TrainStation): void`

**Zweck:** Verbindet eine Station mit dem Netzwerk.

**Verhalten:**
- Findet nahe Stationen
- Erstellt Railroads zwischen Stationen
- Verwaltet Clusters (verbundene Stationen)

##### `findStationsPath(from: TrainStation, to: TrainStation): TrainStation[]`

**Zweck:** Findet Pfad zwischen zwei Stationen.

**Rückgabewert:** Array von Stationen (Pfad)

### Statistiken

#### `src/core/game/Stats.ts` / `StatsImpl.ts`

**Zweck:** Verwaltet Spiel-Statistiken.

**Klasse:** `StatsImpl`

**Wichtige Methoden:**
- `unitBuild()`: Registriert gebaute Unit
- `unitDestroy()`: Registriert zerstörte Unit
- `attack()`: Registriert Angriff
- `gold()`: Registriert Gold-Erwerb

---

## Client-Modul

### Einstiegspunkt

#### `src/client/Main.ts`

**Zweck:** Haupt-Einstiegspunkt für den Client.

**Klasse:** `Client`

**Wichtige Methoden:**

##### `initialize(): void`

**Zweck:** Initialisiert den Client.

**Ablauf:**
1. Initialisiert UI-Komponenten
2. Lädt Einstellungen
3. Initialisiert Event-Bus
4. Setzt Event-Listener auf

**Wichtige Komponenten:**
- `UsernameInput`: Benutzername-Eingabe
- `FlagInput`: Flaggen-Auswahl
- `DarkModeButton`: Dark Mode Toggle
- `PublicLobby`: Öffentliche Lobby
- `Matchmaking`: Matchmaking-System
- Verschiedene Modals (Host, Join, Singleplayer, etc.)

### Game-Runner (Client)

#### `src/client/ClientGameRunner.ts`

**Zweck:** Verwaltet das Spiel auf Client-Seite.

**Klasse:** `ClientGameRunner`

**Wichtige Eigenschaften:**

```typescript
export class ClientGameRunner {
  private myPlayer: PlayerView | null;      // Eigener Spieler
  private isActive = false;                 // Aktivitäts-Status
  private turnsSeen = 0;                    // Anzahl gesehener Turns
  private lobby: LobbyConfig;              // Lobby-Konfiguration
  private eventBus: EventBus;               // Event-Bus
  private renderer: GameRenderer;           // Renderer
  private input: InputHandler;              // Input-Handler
  private transport: Transport;             // Transport (WebSocket)
  private worker: WorkerClient;              // Web Worker
  private gameView: GameView;               // Game-View
}
```

**Wichtige Methoden:**

##### `start(): void`

**Zweck:** Startet das Spiel.

**Ablauf:**
1. Spielt Hintergrundmusik ab
2. Setzt `isActive = true`
3. Registriert Event-Handler
4. Initialisiert Renderer und Input
5. Startet Worker
6. Setzt Update-Callback

##### `stop(): void`

**Zweck:** Stoppt das Spiel.

**Verhalten:**
- Setzt `isActive = false`
- Stoppt Worker
- Bereinigt Event-Handler
- Stoppt Renderer

##### `inputEvent(event: MouseUpEvent): void`

**Zweck:** Verarbeitet Maus-Klicks.

**Verhalten:**
- Prüft, ob Ghost Structure aktiv ist
- Konvertiert Bildschirm- zu Welt-Koordinaten
- Prüft Spawn-Phase
- Sendet Attack-Intent oder Boat-Attack-Intent

### Rendering

#### `src/client/graphics/GameRenderer.ts`

**Zweck:** Verwaltet das Rendering-System.

**Klasse:** `GameRenderer`

**Wichtige Eigenschaften:**

```typescript
export class GameRenderer {
  private layers: Layer[];                 // Alle Render-Layers
  private canvas: HTMLCanvasElement;        // Canvas-Element
  private game: GameView;                   // Game-View
  private eventBus: EventBus;               // Event-Bus
  public uiState: UIState;                  // UI-Zustand
}
```

**Wichtige Methoden:**

##### `createRenderer()`

**Zweck:** Factory-Funktion zum Erstellen eines Renderers.

**Parameter:**
- `canvas`: HTMLCanvasElement
- `game`: GameView
- `eventBus`: EventBus

**Rückgabewert:** `GameRenderer`

**Ablauf:**
1. Erstellt TransformHandler
2. Erstellt UIState
3. Findet alle UI-Komponenten im DOM
4. Erstellt alle Layers
5. Ordnet Layers in richtiger Reihenfolge

**Layer-Reihenfolge (wichtig für Rendering):**
1. TerrainLayer (Hintergrund)
2. TerritoryLayer (Territorien)
3. RailroadLayer (Schienen)
4. StructureLayer (Gebäude)
5. SAMRadiusLayer (SAM-Radius)
6. UnitLayer (Einheiten)
7. FxLayer (Effekte)
8. UILayer (UI-Elemente)
9. NukeTrajectoryPreviewLayer (Raketen-Vorschau)
10. StructureIconsLayer (Gebäude-Icons)
11. NameLayer (Namen)
12. Weitere UI-Layers (BuildMenu, Leaderboard, etc.)

##### `tick(): void`

**Zweck:** Rendert einen Frame.

**Ablauf:**
1. Ruft `tick()` für alle Layers auf
2. Ruft `redraw()` für alle Layers auf
3. Zeichnet alle Layers in Reihenfolge

#### Wichtige Layer-Klassen

##### `TerrainLayer`

**Datei:** `src/client/graphics/layers/TerrainLayer.ts`

**Zweck:** Rendert das Terrain (Hintergrund).

**Methoden:**
- `redraw()`: Zeichnet Terrain

##### `TerritoryLayer`

**Datei:** `src/client/graphics/layers/TerritoryLayer.ts`

**Zweck:** Rendert Territorien.

**Methoden:**
- `redraw()`: Zeichnet Territorien mit Farben

##### `StructureLayer`

**Datei:** `src/client/graphics/layers/StructureLayer.ts`

**Zweck:** Rendert Gebäude.

**Methoden:**
- `redraw()`: Zeichnet alle Gebäude
- Zeigt Icons, Territorium-Radius, Borders

##### `UnitLayer`

**Datei:** `src/client/graphics/layers/UnitLayer.ts`

**Zweck:** Rendert bewegliche Einheiten.

**Methoden:**
- `redraw()`: Zeichnet Einheiten (Schiffe, Raketen, etc.)

##### `UILayer`

**Datei:** `src/client/graphics/layers/UILayer.ts`

**Zweck:** Rendert UI-Elemente (Health Bars, Selection Boxes).

**Methoden:**
- `redraw()`: Zeichnet UI-Overlays
- `onUnitEvent()`: Reagiert auf Unit-Events

##### `UnitDisplay`

**Datei:** `src/client/graphics/layers/UnitDisplay.ts`

**Zweck:** Gebäudeleiste am unteren Bildschirmrand.

**Methoden:**
- `render()`: Rendert Leiste mit Gebäuden/Raketen
- `renderUnitItem()`: Rendert einzelnes Element
- `tick()`: Aktualisiert Anzahlen

##### `BuildMenu`

**Datei:** `src/client/graphics/layers/BuildMenu.ts`

**Zweck:** Build-Menü (Popup beim Rechtsklick).

**Methoden:**
- `showMenu()`: Zeigt Menü
- `hideMenu()`: Versteckt Menü
- `render()`: Rendert Menü mit baubaren Objekten

### Input-Handling

#### `src/client/InputHandler.ts`

**Zweck:** Verwaltet alle Eingaben (Tastatur, Maus).

**Klasse:** `InputHandler`

**Wichtige Eigenschaften:**

```typescript
export class InputHandler {
  private activeKeys = new Set<string>();   // Aktive Tasten
  private keybinds: Record<string, string>; // Keybind-Mapping
  private pointerDown: boolean;            // Maus gedrückt?
  private lastPointerX: number;           // Letzte Maus-Position
  private lastPointerY: number;
}
```

**Wichtige Methoden:**

##### `initialize(): void`

**Zweck:** Initialisiert Input-Handler.

**Ablauf:**
1. Lädt Keybinds aus localStorage
2. Setzt Standard-Keybinds
3. Registriert Event-Listener (keydown, keyup, pointerdown, etc.)

##### `onKeyDown(e: KeyboardEvent): void`

**Zweck:** Verarbeitet Tastendruck.

**Verhalten:**
- Prüft Keybind
- Aktiviert Ghost Structure Modus (z.B. F für Farmland)
- Bewegt Kamera (WASD)
- Zoomt (Q/E)

##### `onKeyUp(e: KeyboardEvent): void`

**Zweck:** Verarbeitet Tastenloslassen.

**Verhalten:**
- Deaktiviert Ghost Structure Modus
- Führt Aktionen aus (Attack, etc.)

##### `onPointerDown(e: PointerEvent): void`

**Zweck:** Verarbeitet Maus-Klick.

**Verhalten:**
- Prüft, ob Ghost Structure aktiv ist
- Sendet Build-Intent
- Oder zeigt Build-Menü

##### `setGhostStructure(type: UnitType | null): void`

**Zweck:** Aktiviert/Deaktiviert Ghost Structure Modus.

**Parameter:**
- `type`: UnitType oder null

**Verhalten:**
- Setzt `uiState.ghostStructure`
- Emittiert `GhostStructureChangedEvent`

### Transport (Kommunikation)

#### `src/client/Transport.ts`

**Zweck:** Verwaltet WebSocket-Kommunikation mit Server.

**Klasse:** `Transport`

**Wichtige Methoden:**

##### `connect(onconnect: () => void, onmessage: (msg: ServerMessage) => void): void`

**Zweck:** Verbindet mit Server.

**Parameter:**
- `onconnect`: Callback bei Verbindung
- `onmessage`: Callback bei Nachricht

##### `joinGame(lastTurn: number): void`

**Zweck:** Tritt einem Spiel bei.

**Parameter:**
- `lastTurn`: Letzter gesehener Turn (für Reconnect)

##### `sendIntent(intent: Intent): void`

**Zweck:** Sendet Intent an Server.

**Parameter:**
- `intent`: Spieler-Intent

##### `turnComplete(): void`

**Zweck:** Signalisiert Turn-Abschluss.

**Verhalten:**
- Sendet Ping an Server
- Wird für Synchronisation verwendet

### Worker-System

#### `src/core/worker/WorkerClient.ts`

**Zweck:** Client-Seite des Web Worker Systems.

**Klasse:** `WorkerClient`

**Wichtige Methoden:**

##### `initialize(): Promise<void>`

**Zweck:** Initialisiert Worker.

**Ablauf:**
1. Erstellt Web Worker
2. Sendet Initialisierungs-Nachricht
3. Wartet auf Bestätigung

##### `start(callback: (gu: GameUpdateViewData | ErrorUpdate) => void): void`

**Zweck:** Startet Worker.

**Parameter:**
- `callback`: Callback für Game-Updates

**Verhalten:**
- Sendet Start-Nachricht an Worker
- Worker verarbeitet Game-Updates
- Ruft Callback mit Updates auf

#### `src/core/worker/Worker.worker.ts`

**Zweck:** Web Worker für Game-Update-Verarbeitung.

**Verhalten:**
- Läuft in separatem Thread
- Verarbeitet Game-Updates
- Sendet Ergebnisse zurück an Client

---

## Server-Modul

### Einstiegspunkt

#### `src/server/Server.ts`

**Zweck:** Haupt-Einstiegspunkt für den Server.

**Funktion:** `main()`

**Ablauf:**
1. Prüft, ob Primary oder Worker
2. Primary: Startet Master
3. Worker: Startet Worker-Prozess

**Code:**
```typescript
async function main() {
  if (cluster.isPrimary) {
    if (config.env() !== GameEnv.Dev) {
      await setupTunnels(); // Cloudflare Tunnels
    }
    await startMaster();
  } else {
    await startWorker();
  }
}
```

### Master-Prozess

#### `src/server/Master.ts`

**Zweck:** Verwaltet Worker-Prozesse und Load Balancing.

**Funktion:** `startMaster()`

**Ablauf:**
1. Erstellt HTTP-Server
2. Verteilt Requests auf Worker
3. Verwaltet Worker-Lifecycle

### Worker-Prozess

#### `src/server/Worker.ts`

**Zweck:** Verwaltet Spiel-Instanzen.

**Funktion:** `startWorker()`

**Ablauf:**
1. Erstellt Express-App
2. Erstellt WebSocket-Server
3. Erstellt GameManager
4. Setzt API-Endpunkte
5. Startet Matchmaking (wenn aktiviert)

**Wichtige Endpunkte:**
- `POST /api/create_game/:id`: Erstellt neues Spiel
- WebSocket: Verbindung für Clients

### Game-Management

#### `src/server/GameManager.ts`

**Zweck:** Verwaltet alle aktiven Spiele.

**Klasse:** `GameManager`

**Wichtige Eigenschaften:**

```typescript
export class GameManager {
  private games: Map<GameID, GameServer>; // Alle aktiven Spiele
  private config: ServerConfig;            // Server-Konfiguration
  private log: Logger;                     // Logger
}
```

**Wichtige Methoden:**

##### `createGame(id: GameID, gameConfig?: GameConfig, creatorClientID?: string): GameServer`

**Zweck:** Erstellt ein neues Spiel.

**Parameter:**
- `id`: Spiel-ID
- `gameConfig`: Spiel-Konfiguration
- `creatorClientID`: Client-ID des Erstellers

**Rückgabewert:** `GameServer` Instanz

##### `tick(): void`

**Zweck:** Wird jede Sekunde aufgerufen.

**Verhalten:**
- Prüft alle Spiele
- Startet Spiele, die bereit sind
- Beendet fertige Spiele
- Entfernt beendete Spiele

##### `activeGames(): number`

**Zweck:** Gibt Anzahl aktiver Spiele zurück.

##### `activeClients(): number`

**Zweck:** Gibt Anzahl aktiver Clients zurück.

#### `src/server/GameServer.ts`

**Zweck:** Verwaltet eine einzelne Spiel-Instanz.

**Klasse:** `GameServer`

**Wichtige Eigenschaften:**

```typescript
export class GameServer {
  public readonly id: string;              // Spiel-ID
  public gameConfig: GameConfig;            // Spiel-Konfiguration
  public activeClients: Client[];           // Aktive Clients
  private turns: Turn[] = [];               // Turn-Queue
  private intents: Intent[] = [];          // Intent-Queue
  private gameRunner: GameRunner | null;    // GameRunner
  private _hasStarted = false;              // Spiel gestartet?
  private _hasPrestarted = false;          // Prestart durchgeführt?
}
```

**Wichtige Methoden:**

##### `addClient(client: Client, lastTurn: number): void`

**Zweck:** Fügt Client zum Spiel hinzu.

**Parameter:**
- `client`: Client-Instanz
- `lastTurn`: Letzter gesehener Turn

**Verhalten:**
- Fügt Client zu `activeClients` hinzu
- Sendet Catch-Up-Updates (wenn nötig)
- Sendet Prestart-Nachricht (wenn noch nicht gesendet)

##### `prestart(): void`

**Zweck:** Sendet Prestart-Nachricht an Clients.

**Verhalten:**
- Sendet `prestart` Nachricht mit GameMap-Info
- Clients können Karte vorladen

##### `start(): void`

**Zweck:** Startet das Spiel.

**Ablauf:**
1. Erstellt GameRunner
2. Startet Game-Loop (setInterval)
3. Sendet Start-Nachricht an Clients
4. Setzt `_hasStarted = true`

##### `end(): void`

**Zweck:** Beendet das Spiel.

**Verhalten:**
- Stoppt Game-Loop
- Archiviert Spiel
- Setzt Phase auf `Finished`

##### `addIntent(intent: Intent): void`

**Zweck:** Fügt Intent zur Queue hinzu.

**Verhalten:**
- Fügt Intent zu `intents` hinzu
- Wird beim nächsten Turn verarbeitet

##### `tick(): void`

**Zweck:** Wird kontinuierlich aufgerufen (Game-Loop).

**Ablauf:**
1. Sammelt Intents von Clients
2. Erstellt Turn aus Intents
3. Fügt Turn zu GameRunner hinzu
4. Ruft `gameRunner.executeNextTick()` auf
5. Sendet Updates an alle Clients
6. Prüft auf Desynchronisation

#### `src/server/Client.ts`

**Zweck:** Repräsentiert einen verbundenen Client.

**Klasse:** `Client`

**Wichtige Eigenschaften:**

```typescript
export class Client {
  public readonly clientID: ClientID;      // Client-ID
  public readonly ws: WebSocket;           // WebSocket-Verbindung
  private lastTurn: number = 0;            // Letzter gesehener Turn
  private lastPing: number = Date.now();   // Letzter Ping
}
```

**Wichtige Methoden:**

##### `send(message: ServerMessage): void`

**Zweck:** Sendet Nachricht an Client.

**Parameter:**
- `message`: Server-Nachricht

##### `updateLastTurn(turn: number): void`

**Zweck:** Aktualisiert letzten gesehenen Turn.

**Verhalten:**
- Wird für Catch-Up verwendet
- Client kann fehlende Updates anfordern

---

## Hilfs-Module

### Event-System

#### `src/core/EventBus.ts`

**Zweck:** Event-System für lose Kopplung zwischen Komponenten.

**Klasse:** `EventBus`

**Wichtige Methoden:**

##### `emit<T extends GameEvent>(event: T): void`

**Zweck:** Sendet Event.

**Parameter:**
- `event`: Event-Instanz

**Verhalten:**
- Findet alle Listener für Event-Typ
- Ruft alle Listener auf

##### `on<T extends GameEvent>(eventType: EventConstructor<T>, callback: (event: T) => void): void`

**Zweck:** Registriert Event-Listener.

**Parameter:**
- `eventType`: Event-Konstruktor
- `callback`: Callback-Funktion

##### `off<T extends GameEvent>(eventType: EventConstructor<T>, callback: (event: T) => void): void`

**Zweck:** Entfernt Event-Listener.

### Schemas

#### `src/core/Schemas.ts`

**Zweck:** Zod-Schemas für Validierung.

**Wichtige Schemas:**
- `GameStartInfoSchema`: Validierung von GameStartInfo
- `ClientMessageSchema`: Validierung von Client-Nachrichten
- `ServerMessageSchema`: Validierung von Server-Nachrichten
- `IntentSchema`: Validierung von Intents

### Utilities

#### `src/core/Util.ts`

**Zweck:** Utility-Funktionen.

**Wichtige Funktionen:**
- `simpleHash()`: Einfache Hash-Funktion
- `toInt()`: Konvertiert zu Integer
- `within()`: Prüft, ob Wert in Bereich
- `sanitize()`: Bereinigt Strings

#### `src/client/Utils.ts`

**Zweck:** Client-spezifische Utilities.

**Wichtige Funktionen:**
- `translateText()`: Lädt Übersetzung
- `renderNumber()`: Formatiert Zahlen
- `createCanvas()`: Erstellt Canvas-Element

### Pathfinding

#### `src/core/pathfinding/AStar.ts`

**Zweck:** A*-Pathfinding-Implementierung.

**Klasse:** `AStar`

**Wichtige Methoden:**
- `compute()`: Berechnet Pfad
- `reconstructPath()`: Rekonstruiert Pfad aus Ergebnis

#### `src/core/pathfinding/MiniAStar.ts`

**Zweck:** Optimierte Version für kurze Distanzen.

**Verwendung:**
- Für Rail-Verbindungen
- Schneller als vollständiger A*

---

## Zusammenfassung

### Architektur-Übersicht

BackWars verwendet eine **Client-Server-Architektur** mit:

1. **Core-Modul**: Geteilte Logik (Client & Server)
   - Game-Kern, Unit-System, Player-System
   - Execution-System für alle Aktionen
   - Pathfinding, Rail-Netzwerk, Statistiken

2. **Client-Modul**: Browser-Client
   - Rendering mit Canvas und PIXI.js
   - UI mit Lit Elements
   - Input-Handling
   - WebSocket-Kommunikation
   - Web Worker für Update-Verarbeitung

3. **Server-Modul**: Node.js-Server
   - Master-Prozess für Load Balancing
   - Worker-Prozesse für Spiel-Instanzen
   - GameManager für Spiel-Verwaltung
   - WebSocket-Server für Client-Kommunikation

### Wichtige Konzepte

1. **Execution-System**: Alle Aktionen sind Executions
2. **Game Loop**: Kontinuierliche Updates (60 Ticks/Sekunde)
3. **Turn-System**: Clients senden Intents, Server verarbeitet in Turns
4. **Update-System**: Server sendet nur Änderungen (Delta-Updates)
5. **Event-System**: Lose Kopplung zwischen Komponenten

### Datenfluss

```
Client Intent → WebSocket → Server → Executor → Execution → Game → Updates → Client → Rendering
```

### Performance-Optimierungen

1. **Delta-Updates**: Nur Änderungen werden gesendet
2. **Packed Tile Updates**: BigUint64Array für viele Tile-Updates
3. **Web Worker**: Update-Verarbeitung in separatem Thread
4. **Layer-System**: Effizientes Rendering mit Canvas
5. **UnitGrid**: Schnelle Unit-Suche

### GameMap-System

#### `src/core/game/GameMap.ts`

**Zweck:** Verwaltet die Karte und Tile-Referenzen.

**Interface:** `GameMap`

**Wichtige Methoden:**

##### `ref(x: number, y: number): TileRef`

**Zweck:** Konvertiert Koordinaten zu TileRef.

**Parameter:**
- `x`, `y`: Koordinaten

**Rückgabewert:** `TileRef` (Zahl)

**Was ist TileRef?**
- Kompakte Darstellung einer Position
- Statt `{x, y}` Objekten wird eine Zahl verwendet (Performance)
- Wird überall im Code verwendet

##### `isLand(ref: TileRef): boolean`

**Zweck:** Prüft, ob Tile Land ist.

##### `isOcean(ref: TileRef): boolean`

**Zweck:** Prüft, ob Tile Ozean ist.

##### `ownerID(ref: TileRef): number`

**Zweck:** Gibt Besitzer-ID zurück.

##### `setOwnerID(ref: TileRef, playerId: number): void`

**Zweck:** Setzt Besitzer.

##### `neighbors(ref: TileRef): TileRef[]`

**Zweck:** Gibt benachbarte Tiles zurück.

##### `manhattanDist(c1: TileRef, c2: TileRef): number`

**Zweck:** Berechnet Manhattan-Distanz.

##### `euclideanDistSquared(c1: TileRef, c2: TileRef): number`

**Zweck:** Berechnet euklidische Distanz (quadriert).

**Klasse:** `GameMapImpl`

**Wichtige Eigenschaften:**

```typescript
export class GameMapImpl implements GameMap {
  private readonly terrain: Uint8Array;  // Immutable terrain data
  private readonly state: Uint16Array;   // Mutable game state
  private readonly width_: number;
  private readonly height_: number;
  private readonly refToX: number[];     // Lookup-Tabelle
  private readonly refToY: number[];     // Lookup-Tabelle
  private readonly yToRef: number[];     // Lookup-Tabelle
}
```

**Performance-Optimierungen:**
- Lookup-Tabellen (LUTs) für schnelle Konvertierung
- Bit-Packing für Terrain-Daten
- Uint8Array/Uint16Array für kompakte Speicherung

### GameView-System

#### `src/core/game/GameView.ts`

**Zweck:** Client-seitige Ansicht des Spiels.

**Klasse:** `GameView`

**Unterschied zu Game:**
- `Game`: Server-seitig, voller Zugriff, mutable
- `GameView`: Client-seitig, eingeschränkter Zugriff, immutable

**Wichtige Eigenschaften:**

```typescript
export class GameView {
  private worker: WorkerClient;           // Web Worker
  private config: Config;                 // Konfiguration
  private map: GameMap;                   // Karte
  private clientID: ClientID;             // Client-ID
  private players: Map<PlayerID, PlayerView>; // Spieler-Views
  private units: Map<number, UnitView>;   // Unit-Views
}
```

**Wichtige Methoden:**

##### `update(data: GameUpdateViewData): void`

**Zweck:** Aktualisiert GameView mit neuen Updates.

**Parameter:**
- `data`: Game-Update-Daten

**Verhalten:**
- Verarbeitet alle Update-Typen
- Aktualisiert Units, Players, Tiles
- Entfernt gelöschte Units

##### `myPlayer(): PlayerView | null`

**Zweck:** Gibt eigenen Spieler zurück.

**Rückgabewert:** `PlayerView` oder `null`

##### `player(id: PlayerID): PlayerView | null`

**Zweck:** Gibt Spieler nach ID zurück.

##### `units(type: UnitType): UnitView[]`

**Zweck:** Gibt alle Units eines Typs zurück.

**Klasse:** `UnitView`

**Zweck:** Client-seitige Repräsentation einer Unit.

**Wichtige Methoden:**
- `id()`: Unit-ID
- `type()`: UnitType
- `owner()`: Besitzer (PlayerView)
- `tile()`: Position
- `isActive()`: Ob Unit noch existiert
- `level()`: Level
- `health()`: Lebenspunkte

**Klasse:** `PlayerView`

**Zweck:** Client-seitige Repräsentation eines Spielers.

**Wichtige Methoden:**
- `id()`: Spieler-ID
- `name()`: Name
- `gold()`: Gold
- `troops()`: Truppen
- `units(type)`: Units eines Typs
- `totalUnitLevels(type)`: Gesamtzahl der Levels

### Game-Updates-System

#### `src/core/game/GameUpdates.ts`

**Zweck:** Definiert alle Update-Typen.

**Enum:** `GameUpdateType`

```typescript
export enum GameUpdateType {
  Tile,              // Tile-Änderungen
  Unit,              // Unit-Änderungen
  Player,            // Player-Änderungen
  DisplayEvent,      // Anzeige-Events
  DisplayChatEvent,  // Chat-Events
  AllianceRequest,   // Allianz-Anfragen
  AllianceRequestReply, // Allianz-Antworten
  BrokeAlliance,     // Allianz gebrochen
  AllianceExpired,   // Allianz abgelaufen
  AllianceExtension, // Allianz verlängert
  TargetPlayer,      // Spieler anvisiert
  Emoji,             // Emoji-Nachricht
  Win,               // Spiel gewonnen
  Hash,              // Hash für Synchronisation
  UnitIncoming,      // Einheit kommt an
  BonusEvent,        // Bonus-Event
  RailroadEvent,     // Schienen-Event
  ConquestEvent,     // Eroberungs-Event
  EmbargoEvent,      // Embargo-Event
}
```

**Interface:** `GameUpdateViewData`

```typescript
export interface GameUpdateViewData {
  tick: number;                          // Aktueller Tick
  updates: GameUpdates;                  // Alle Updates
  packedTileUpdates: BigUint64Array;     // Gepackte Tile-Updates (Performance)
  playerNameViewData: Record<string, NameViewData>; // Spieler-Namen
  tickExecutionDuration?: number;        // Ausführungsdauer
}
```

**Was macht GameUpdates?**
- Definiert alle möglichen Update-Typen
- Wird für Delta-Updates verwendet (nur Änderungen werden gesendet)
- `packedTileUpdates`: Performance-Optimierung für viele Tile-Updates

### Weitere wichtige Execution-Klassen

#### `AttackExecution`

**Datei:** `src/core/execution/AttackExecution.ts`

**Zweck:** Verwaltet Angriffe zwischen Spielern.

**Klasse:** `AttackExecution`

**Wichtige Eigenschaften:**

```typescript
export class AttackExecution implements Execution {
  private attack: Attack | null = null;  // Attack-Objekt
  private target: Player | TerraNullius; // Ziel
  private toConquer = new FlatBinaryHeap(); // Zu erobernde Tiles
  private startTroops: number | null;    // Start-Truppen
}
```

**Wichtige Methoden:**

##### `init(mg: Game, ticks: number): void`

**Zweck:** Initialisiert den Angriff.

**Ablauf:**
1. Prüft, ob Ziel existiert
2. Prüft Allianzen (kein Angriff auf Verbündete)
3. Erstellt Embargo (wenn menschliche Spieler)
4. Erstellt Attack-Objekt
5. Kombiniert mit anderen Angriffen auf dasselbe Ziel
6. Registriert Stats

##### `tick(ticks: number): void`

**Zweck:** Führt Angriff aus.

**Ablauf:**
1. Bewegt Truppen zu Ziel
2. Erobert Tiles
3. Prüft auf Rückzug
4. Beendet Angriff, wenn Ziel erreicht oder keine Truppen mehr

**Angriffs-Logik:**
- Truppen bewegen sich zu Ziel
- Erobern Tiles auf dem Weg
- Verlieren Truppen beim Erobern
- Können zurückziehen (mit Malus)

#### `PlayerExecution`

**Datei:** `src/core/execution/PlayerExecution.ts`

**Zweck:** Verwaltet Spieler-spezifische Logik.

**Klasse:** `PlayerExecution`

**Wichtige Methoden:**

##### `tick(ticks: number): void`

**Zweck:** Führt Spieler-Logik aus.

**Ablauf:**
1. Verfall von Beziehungen (`decayRelations()`)
2. Prüft Units auf Territorium (erobert Units, die auf fremdem Territorium sind)
3. Prüft, ob Spieler noch lebt (löscht Units, wenn tot)
4. Erhöht Truppen (`troopIncreaseRate`)
5. Erhöht Gold (`goldAdditionRate`)
6. Prüft abgelaufene Allianzen
7. Prüft temporäre Embargos
8. Berechnet Clusters (alle 20 Ticks)

**Wichtige Funktionen:**
- `decayRelations()`: Beziehungen verfallen über Zeit
- `troopIncreaseRate()`: Truppen werden kontinuierlich generiert
- `goldAdditionRate()`: Gold wird kontinuierlich generiert

#### `BotExecution`

**Datei:** `src/core/execution/BotExecution.ts`

**Zweck:** KI-Logik für Bots.

**Klasse:** `BotExecution`

**Wichtige Eigenschaften:**

```typescript
export class BotExecution implements Execution {
  private behavior: BotBehavior | null;   // Bot-Verhalten
  private attackRate: number;             // Angriffs-Rate
  private attackTick: number;            // Angriffs-Tick
  private triggerRatio: number;           // Trigger-Verhältnis
  private reserveRatio: number;          // Reserve-Verhältnis
  private expandRatio: number;            // Expansions-Verhältnis
}
```

**Wichtige Methoden:**

##### `tick(ticks: number): void`

**Zweck:** Führt Bot-Logik aus.

**Ablauf:**
1. Prüft Angriffs-Rate (nicht jeden Tick)
2. Initialisiert BotBehavior (beim ersten Tick)
3. Sendet ersten Angriff auf TerraNullius
4. Behandelt Allianz-Anfragen
5. Entscheidet, ob angegriffen wird

**Bot-Strategie:**
- Angriffe auf Traitors (Verräter)
- Angriffe auf TerraNullius (freies Land)
- Zufällige Angriffe auf Feinde
- Berücksichtigt Beziehungen

#### `FakeHumanExecution`

**Datei:** `src/core/execution/FakeHumanExecution.ts`

**Zweck:** KI-Logik für NPC-Nationen (intelligenter als Bots).

**Klasse:** `FakeHumanExecution`

**Wichtige Eigenschaften:**

```typescript
export class FakeHumanExecution implements Execution {
  private behavior: BotBehavior | null;   // Geteiltes Bot-Verhalten
  private nation: Nation;                 // Nation-Daten
  private trackedTransportShips: Set<Unit>; // Verfolgte Transport-Schiffe
  private trackedTradeShips: Set<Unit>;   // Verfolgte Handels-Schiffe
  private lastEmojiSent: Map<Player, Tick>; // Letzte Emoji-Nachrichten
  private lastNukeSent: [Tick, TileRef][];   // Letzte Raketen
  private lastMIRVSent: [Tick, TileRef][];  // Letzte MIRVs
}
```

**Wichtige Methoden:**

##### `tick(ticks: number): void`

**Zweck:** Führt NPC-Logik aus.

**Ablauf:**
1. Aktualisiert Beziehungen basierend auf Embargos
2. Behandelt Allianz-Anfragen
3. Entscheidet über Angriffe
4. Entscheidet über Raketen-Einsatz
5. Entscheidet über MIRV-Einsatz
6. Verwaltet Transport-Schiffe
7. Verwaltet Handels-Schiffe
8. Sendet Emoji-Nachrichten

**NPC-Strategie (komplexer als Bots):**
- Strategische Raketen-Einsätze
- MIRV-Einsätze bei Bedrohung
- Verwaltung von Transport-Schiffen
- Verwaltung von Handels-Schiffen
- Emoji-Kommunikation
- Victory Denial (verhindert Sieg anderer)

### Rail-Netzwerk Details

#### `src/core/game/RailNetworkImpl.ts`

**Zweck:** Implementierung des Schienennetzwerks.

**Klasse:** `RailNetworkImpl`

**Wichtige Methoden:**

##### `connectStation(station: TrainStation): void`

**Zweck:** Verbindet eine Station mit dem Netzwerk.

**Ablauf:**
1. Fügt Station zu StationManager hinzu
2. Ruft `connectToNearbyStations()` auf

##### `connectToNearbyStations(station: TrainStation): void`

**Zweck:** Verbindet Station mit nahen Stationen.

**Ablauf:**
1. Findet nahe Units (City, Factory, Port, Farmland)
2. Sortiert nach Distanz
3. Für jede nahe Station:
   - Prüft Distanz (maxConnectionDistance)
   - Prüft minimale Distanz (trainStationMinRange)
   - Erstellt Railroad (wenn möglich)
   - Fügt zu Cluster hinzu
4. Merge Clusters (wenn mehrere)

**Besonderheit:**
- Farmland kann sich nur mit Factorys verbinden (siehe Code)

##### `connect(from: TrainStation, to: TrainStation): boolean`

**Zweck:** Erstellt Railroad zwischen zwei Stationen.

**Ablauf:**
1. Findet Pfad mit A* (`findTilePath`)
2. Prüft, ob Pfad gültig ist (Länge < maxSize)
3. Erstellt Railroad
4. Fügt zu beiden Stationen hinzu

**Rückgabewert:** `true` wenn erfolgreich, sonst `false`

##### `findStationsPath(from: TrainStation, to: TrainStation): TrainStation[]`

**Zweck:** Findet Pfad zwischen Stationen.

**Verwendung:**
- Für Zug-Routen
- Verwendet SerialAStar auf Station-Graph

#### `src/core/game/TrainStation.ts`

**Zweck:** Repräsentiert eine Zugstation.

**Klasse:** `TrainStation`

**Wichtige Eigenschaften:**

```typescript
export class TrainStation {
  public unit: Unit;                      // Unit mit Station
  private railroads: Set<Railroad>;       // Verbundene Railroads
  private cluster: Cluster | null;         // Cluster (verbundene Stationen)
  private stopHandlers: Partial<Record<UnitType, TrainStopHandler>>; // Handler für Zug-Stops
}
```

**Wichtige Methoden:**

##### `neighbors(): TrainStation[]`

**Zweck:** Gibt benachbarte Stationen zurück.

##### `onTrainStop(trainExecution: TrainExecution): void`

**Zweck:** Wird aufgerufen, wenn Zug an Station ankommt.

**Verhalten:**
- Ruft entsprechenden Handler auf (z.B. `FarmlandStopHandler`)
- Handler führt Aktion aus (z.B. Gold-Generierung)

#### `src/core/game/Railroad.ts`

**Zweck:** Repräsentiert eine Schienenverbindung.

**Klasse:** `Railroad`

**Wichtige Eigenschaften:**

```typescript
export class Railroad {
  public from: TrainStation;             // Start-Station
  public to: TrainStation;                // Ziel-Station
  public tiles: TileRef[];                // Pfad (Tiles)
}
```

**Wichtige Methoden:**

##### `delete(game: Game): void`

**Zweck:** Löscht Railroad.

**Verhalten:**
- Entfernt Rails von Karte
- Erstellt RailroadEvent-Update

### Transform-Handler

#### `src/client/graphics/TransformHandler.ts`

**Zweck:** Verwaltet Koordinaten-Transformationen.

**Klasse:** `TransformHandler`

**Wichtige Methoden:**

##### `screenToWorldCoordinates(x: number, y: number): Cell | null`

**Zweck:** Konvertiert Bildschirm- zu Welt-Koordinaten.

**Parameter:**
- `x`, `y`: Bildschirm-Koordinaten

**Rückgabewert:** `Cell` oder `null`

##### `worldToScreenCoordinates(cell: Cell): { x: number; y: number }`

**Zweck:** Konvertiert Welt- zu Bildschirm-Koordinaten.

**Parameter:**
- `cell`: Welt-Koordinaten

**Rückgabewert:** Bildschirm-Koordinaten

##### `pan(deltaX: number, deltaY: number): void`

**Zweck:** Bewegt Kamera.

##### `zoom(factor: number, centerX?: number, centerY?: number): void`

**Zweck:** Zoomt Kamera.

### Weitere wichtige Client-Komponenten

#### `src/client/graphics/layers/RadialMenu.ts`

**Zweck:** Radial-Menü (Kontextmenü).

**Verwendung:**
- Wird beim Rechtsklick angezeigt
- Zeigt verfügbare Aktionen
- Verwaltet durch `MainRadialMenu`

#### `src/client/graphics/layers/Leaderboard.ts`

**Zweck:** Bestenliste.

**Methoden:**
- Zeigt Spieler-Rankings
- Sortiert nach verschiedenen Kriterien
- Zeigt Statistiken

#### `src/client/graphics/layers/PlayerPanel.ts`

**Zweck:** Spieler-Panel (Seitenleiste).

**Methoden:**
- Zeigt Spieler-Informationen
- Zeigt Allianzen
- Zeigt Embargos
- Zeigt Statistiken

#### `src/client/graphics/layers/ChatDisplay.ts`

**Zweck:** Chat-Anzeige.

**Methoden:**
- Zeigt Chat-Nachrichten
- Verwaltet Chat-Historie
- Integriert mit ChatModal

#### `src/client/graphics/layers/FxLayer.ts`

**Zweck:** Effekt-Layer.

**Methoden:**
- Zeigt visuelle Effekte
- Explosionen, Partikel, etc.
- Verwaltet Fx-Timeline

### Weitere wichtige Server-Komponenten

#### `src/server/Client.ts`

**Zweck:** Repräsentiert einen verbundenen Client.

**Klasse:** `Client`

**Wichtige Eigenschaften:**

```typescript
export class Client {
  public readonly clientID: ClientID;     // Client-ID
  public readonly ws: WebSocket;          // WebSocket
  private lastTurn: number = 0;            // Letzter gesehener Turn
  private lastPing: number;                // Letzter Ping
  private ip: string;                     // IP-Adresse
}
```

**Wichtige Methoden:**

##### `send(message: ServerMessage): void`

**Zweck:** Sendet Nachricht an Client.

##### `updateLastTurn(turn: number): void`

**Zweck:** Aktualisiert letzten Turn.

**Verwendung:**
- Für Catch-Up bei Reconnect
- Client kann fehlende Updates anfordern

#### `src/server/Archive.ts`

**Zweck:** Archiviert beendete Spiele.

**Funktionen:**
- `archive()`: Archiviert Spiel
- `finalizeGameRecord()`: Finalisiert Spiel-Record

**Verwendung:**
- Spiele werden nach Beendigung archiviert
- Können als Replay abgespielt werden

### Konfiguration-System

#### `src/core/configuration/Config.ts`

**Zweck:** Basis-Interface für Konfiguration.

**Interface:** `Config`

**Wichtige Methoden:**
- `unitInfo()`: Unit-Informationen
- `troopIncreaseRate()`: Truppen-Generierungsrate
- `goldAdditionRate()`: Gold-Generierungsrate
- `trainStationMaxRange()`: Max. Reichweite für Zugstationen
- `isUnitDisabled()`: Prüft, ob Unit deaktiviert ist

#### `src/core/configuration/ConfigLoader.ts`

**Zweck:** Lädt Konfiguration.

**Funktionen:**
- `getConfig()`: Lädt Konfiguration
- `getServerConfigFromServer()`: Server-Konfiguration
- `getServerConfigFromClient()`: Client-Konfiguration

**Verhalten:**
- Lädt Konfiguration basierend auf Umgebung (Dev, Prod, etc.)
- Berücksichtigt User-Settings

### PseudoRandom

#### `src/core/PseudoRandom.ts`

**Zweck:** Deterministischer Zufallsgenerator.

**Klasse:** `PseudoRandom`

**Wichtige Methoden:**
- `nextInt(min, max)`: Zufällige Ganzzahl
- `chance(odds)`: Zufällige Chance
- `nextID()`: Zufällige ID

**Verwendung:**
- Für deterministische Zufälligkeit
- Gleicher Seed = gleiche Ergebnisse
- Wichtig für Replays

### UnitGrid

#### `src/core/game/UnitGrid.ts`

**Zweck:** Grid für schnelle Unit-Suche.

**Klasse:** `UnitGrid`

**Wichtige Methoden:**
- `addUnit(unit: Unit): void`: Fügt Unit hinzu
- `removeUnit(unit: Unit): void`: Entfernt Unit
- `nearbyUnits(tile, range, types)`: Findet nahe Units

**Performance:**
- Grid-basierte Suche statt linearer Suche
- Deutlich schneller für große Mengen von Units

---

## Detaillierte Methoden-Erklärungen

### Game-Interface Methoden

#### `Game.addExecution(...executions: Execution[]): void`

**Zweck:** Fügt neue Executions hinzu.

**Parameter:**
- `executions`: Array von Executions

**Verhalten:**
- Fügt zu `unInitExecs` hinzu
- Werden beim nächsten Tick initialisiert

#### `Game.executeNextTick(): GameUpdates`

**Zweck:** Führt einen Game-Tick aus.

**Rückgabewert:** `GameUpdates` mit allen Änderungen

**Ablauf:**
1. Erstellt neue Updates-Map
2. Ticked alle aktiven Executions
3. Initialisiert neue Executions
4. Entfernt inaktive Executions
5. Erstellt Player-Updates
6. Erstellt Hash-Update (alle 10 Ticks)
7. Erhöht Tick-Zähler
8. Gibt Updates zurück

#### `Game.player(id: PlayerID): Player`

**Zweck:** Gibt Spieler nach ID zurück.

**Parameter:**
- `id`: Spieler-ID

**Rückgabewert:** `Player` Instanz

#### `Game.players(): Player[]`

**Zweck:** Gibt alle Spieler zurück.

**Rückgabewert:** Array von Spielern

#### `Game.units(...types: UnitType[]): Unit[]`

**Zweck:** Gibt alle Units der angegebenen Typen zurück.

**Parameter:**
- `types`: UnitTypes

**Rückgabewert:** Array von Units

#### `Game.nearbyUnits(tile: TileRef, range: number, types: UnitType[]): NearbyUnit[]`

**Zweck:** Findet Units in der Nähe.

**Parameter:**
- `tile`: Zentrum
- `range`: Reichweite
- `types`: UnitTypes

**Rückgabewert:** Array von NearbyUnit (mit Distanz)

### Player-Interface Methoden

#### `Player.canBuild(type: UnitType, tile: TileRef): TileRef | false`

**Zweck:** Prüft, ob gebaut werden kann.

**Parameter:**
- `type`: UnitType
- `tile`: Position

**Rückgabewert:** Gültige Spawn-Position oder `false`

**Verhalten:**
- Prüft Territorium
- Prüft Kollisionen
- Findet beste Position

#### `Player.buildUnit(type: UnitType, tile: TileRef, params: UnitParams): Unit`

**Zweck:** Erstellt Unit.

**Parameter:**
- `type`: UnitType
- `tile`: Position
- `params`: Zusätzliche Parameter

**Rückgabewert:** Erstellte Unit

#### `Player.units(type: UnitType): Unit[]`

**Zweck:** Gibt Units eines Typs zurück.

**Parameter:**
- `type`: UnitType

**Rückgabewert:** Array von Units

#### `Player.totalUnitLevels(type: UnitType): number`

**Zweck:** Gibt Gesamtzahl der Levels zurück.

**Parameter:**
- `type`: UnitType

**Rückgabewert:** Anzahl (berücksichtigt Upgrades)

**Beispiel:**
- 2 Cities Level 1 = 2
- 1 City Level 2 = 2

#### `Player.canAttack(tile: TileRef): boolean`

**Zweck:** Prüft, ob angegriffen werden kann.

**Parameter:**
- `tile`: Ziel-Position

**Rückgabewert:** `true` wenn angreifbar

#### `Player.createAttack(target: Player | TerraNullius, troops: number, sourceTile: TileRef | null, conquered: Set<TileRef>): Attack`

**Zweck:** Erstellt Angriff.

**Parameter:**
- `target`: Ziel
- `troops`: Truppen
- `sourceTile`: Start-Position (null = von Grenze)
- `conquered`: Bereits eroberte Tiles

**Rückgabewert:** `Attack` Instanz

#### `Player.addGold(amount: Gold, tile: TileRef): void`

**Zweck:** Fügt Gold hinzu.

**Parameter:**
- `amount`: Gold-Menge
- `tile`: Position (für Stats)

#### `Player.removeGold(amount: Gold): void`

**Zweck:** Entfernt Gold.

**Parameter:**
- `amount`: Gold-Menge

#### `Player.addTroops(amount: number): void`

**Zweck:** Fügt Truppen hinzu.

**Parameter:**
- `amount`: Truppen-Menge

#### `Player.removeTroops(amount: number): void`

**Zweck:** Entfernt Truppen.

**Parameter:**
- `amount`: Truppen-Menge

### Unit-Interface Methoden

#### `Unit.id(): number`

**Zweck:** Gibt eindeutige ID zurück.

#### `Unit.type(): UnitType`

**Zweck:** Gibt UnitType zurück.

#### `Unit.owner(): Player`

**Zweck:** Gibt Besitzer zurück.

#### `Unit.tile(): TileRef`

**Zweck:** Gibt Position zurück.

#### `Unit.isActive(): boolean`

**Zweck:** Prüft, ob Unit noch existiert.

#### `Unit.level(): number`

**Zweck:** Gibt aktuelles Level zurück.

#### `Unit.increaseLevel(): void`

**Zweck:** Erhöht Level (Upgrade).

#### `Unit.decreaseLevel(destroyer?: Player): void`

**Zweck:** Verringert Level.

**Parameter:**
- `destroyer`: Spieler, der zerstört hat

#### `Unit.health(): number`

**Zweck:** Gibt Lebenspunkte zurück.

#### `Unit.modifyHealth(delta: number, attacker?: Player): void`

**Zweck:** Ändert Lebenspunkte.

**Parameter:**
- `delta`: Änderung
- `attacker`: Angreifer

#### `Unit.delete(displayMessage?: boolean, destroyer?: Player): void`

**Zweck:** Löscht Unit.

**Parameter:**
- `displayMessage`: Ob Nachricht angezeigt werden soll
- `destroyer`: Spieler, der zerstört hat

#### `Unit.move(tile: TileRef): void`

**Zweck:** Bewegt Unit.

**Parameter:**
- `tile`: Neue Position

#### `Unit.hasTrainStation(): boolean`

**Zweck:** Prüft, ob Zugstation vorhanden.

#### `Unit.setTrainStation(trainStation: boolean): void`

**Zweck:** Setzt Zugstation.

**Parameter:**
- `trainStation`: Ob Station vorhanden

### Execution-Interface Methoden

#### `Execution.init(mg: Game, ticks: number): void`

**Zweck:** Initialisiert Execution.

**Parameter:**
- `mg`: Game-Instanz
- `ticks`: Aktueller Tick

**Verhalten:**
- Wird einmal beim Start aufgerufen
- Initialisiert alle benötigten Daten

#### `Execution.tick(ticks: number): void`

**Zweck:** Führt Execution-Logik aus.

**Parameter:**
- `ticks`: Aktueller Tick

**Verhalten:**
- Wird jeden Game-Tick aufgerufen (60x pro Sekunde)
- Enthält Hauptlogik

#### `Execution.isActive(): boolean`

**Zweck:** Gibt Aktivitäts-Status zurück.

**Rückgabewert:** `true` wenn aktiv

**Verhalten:**
- Wenn `false`, wird Execution entfernt
- Wird nach jedem Tick geprüft

#### `Execution.activeDuringSpawnPhase(): boolean`

**Zweck:** Prüft, ob während Spawn-Phase aktiv.

**Rückgabewert:** `true` wenn aktiv während Spawn-Phase

**Verhalten:**
- Meist `false` für Gebäude
- `true` für Spawn-Logik

---

## Vollständige Datei-Übersicht

### Core-Modul

| Datei | Zweck | Wichtige Klassen/Interfaces |
|-------|-------|----------------------------|
| `Game.ts` | Basis-Definitionen | `Game`, `Unit`, `Player`, `Execution`, `UnitType` |
| `GameImpl.ts` | Game-Implementierung | `GameImpl`, `createGame()` |
| `UnitImpl.ts` | Unit-Implementierung | `UnitImpl` |
| `PlayerImpl.ts` | Player-Implementierung | `PlayerImpl` |
| `GameMap.ts` | Karten-System | `GameMap`, `GameMapImpl`, `TileRef` |
| `GameView.ts` | Client-View | `GameView`, `UnitView`, `PlayerView` |
| `GameUpdates.ts` | Update-System | `GameUpdateType`, `GameUpdate`, `GameUpdateViewData` |
| `RailNetwork.ts` | Rail-Interface | `RailNetwork` |
| `RailNetworkImpl.ts` | Rail-Implementierung | `RailNetworkImpl` |
| `TrainStation.ts` | Zugstation | `TrainStation`, `Cluster` |
| `Railroad.ts` | Schienenverbindung | `Railroad` |
| `Stats.ts` | Stats-Interface | `Stats` |
| `StatsImpl.ts` | Stats-Implementierung | `StatsImpl` |
| `UnitGrid.ts` | Unit-Grid | `UnitGrid` |
| `TeamAssignment.ts` | Team-Zuweisung | `assignTeams()` |
| `TerraNulliusImpl.ts` | TerraNullius | `TerraNulliusImpl` |
| `TransportShipUtils.ts` | Transport-Schiff-Utils | `canBuildTransportShip()`, `bestShoreDeploymentSource()` |
| `UserSettings.ts` | Benutzer-Einstellungen | `UserSettings` |
| `GameRunner.ts` | Game-Loop-Koordinator | `GameRunner`, `createGameRunner()` |
| `ExecutionManager.ts` | Execution-Erstellung | `Executor` |
| `AttackExecution.ts` | Angriffs-Logik | `AttackExecution` |
| `ConstructionExecution.ts` | Bau-Logik | `ConstructionExecution` |
| `PlayerExecution.ts` | Spieler-Logik | `PlayerExecution` |
| `BotExecution.ts` | Bot-KI | `BotExecution` |
| `FakeHumanExecution.ts` | NPC-KI | `FakeHumanExecution` |
| `CityExecution.ts` | Stadt-Logik | `CityExecution` |
| `FactoryExecution.ts` | Fabrik-Logik | `FactoryExecution` |
| `FarmlandExecution.ts` | Farmland-Logik | `FarmlandExecution` |
| `PortExecution.ts` | Hafen-Logik | `PortExecution` |
| `WarshipExecution.ts` | Kriegsschiff-Logik | `WarshipExecution` |
| `NukeExecution.ts` | Raketen-Logik | `NukeExecution` |
| `MIRVExecution.ts` | MIRV-Logik | `MirvExecution` |
| `TrainExecution.ts` | Zug-Logik | `TrainExecution` |
| `TradeShipExecution.ts` | Handels-Schiff-Logik | `TradeShipExecution` |
| `TransportShipExecution.ts` | Transport-Schiff-Logik | `TransportShipExecution` |
| `SAMLauncherExecution.ts` | SAM-Launcher-Logik | `SAMLauncherExecution` |
| `MissileSiloExecution.ts` | Raketensilo-Logik | `MissileSiloExecution` |
| `DefensePostExecution.ts` | Verteidigungsposten-Logik | `DefensePostExecution` |
| `WinCheckExecution.ts` | Sieg-Prüfung | `WinCheckExecution` |
| `EventBus.ts` | Event-System | `EventBus` |
| `PseudoRandom.ts` | Zufallsgenerator | `PseudoRandom` |
| `AStar.ts` | A*-Pathfinding | `AStar` |
| `MiniAStar.ts` | Mini A* | `MiniAStar` |
| `SerialAStar.ts` | Serial A* | `SerialAStar` |
| `DefaultConfig.ts` | Standard-Konfiguration | `DefaultConfig` |
| `Config.ts` | Config-Interface | `Config` |
| `ConfigLoader.ts` | Config-Loader | `getConfig()` |
| `Schemas.ts` | Zod-Schemas | Verschiedene Schemas |
| `StatsSchemas.ts` | Stats-Schemas | `PlayerStatsSchema` |
| `Util.ts` | Utilities | Verschiedene Funktionen |
| `WorkerClient.ts` | Worker-Client | `WorkerClient` |
| `Worker.worker.ts` | Web Worker | Worker-Logik |

### Client-Modul

| Datei | Zweck | Wichtige Klassen |
|-------|-------|-----------------|
| `Main.ts` | Einstiegspunkt | `Client` |
| `ClientGameRunner.ts` | Client-Game-Runner | `ClientGameRunner` |
| `InputHandler.ts` | Input-Verarbeitung | `InputHandler` |
| `Transport.ts` | WebSocket-Kommunikation | `Transport` |
| `GameRenderer.ts` | Rendering-System | `GameRenderer`, `createRenderer()` |
| `TransformHandler.ts` | Koordinaten-Transformation | `TransformHandler` |
| `UIState.ts` | UI-Zustand | `UIState` Interface |
| `TerrainLayer.ts` | Terrain-Rendering | `TerrainLayer` |
| `TerritoryLayer.ts` | Territorien-Rendering | `TerritoryLayer` |
| `StructureLayer.ts` | Gebäude-Rendering | `StructureLayer` |
| `UnitLayer.ts` | Einheiten-Rendering | `UnitLayer` |
| `UILayer.ts` | UI-Rendering | `UILayer` |
| `UnitDisplay.ts` | Gebäudeleiste | `UnitDisplay` |
| `BuildMenu.ts` | Build-Menü | `BuildMenu` |
| `Leaderboard.ts` | Bestenliste | `Leaderboard` |
| `PlayerPanel.ts` | Spieler-Panel | `PlayerPanel` |
| `ChatDisplay.ts` | Chat-Anzeige | `ChatDisplay` |
| `FxLayer.ts` | Effekt-Layer | `FxLayer` |
| `PublicLobby.ts` | Öffentliche Lobby | `PublicLobby` |
| `Matchmaking.ts` | Matchmaking | `MatchmakingModal` |
| `HostLobbyModal.ts` | Host-Lobby | `HostLobbyModal` |
| `JoinPrivateLobbyModal.ts` | Join-Lobby | `JoinPrivateLobbyModal` |
| `SinglePlayerModal.ts` | Singleplayer | `SinglePlayerModal` |
| `UserSettingModal.ts` | Einstellungen | `UserSettingModal` |
| `Utils.ts` | Client-Utilities | Verschiedene Funktionen |

### Server-Modul

| Datei | Zweck | Wichtige Klassen/Funktionen |
|-------|-------|---------------------------|
| `Server.ts` | Einstiegspunkt | `main()` |
| `Master.ts` | Master-Prozess | `startMaster()` |
| `Worker.ts` | Worker-Prozess | `startWorker()` |
| `GameManager.ts` | Spiel-Verwaltung | `GameManager` |
| `GameServer.ts` | Spiel-Instanz | `GameServer` |
| `Client.ts` | Client-Repräsentation | `Client` |
| `Archive.ts` | Archivierung | `archive()`, `finalizeGameRecord()` |

---

## Wichtige Datenstrukturen

### Turn

```typescript
export interface Turn {
  intents: Intent[];  // Intents von Clients
  tick: number;        // Turn-Tick
}
```

**Zweck:** Enthält alle Intents für einen Turn.

### Intent

```typescript
export type Intent = 
  | { type: "attack"; troops: number; targetID: PlayerID | null; }
  | { type: "build_unit"; unit: UnitType; tile: TileRef; }
  | { type: "spawn"; tile: TileRef; }
  | { type: "boat"; targetID: PlayerID; dst: TileRef; troops: number; src: TileRef | null; }
  | { type: "allianceRequest"; recipient: PlayerID; }
  | { type: "emoji"; recipient: PlayerID | "AllPlayers"; emoji: string; }
  | // ... weitere Typen
```

**Zweck:** Repräsentiert eine Spieler-Aktion.

### GameUpdateViewData

```typescript
export interface GameUpdateViewData {
  tick: number;
  updates: GameUpdates;
  packedTileUpdates: BigUint64Array;
  playerNameViewData: Record<string, NameViewData>;
  tickExecutionDuration?: number;
}
```

**Zweck:** Enthält alle Updates für einen Tick.

### PlayerActions

```typescript
export interface PlayerActions {
  canAttack: boolean;
  buildableUnits: BuildableUnit[];
  canSendEmojiAllPlayers: boolean;
  canEmbargoAll: boolean;
  interaction?: {
    sharedBorder: boolean;
    canSendEmoji: boolean;
    canTarget: boolean;
    canSendAllianceRequest: boolean;
    canBreakAlliance: boolean;
    canDonateGold: boolean;
    canDonateTroops: boolean;
    canEmbargo: boolean;
    allianceExpiresAt?: number;
  };
}
```

**Zweck:** Enthält verfügbare Aktionen für einen Spieler.

---

## Performance-Konzepte

### Delta-Updates

**Zweck:** Nur Änderungen werden gesendet.

**Vorteil:**
- Reduziert Netzwerk-Traffic
- Schnellere Updates

**Implementierung:**
- Jedes Update hat einen Typ
- Nur geänderte Objekte werden gesendet

### Packed Tile Updates

**Zweck:** Viele Tile-Updates werden gepackt.

**Implementierung:**
- `BigUint64Array` für viele Tile-Updates
- Reduziert Serialisierungs-Overhead

### Web Worker

**Zweck:** Update-Verarbeitung in separatem Thread.

**Vorteil:**
- Blockiert nicht Main-Thread
- Bessere Performance

### Layer-System

**Zweck:** Effizientes Rendering.

**Vorteil:**
- Nur geänderte Layers werden neu gezeichnet
- Klare Trennung der Verantwortlichkeiten

### UnitGrid

**Zweck:** Schnelle Unit-Suche.

**Vorteil:**
- O(1) Lookup statt O(n) Suche
- Deutlich schneller für viele Units

---

## Sicherheits-Konzepte

### Input-Validierung

- Alle Client-Inputs werden validiert
- Zod-Schemas für Type-Safety
- Server prüft alle Intents

### Desynchronisation-Erkennung

- Hash-Updates alle 10 Ticks
- Client sendet Hash zurück
- Server prüft auf Abweichungen

### Rate Limiting

- Begrenzte Requests pro Sekunde
- Verhindert Missbrauch