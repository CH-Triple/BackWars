import { Execution, Game, Gold, Player, Unit, UnitType } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { TrainStationExecution } from "./TrainStationExecution";

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
    // Set initial random interval
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
    if (!this.farmland) {
      const spawnTile = this.player.canBuild(UnitType.Farmland, this.tile);
      if (spawnTile === false) {
        console.warn("cannot build farmland");
        this.active = false;
        return;
      }
      this.farmland = this.player.buildUnit(UnitType.Farmland, spawnTile, {});
      this.createStation();
      // Set initial interval when farmland is built
      this.setNextGoldInterval();
      this.lastGoldGeneration = ticks;
    }
    if (!this.farmland.isActive()) {
      this.active = false;
      return;
    }

    if (this.player !== this.farmland.owner()) {
      this.player = this.farmland.owner();
    }

    // Generate gold every 160-330 ticks
    if (!this.game) return;
    const ticksSinceLastGold = ticks - this.lastGoldGeneration;
    if (ticksSinceLastGold >= this.ticksUntilGold) {
      let goldAmount = this.game.config().farmlandGoldAmount();
      
      // Multiply by level (1 level = 1 farm)
      const level = this.farmland.level();
      goldAmount = goldAmount * BigInt(level);
      
      // 50% boost if connected to rails (has train station)
      // Use rail network to check for station, which is more robust for stacked buildings
      const hasStation = this.farmland.hasTrainStation() || 
                         this.game.railNetwork().findStation(this.farmland) !== null;
      if (hasStation) {
        goldAmount = (goldAmount * 15n) / 10n;// 50% boost = 1.5x
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
      // Farmland soll sich nur über Factorys mit Rails verbinden
      // Prüfe ob eine Factory in der Nähe ist
      const nearbyFactories = this.game.nearbyUnits(
        this.farmland.tile()!,
        this.game.config().trainStationMaxRange(),
        [UnitType.Factory],
      );

      // Nur Station erstellen wenn eine Factory in der Nähe ist
      if (nearbyFactories.length > 0) {
        this.game.addExecution(new TrainStationExecution(this.farmland, false));
      }
      // Farmland erstellt keine Stationen für andere Strukturen
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}

