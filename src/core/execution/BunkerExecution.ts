import { Execution, Game, Gold, Player, Unit, UnitType } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { TrainStationExecution } from "./TrainStationExecution";

export class BunkerExecution implements Execution {
  private unit: Unit | null = null;
  private active: boolean = true;
  private game: Game;

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
      const spawnTile = this.player.canBuild(UnitType.Bunker, this.tile);
      if (spawnTile === false) {
        console.warn("cannot build Bunker");
        this.active = false;
        return;
      }
      this.unit = this.player.buildUnit(UnitType.Bunker, spawnTile, {});
      // Weitere Initialisierung nach dem Bauen
    }
    
    if (!this.unit.isActive()) {
      this.active = false;
      return;
    }

    if (this.player !== this.unit.owner()) {
      this.player = this.unit.owner();
    }

  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}