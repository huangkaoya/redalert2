import React from 'react';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { SoundKey } from '@/engine/sound/SoundKey';
import { ChannelType } from '@/engine/sound/ChannelType';
import { ActionType } from '@/game/action/ActionType';
import { OrderType } from '@/game/order/OrderType';
import { OrderUnitsAction } from '@/game/action/OrderUnitsAction';
import { KeyCommandType } from '@/gui/screen/game/worldInteraction/keyboard/KeyCommandType';
import { MapPanningHelper } from '@/engine/util/MapPanningHelper';
import { SelectGroupCmd } from '@/gui/screen/game/worldInteraction/keyboard/command/SelectGroupCmd';
import { CenterGroupCmd } from '@/gui/screen/game/worldInteraction/keyboard/command/CenterGroupCmd';
import { SidebarItemTargetType, SidebarCategory } from '@/gui/screen/game/component/hud/viewmodel/SidebarModel';
import { EventType } from '@/game/event/EventType';
import { SellMode } from '@/gui/screen/game/worldInteraction/SellMode';
import { LastRadarEventCmd } from '@/gui/screen/game/worldInteraction/keyboard/command/LastRadarEventCmd';
import { QueueStatus } from '@/game/player/production/ProductionQueue';
import { UpdateType } from '@/game/action/UpdateQueueAction';
import { RepairMode } from '@/gui/screen/game/worldInteraction/RepairMode';
import { TriggerMode } from '@/gui/screen/game/worldInteraction/keyboard/KeyCommand';
import { PlanningMode } from '@/gui/screen/game/worldInteraction/PlanningMode';
import { OrderFeedbackType } from '@/game/order/OrderFeedbackType';
import { SelectNextUnitCmd } from '@/gui/screen/game/worldInteraction/keyboard/command/SelectNextUnitCmd';
import { SetCameraLocationCmd } from '@/gui/screen/game/worldInteraction/keyboard/command/SetCameraLocationCmd';
import { GoToCameraLocationCmd } from '@/gui/screen/game/worldInteraction/keyboard/command/GoToCameraLocationCmd';
import { SpecialActionMode } from '@/gui/screen/game/worldInteraction/SpecialActionMode';
import { SuperWeaponStatus } from '@/game/SuperWeapon';
import { CenterViewCmd } from '@/gui/screen/game/worldInteraction/keyboard/command/CenterViewCmd';
import { FollowUnitCmd } from '@/gui/screen/game/worldInteraction/keyboard/command/FollowUnitCmd';
import { PendingPlacementHandler } from '@/gui/screen/game/worldInteraction/PendingPlacementHandler';
import { CommandBarButtonType } from '@/gui/screen/game/component/hud/commandBar/CommandBarButtonType';
import { BeaconMode } from '@/gui/screen/game/worldInteraction/BeaconMode';
import { ReportBug } from '@/gui/screen/mainMenu/main/ReportBug';
import { CenterBaseCmd } from '@/gui/screen/game/worldInteraction/keyboard/command/CenterBaseCmd';
import { SelectByTypeCmd } from '@/gui/screen/game/worldInteraction/keyboard/command/SelectTypeByCmd';
import { PlacementMode } from '@/gui/screen/game/worldInteraction/PlacementMode';
import { ObjectType } from '@/engine/type/ObjectType';

export class CombatantUi {
  private readonly disposables = new CompositeDisposable();
  private hudDisposables = new CompositeDisposable();
  private lastSelectionHash?: string;
  private placementMode?: PlacementMode;
  private pendingPlacementHandler?: PendingPlacementHandler;
  private sellMode?: SellMode;
  private repairMode?: RepairMode;
  private beaconMode?: BeaconMode;
  private planningMode?: PlanningMode;
  private specialMode?: SpecialActionMode;
  public worldInteraction?: any;

  constructor(
    private game: any,
    private player: any,
    private isSinglePlayer: boolean,
    private actionQueue: any,
    private actionFactory: any,
    private sidebarModel: any,
    private renderer: any,
    private worldScene: any,
    private soundHandler: any,
    private messageList: any,
    private sound: any,
    private eva: any,
    private worldInteractionFactory: any,
    private gameMenu: any,
    private pointer: any,
    private runtimeVars: any,
    private speedCheat: any,
    private strings: any,
    private tauntHandler: any,
    private renderableManager: any,
    private superWeaponFxHandler: any,
    private beaconFxHandler: any,
    private messageBoxApi: any,
    private discordUrl?: string,
  ) {}

  init(hud: any): void {
    const unitSelection = this.game.getUnitSelection();

    const placementMode = PlacementMode.factory(this.game, this.player, this.renderer, this.worldScene, this.eva);
    this.placementMode = placementMode;
    this.disposables.add(placementMode);

    const pendingPlacementHandler = PendingPlacementHandler.factory(
      this.game,
      this.player,
      this.renderer,
      this.worldScene,
    );
    this.pendingPlacementHandler = pendingPlacementHandler;
    pendingPlacementHandler.init();
    this.disposables.add(pendingPlacementHandler);
    placementMode.onBuildingPlaceRequest.subscribe(({ rules, tile }) => {
      pendingPlacementHandler.pushPlacementInfo({ rules, tile });
      this.pushAction(ActionType.PlaceBuilding, (action: any) => {
        action.buildingRules = rules;
        action.tile = { x: tile.rx, y: tile.ry };
      });
    });

    const sellMode = SellMode.factory(this.game, this.player, this.sidebarModel, this.pointer, this.renderer);
    this.sellMode = sellMode;
    this.disposables.add(sellMode);
    sellMode.onExecute.subscribe((gameObject) => {
      this.pushAction(ActionType.SellObject, (action: any) => {
        action.objectId = gameObject.id;
      });
    });

    const repairMode = RepairMode.factory(this.game, this.player, this.sidebarModel, this.pointer, this.renderer);
    this.repairMode = repairMode;
    this.disposables.add(repairMode);

    const beaconMode = BeaconMode.factory(this.pointer, this.renderer);
    this.beaconMode = beaconMode;
    this.disposables.add(beaconMode);
    repairMode.onExecute.subscribe((building) => {
      this.pushAction(ActionType.ToggleRepair, (action: any) => {
        action.buildingId = building.id;
      });
      this.sound.play(SoundKey.GenericClick, ChannelType.Ui);
    });
    beaconMode.onExecute.subscribe((tile) => this.handleBeacon(tile));

    const worldInteraction = this.worldInteractionFactory.create();
    this.worldInteraction = worldInteraction;
    worldInteraction.init();
    this.disposables.add(worldInteraction);

    const planningMode = new PlanningMode(
      this.player,
      this.messageList,
      this.sound,
      this.strings,
      this.worldScene,
      unitSelection,
      worldInteraction.unitSelectionHandler,
      this.renderer,
      worldInteraction.targetLines,
      this.game.rules.general.maxWaypointPathLength,
    );
    this.planningMode = planningMode;
    this.disposables.add(planningMode, () => this.specialMode?.dispose());

    placementMode.init();
    this.initKeyboardCommands(worldInteraction);
    this.initGameEventListeners();
    this.initGameMenuListeners();
    this.initHudEventListeners(hud, sellMode, repairMode, beaconMode, worldInteraction);

    this.lastSelectionHash = unitSelection.getHash();
    worldInteraction.unitSelectionHandler.onUserSelectionChange.subscribe((event: any) => {
      if (planningMode.isActive()) {
        const updatedSelection = planningMode.updateSelection(event.selection);
        if (updatedSelection) {
          for (const unit of updatedSelection) {
            unitSelection.addToSelection(unit);
          }
        }
      }

      this.lastSelectionHash = unitSelection.getHash();
      this.pushAction(ActionType.SelectUnits, (action: any) => {
        action.unitIds = unitSelection.getSelectedUnits().map((unit: any) => unit.id);
      });
    });
    worldInteraction.unitSelectionHandler.onUserSelectionUpdate.subscribe((event: any) =>
      this.soundHandler.handleSelectionChangeEvent(event),
    );
    worldInteraction.defaultActionHandler.onOrder.subscribe(
      ({ orderType, terminal, feedbackType, feedbackUnit, target }: any) => {
        if (planningMode.isActive()) {
          planningMode.pushOrder(orderType, target, terminal);
        } else {
          this.pushOrder(orderType, target, feedbackType, feedbackUnit);
        }
      },
    );

    this.disposables.add(() => this.hudDisposables.dispose());
  }

  handleHudChange(hud: any): void {
    if (this.worldInteraction && this.sellMode && this.repairMode && this.beaconMode) {
      this.initHudEventListeners(hud, this.sellMode, this.repairMode, this.beaconMode, this.worldInteraction);
    }
  }

  dispose(): void {
    this.disposables.dispose();
  }

  private initGameEventListeners(): void {
    const updateAvailableObjects = (gameObject: any) => {
      if (
        gameObject.isTechno?.() &&
        gameObject.owner === this.player &&
        (
          gameObject.isBuilding?.() ||
          Number.isFinite(gameObject.rules.buildLimit) ||
          (gameObject.isVehicle?.() && gameObject.transportTrait) ||
          this.game.rules.general.padAircraft.includes(gameObject.name)
        )
      ) {
        this.sidebarModel.updateAvailableObjects(this.game.art);
        this.soundHandler.handleAvailableObjectsUpdate?.(this.player.production.getAvailableObjects());
      }
    };

    const world = this.game.getWorld();
    this.sidebarModel.updateAvailableObjects(this.game.art);
    world.onObjectSpawned.subscribe(updateAvailableObjects);
    world.onObjectRemoved.subscribe(updateAvailableObjects);
    this.disposables.add(
      () => world.onObjectSpawned.unsubscribe(updateAvailableObjects),
      () => world.onObjectRemoved.unsubscribe(updateAvailableObjects),
    );

    this.disposables.add(
      this.game.events.subscribe(EventType.BuildingInfiltration, (event: any) => {
        if (event.source.owner === this.player) {
          this.sidebarModel.updateAvailableObjects(this.game.art);
        }
      }),
      this.game.events.subscribe(EventType.ObjectOwnerChange, (event: any) => {
        if (
          event.target.isBuilding?.() &&
          (event.prevOwner === this.player || event.target.owner === this.player)
        ) {
          this.sidebarModel.updateAvailableObjects(this.game.art);
          this.soundHandler.handleAvailableObjectsUpdate?.(this.player.production.getAvailableObjects());
        }
      }),
    );

    this.player.production.onQueueUpdate.subscribe((queue: any) => {
      this.sidebarModel.updateFromQueue(queue);
      const currentBuilding = this.placementMode?.getBuilding();
      if (
        currentBuilding &&
        !this.player.production.getQueueForObject(currentBuilding).find(currentBuilding).length
      ) {
        this.worldInteraction?.setMode(undefined);
      }
      this.soundHandler.handleProductionQueueUpdate?.(queue);
    });

    const updateSuperWeapons = (): void => {
      this.sidebarModel.updateSuperWeapons();
      if (
        this.specialMode &&
        this.worldInteraction?.getMode() === this.specialMode &&
        !this.player.superWeaponsTrait
          ?.getAll()
          .find((superWeapon: any) => superWeapon.rules.type === this.specialMode?.superWeaponType)
      ) {
        this.worldInteraction?.setMode(undefined);
        this.specialMode.dispose();
        this.specialMode = undefined;
      }
    };

    this.renderer.onFrame.subscribe(updateSuperWeapons);
    this.disposables.add(() => this.renderer.onFrame.unsubscribe(updateSuperWeapons));
    this.disposables.add(
      this.game.events.subscribe((event: any) => {
        if (event.type === EventType.PowerChange && event.target === this.player) {
          this.sidebarModel.powerGenerated = event.power;
          this.sidebarModel.powerDrained = event.drain;
        }
      }),
    );
  }

  private initGameMenuListeners(): void {
    const handleToggleAlliance = (toggle: boolean, otherPlayer: any) => {
      this.pushAction(ActionType.ToggleAlliance, (action: any) => {
        action.toPlayer = otherPlayer;
        action.toggle = toggle;
      });
    };
    this.gameMenu.onToggleAlliance.subscribe(handleToggleAlliance);
    this.disposables.add(() => this.gameMenu.onToggleAlliance.unsubscribe(handleToggleAlliance));
  }

  private initHudEventListeners(
    hud: any,
    sellMode: SellMode,
    repairMode: RepairMode,
    beaconMode: BeaconMode,
    worldInteraction: any,
  ): void {
    this.hudDisposables.dispose();
    this.hudDisposables = new CompositeDisposable();

    const onSidebarSlotClick = (event: any) => this.handleSidebarSlotClick(event);
    const onSidebarTabClick = () => this.sound.play(SoundKey.GUITabSound, ChannelType.Ui);
    const onRepairButtonClick = () => {
      if (worldInteraction.isEnabled()) {
        worldInteraction.setMode(this.sidebarModel.repairMode ? undefined : repairMode);
        this.sound.play(SoundKey.GenericClick, ChannelType.Ui);
      }
    };
    const onSellButtonClick = () => {
      if (worldInteraction.isEnabled()) {
        worldInteraction.setMode(this.sidebarModel.sellMode ? undefined : sellMode);
        this.sound.play(SoundKey.GenericClick, ChannelType.Ui);
      }
    };

    hud.onSidebarSlotClick.subscribe(onSidebarSlotClick);
    hud.onSidebarTabClick.subscribe(onSidebarTabClick);
    hud.onRepairButtonClick.subscribe(onRepairButtonClick);
    hud.onSellButtonClick.subscribe(onSellButtonClick);
    this.hudDisposables.add(
      () => hud.onSidebarSlotClick.unsubscribe(onSidebarSlotClick),
      () => hud.onSidebarTabClick.unsubscribe(onSidebarTabClick),
      () => hud.onRepairButtonClick.unsubscribe(onRepairButtonClick),
      () => hud.onSellButtonClick.unsubscribe(onSellButtonClick),
    );

    const creditTickSounds = this.game.rules.audioVisual.creditTicks;
    const onCreditsTick = (direction: any) => {
      this.sound.play(direction === 'up' ? creditTickSounds[0] : creditTickSounds[1], ChannelType.CreditTicks);
    };
    const onMessagesTick = () => this.sound.play(SoundKey.MessageCharTyped, ChannelType.Ui);
    const onScrollButtonClick = (enabled: boolean) => {
      this.sound.play(enabled ? SoundKey.GenericClick : SoundKey.ScoldSound, ChannelType.Ui);
    };

    hud.onCreditsTick.subscribe(onCreditsTick);
    hud.onMessagesTick.subscribe(onMessagesTick);
    hud.onScrollButtonClick.subscribe(onScrollButtonClick);
    this.hudDisposables.add(
      () => hud.onCreditsTick.unsubscribe(onCreditsTick),
      () => hud.onMessagesTick.unsubscribe(onMessagesTick),
      () => hud.onScrollButtonClick.unsubscribe(onScrollButtonClick),
    );

    let hasShownPlanningModeIntro = false;
    const unitSelectionHandler = worldInteraction.unitSelectionHandler;
    const onCommandBarButtonClick = (buttonType: CommandBarButtonType) => {
      switch (buttonType) {
        case CommandBarButtonType.BugReport:
          if (!this.discordUrl) {
            break;
          }
          this.gameMenu.open();
          this.messageBoxApi.show(
            React.createElement(ReportBug, { discordUrl: this.discordUrl, strings: this.strings }),
            this.strings.get('GUI:OK'),
          );
          break;
        case CommandBarButtonType.Beacon:
          if (worldInteraction.getMode() !== beaconMode) {
            worldInteraction.setMode(beaconMode);
          }
          break;
        case CommandBarButtonType.Cheer:
          this.pushOrder(OrderType.Cheer, undefined);
          break;
        case CommandBarButtonType.Deploy:
          this.handleDeploy();
          break;
        case CommandBarButtonType.Guard:
          this.handleGuard();
          break;
        case CommandBarButtonType.PlanningMode:
          if (!this.planningMode) {
            break;
          }
          if (this.planningMode.isActive()) {
            const queuedPaths = this.planningMode.exit();
            this.sound.play(SoundKey.EndPlanningModeSound, ChannelType.Ui);
            this.queueOrders(queuedPaths);
            if (!hasShownPlanningModeIntro) {
              this.messageList.addUiFeedbackMessage(this.strings.get('MSG:PlanningModeIntro3'));
              hasShownPlanningModeIntro = true;
            }
          } else {
            this.planningMode.enter();
            this.planningMode.updateSelection(worldInteraction.unitSelectionHandler.getSelectedUnits());
            this.sound.play(SoundKey.StartPlanningModeSound, ChannelType.Ui);
            if (!hasShownPlanningModeIntro) {
              this.messageList.addUiFeedbackMessage(this.strings.get('MSG:PlanningModeIntro1Button'));
            }
          }
          break;
        case CommandBarButtonType.Stop:
          this.handleStop();
          break;
        case CommandBarButtonType.Team01:
          this.handleCommandBarTeam(1, unitSelectionHandler);
          break;
        case CommandBarButtonType.Team02:
          this.handleCommandBarTeam(2, unitSelectionHandler);
          break;
        case CommandBarButtonType.Team03:
          this.handleCommandBarTeam(3, unitSelectionHandler);
          break;
        case CommandBarButtonType.TypeSelect:
          unitSelectionHandler.selectByType();
          break;
        default:
          console.warn(`[CombatantUi] Unhandled command bar button ${buttonType}`);
      }
    };

    hud.onCommandBarButtonClick.subscribe(onCommandBarButtonClick);
    this.hudDisposables.add(() => hud.onCommandBarButtonClick.unsubscribe(onCommandBarButtonClick));
  }

  private handleSidebarSlotClick(rawEvent: any): void {
    if (!this.worldInteraction?.isEnabled()) {
      return;
    }

    const event =
      rawEvent.isTouch && rawEvent.button === 0 && rawEvent.touchDuration && rawEvent.touchDuration > 300
        ? { ...rawEvent, shiftKey: true, button: 2 }
        : rawEvent;

    if (event.target.type !== SidebarItemTargetType.Special) {
      const rules = event.target.rules;
      const queue = this.player.production.getQueueForObject(rules);
      const entries = queue.find(rules);
      const queuedQuantity = entries.reduce((sum: number, item: any) => sum + item.quantity, 0);
      let rejected = false;

      if (event.button === 0) {
        if (queue.status === QueueStatus.Ready && rules.type === ObjectType.Building) {
          if (entries[0] === queue.getFirst()) {
            this.placementMode?.setBuilding(rules);
            this.worldInteraction?.setMode(this.placementMode);
          } else {
            this.eva.play('EVA_UnableToComply');
          }
        } else if (queue.status === QueueStatus.OnHold && entries[0] === queue.getFirst()) {
          this.pushAction(ActionType.UpdateQueue, (action: any) => {
            action.queueType = queue.type;
            action.updateType = UpdateType.Resume;
          });
        } else {
          const maxQuantity = Math.min(queue.maxSize - queue.currentSize, queue.maxItemQuantity - queuedQuantity);
          const quantity = Math.min(event.shiftKey ? 5 : 1, maxQuantity);
          if (quantity <= 0) {
            if (rules.type === ObjectType.Building) {
              this.eva.play('EVA_UnableToComply');
            } else {
              rejected = true;
              this.sound.play(SoundKey.ScoldSound, ChannelType.Ui);
            }
          } else {
            const ctrlPressed = this.worldInteraction.getLastKeyModifiers()?.ctrlKey ?? false;
            this.pushAction(ActionType.UpdateQueue, (action: any) => {
              action.queueType = queue.type;
              action.updateType = ctrlPressed ? UpdateType.AddNext : UpdateType.Add;
              action.item = rules;
              action.quantity = quantity;
            });
          }
        }
      } else if (event.button === 2) {
        if (queue.status === QueueStatus.Active && entries[0] === queue.getFirst()) {
          this.pushAction(ActionType.UpdateQueue, (action: any) => {
            action.queueType = queue.type;
            action.updateType = UpdateType.Pause;
          });
        } else if (entries.length && [QueueStatus.Ready, QueueStatus.OnHold, QueueStatus.Active].includes(queue.status)) {
          const quantity = Math.min(queuedQuantity, event.shiftKey ? Number.POSITIVE_INFINITY : 1);
          if (quantity > 0) {
            this.pushAction(ActionType.UpdateQueue, (action: any) => {
              action.queueType = queue.type;
              action.updateType = UpdateType.Cancel;
              action.item = rules;
              action.quantity = quantity;
            });
            this.eva.play('EVA_Canceled');
          }
        } else {
          rejected = true;
        }
      } else {
        return;
      }

      if (!rejected) {
        this.sound.play(SoundKey.GenericClick, ChannelType.Ui);
      }
      return;
    }

    if (event.button !== 0) {
      return;
    }

    this.sound.play(SoundKey.GenericClick, ChannelType.Ui);
    if (
      this.player.superWeaponsTrait?.getAll().find((superWeapon: any) => superWeapon.rules === event.target.rules)?.status !==
      SuperWeaponStatus.Ready
    ) {
      return;
    }

    if (event.target.rules.type !== undefined) {
      this.activateSpecialMode(event.target.rules);
    }
  }

  private pushOrder(
    orderType: OrderType,
    target: any,
    feedbackType: OrderFeedbackType = OrderFeedbackType.None,
    feedbackUnit: any = undefined,
  ): void {
    const unitSelection = this.game.getUnitSelection();
    const selectionHash = unitSelection.getHash();
    const selectedUnits = unitSelection.getSelectedUnits();
    const lastAction = this.actionQueue.getLast() as any;

    if (
      lastAction &&
      lastAction instanceof OrderUnitsAction &&
      lastAction.orderType === orderType &&
      !lastAction.queue &&
      selectionHash === this.lastSelectionHash
    ) {
      if (!lastAction.target || !target || lastAction.target.equals(target)) {
        return;
      }
      this.actionQueue.dequeueLast();
    }

    if (selectionHash !== this.lastSelectionHash) {
      this.lastSelectionHash = selectionHash;
      this.pushAction(ActionType.SelectUnits, (action: any) => {
        action.unitIds = selectedUnits.map((unit: any) => unit.id);
      });
    }

    this.pushAction(ActionType.OrderUnits, (action: any) => {
      action.orderType = orderType;
      action.target = target;
    });
    this.soundHandler.handleOrderPushed(feedbackUnit || selectedUnits[0], orderType, feedbackType);
  }

  private queueOrders(paths: any[]): void {
    if (!paths.length) {
      return;
    }

    for (const path of paths) {
      this.pushAction(ActionType.SelectUnits, (action: any) => {
        action.unitIds = [...path.units].map((unit: any) => unit.id);
      });
      for (const waypoint of path.waypoints) {
        this.pushAction(ActionType.OrderUnits, (action: any) => {
          action.orderType = waypoint.orderType;
          action.target = waypoint.target;
          action.queue = true;
        });
      }
    }

    this.pushAction(ActionType.SelectUnits, (action: any) => {
      action.unitIds = this.worldInteraction.unitSelectionHandler.getSelectedUnits().map((unit: any) => unit.id);
    });
  }

  private pushAction(actionType: ActionType, configure?: (action: any) => void): void {
    const action = this.actionFactory.create(actionType);
    action.player = this.player;
    configure?.(action);
    this.actionQueue.push(action);
  }

  private activateSpecialMode(superWeaponRules: any): void {
    this.specialMode?.dispose();
    const specialMode = SpecialActionMode.factory(
      this.game.rules.superWeaponRules,
      superWeaponRules,
      this.superWeaponFxHandler,
      this.pointer,
      this.eva,
    );
    this.specialMode = specialMode;
    specialMode.onExecute.subscribe(({ tile, tile2 }) => {
      this.pushAction(ActionType.ActivateSuperWeapon, (action: any) => {
        action.superWeaponType = superWeaponRules.type;
        action.tile = { x: tile.rx, y: tile.ry };
        if (tile2) {
          action.tile2 = { x: tile2.rx, y: tile2.ry };
        }
      });
    });
    this.worldInteraction?.setMode(specialMode);
  }

  private initKeyboardCommands(worldInteraction: any): void {
    const unitSelectionHandler = worldInteraction.unitSelectionHandler;
    const selectByTypeCmd = new SelectByTypeCmd(unitSelectionHandler);
    selectByTypeCmd.init();
    this.disposables.add(selectByTypeCmd);

    worldInteraction
      .registerKeyCommand(KeyCommandType.Options, () => this.gameMenu.open())
      .registerKeyCommand(KeyCommandType.Scoreboard, () => this.gameMenu.openDiplo())
      .registerKeyCommand(KeyCommandType.DeployObject, () => this.handleDeploy())
      .registerKeyCommand(KeyCommandType.StopObject, () => this.handleStop())
      .registerKeyCommand(KeyCommandType.GuardObject, () => this.handleGuard())
      .registerKeyCommand(KeyCommandType.AllToCheer, () => this.pushOrder(OrderType.Cheer, undefined))
      .registerKeyCommand(KeyCommandType.TypeSelect, selectByTypeCmd)
      .registerKeyCommand(KeyCommandType.CombatantSelect, () => unitSelectionHandler.selectCombatants())
      .registerKeyCommand(KeyCommandType.VeterancyNav, () => unitSelectionHandler.selectByVeterancy())
      .registerKeyCommand(KeyCommandType.HealthNav, () => unitSelectionHandler.selectByHealth());

    [
      KeyCommandType.TeamCreate_1,
      KeyCommandType.TeamCreate_2,
      KeyCommandType.TeamCreate_3,
      KeyCommandType.TeamCreate_4,
      KeyCommandType.TeamCreate_5,
      KeyCommandType.TeamCreate_6,
      KeyCommandType.TeamCreate_7,
      KeyCommandType.TeamCreate_8,
      KeyCommandType.TeamCreate_9,
      KeyCommandType.TeamCreate_10,
    ].forEach((commandType, index) => {
      worldInteraction.registerKeyCommand(commandType, () => unitSelectionHandler.createGroup((index + 1) % 10));
    });

    [
      KeyCommandType.TeamAddSelect_1,
      KeyCommandType.TeamAddSelect_2,
      KeyCommandType.TeamAddSelect_3,
      KeyCommandType.TeamAddSelect_4,
      KeyCommandType.TeamAddSelect_5,
      KeyCommandType.TeamAddSelect_6,
      KeyCommandType.TeamAddSelect_7,
      KeyCommandType.TeamAddSelect_8,
      KeyCommandType.TeamAddSelect_9,
      KeyCommandType.TeamAddSelect_10,
    ].forEach((commandType, index) => {
      worldInteraction.registerKeyCommand(commandType, () => unitSelectionHandler.addGroupToSelection((index + 1) % 10));
    });

    const mapPanningHelper = new MapPanningHelper(this.game.map);

    [
      KeyCommandType.TeamSelect_1,
      KeyCommandType.TeamSelect_2,
      KeyCommandType.TeamSelect_3,
      KeyCommandType.TeamSelect_4,
      KeyCommandType.TeamSelect_5,
      KeyCommandType.TeamSelect_6,
      KeyCommandType.TeamSelect_7,
      KeyCommandType.TeamSelect_8,
      KeyCommandType.TeamSelect_9,
      KeyCommandType.TeamSelect_10,
    ].forEach((commandType, index) => {
      worldInteraction.registerKeyCommand(
        commandType,
        new SelectGroupCmd((index + 1) % 10, unitSelectionHandler, worldInteraction.targetLines, mapPanningHelper, this.worldScene.cameraPan),
      );
    });

    [
      KeyCommandType.TeamCenter_1,
      KeyCommandType.TeamCenter_2,
      KeyCommandType.TeamCenter_3,
      KeyCommandType.TeamCenter_4,
      KeyCommandType.TeamCenter_5,
      KeyCommandType.TeamCenter_6,
      KeyCommandType.TeamCenter_7,
      KeyCommandType.TeamCenter_8,
      KeyCommandType.TeamCenter_9,
      KeyCommandType.TeamCenter_10,
    ].forEach((commandType, index) => {
      worldInteraction.registerKeyCommand(
        commandType,
        new CenterGroupCmd((index + 1) % 10, unitSelectionHandler, mapPanningHelper, this.worldScene.cameraPan),
      );
    });

    new Map([
      [KeyCommandType.StructureTab, SidebarCategory.Structures],
      [KeyCommandType.DefenseTab, SidebarCategory.Armory],
      [KeyCommandType.InfantryTab, SidebarCategory.Infantry],
      [KeyCommandType.UnitTab, SidebarCategory.Vehicles],
    ]).forEach((tabId, commandType) => {
      worldInteraction.registerKeyCommand(commandType, () => {
        this.sidebarModel.selectTab(tabId);
        for (const queue of this.player.production.getAllQueues().filter((queue: any) => queue.status === QueueStatus.Ready)) {
          const tab = this.sidebarModel.getTabForQueueType(queue.type);
          if (tabId === tab.id && queue.getFirst().rules.type === ObjectType.Building) {
            this.placementMode?.setBuilding(queue.getFirst().rules);
            worldInteraction.setMode(this.placementMode);
            break;
          }
        }
      });
    });

    worldInteraction.registerKeyCommand(
      KeyCommandType.CenterBase,
      new CenterBaseCmd(this.player, this.game.rules, mapPanningHelper, this.worldScene.cameraPan),
    );
    worldInteraction.registerKeyCommand(KeyCommandType.ToggleSell, () => {
      worldInteraction.setMode(this.sidebarModel.sellMode ? undefined : this.sellMode);
    });
    worldInteraction.registerKeyCommand(KeyCommandType.ToggleRepair, () => {
      worldInteraction.setMode(this.sidebarModel.repairMode ? undefined : this.repairMode);
    });

    const lastRadarEventCmd = new LastRadarEventCmd(this.player, mapPanningHelper, this.worldScene.cameraPan);
    worldInteraction.registerKeyCommand(KeyCommandType.CenterOnRadarEvent, lastRadarEventCmd);
    this.disposables.add(this.game.events.subscribe((event: any) => lastRadarEventCmd.handleGameEvent(event)));

    const syncCheatCommands = () => {
      if (this.runtimeVars.cheatsEnabled.value) {
        worldInteraction
          .registerKeyCommand(KeyCommandType.BuildCheat, () => (this.speedCheat.value = !this.speedCheat.value))
          .registerKeyCommand(KeyCommandType.FreeMoney, () => (this.player.credits += 10000))
          .registerKeyCommand(KeyCommandType.ToggleShroud, () => this.game.mapShroudTrait.revealMap(this.player, this.game));
      } else {
        worldInteraction
          .unregisterKeyCommand(KeyCommandType.BuildCheat)
          .unregisterKeyCommand(KeyCommandType.FreeMoney)
          .unregisterKeyCommand(KeyCommandType.ToggleShroud);
        this.speedCheat.value = false;
      }
    };
    syncCheatCommands();
    this.runtimeVars.cheatsEnabled.onChange.subscribe(syncCheatCommands);
    this.disposables.add(() => this.runtimeVars.cheatsEnabled.onChange.unsubscribe(syncCheatCommands));

    worldInteraction.registerKeyCommand(KeyCommandType.ToggleFps, () => {
      this.runtimeVars.fps.value = !this.runtimeVars.fps.value;
    });
    worldInteraction.registerKeyCommand(KeyCommandType.ToggleAlliance, () => {
      const settings = this.game.rules.mpDialogSettings;
      if (!settings.alliesAllowed || !settings.allyChangeAllowed) {
        return;
      }

      const targetPlayer = unitSelectionHandler.getSelectedUnits()[0]?.owner;
      if (
        targetPlayer &&
        targetPlayer !== this.player &&
        this.game.alliances.canRequestAlliance(targetPlayer)
      ) {
        this.pushAction(ActionType.ToggleAlliance, (action: any) => {
          action.toPlayer = targetPlayer;
          action.toggle = !this.game.alliances.areAllied(this.player, targetPlayer);
        });
      }
    });

    let hasShownPlanningModeKeyIntro = false;
    worldInteraction.registerKeyCommand(KeyCommandType.PlanningMode, {
      triggerMode: TriggerMode.KeyDownUp,
      execute: (isKeyUp: boolean) => {
        if (!this.planningMode) {
          return;
        }

        if (isKeyUp) {
          const queuedPaths = this.planningMode.exit();
          this.sound.play(SoundKey.EndPlanningModeSound, ChannelType.Ui);
          this.queueOrders(queuedPaths);
          if (!hasShownPlanningModeKeyIntro) {
            this.messageList.addUiFeedbackMessage(this.strings.get('MSG:PlanningModeIntro3'));
            hasShownPlanningModeKeyIntro = true;
          }
        } else {
          this.planningMode.enter();
          this.planningMode.updateSelection(worldInteraction.unitSelectionHandler.getSelectedUnits());
          this.sound.play(SoundKey.StartPlanningModeSound, ChannelType.Ui);
          if (!hasShownPlanningModeKeyIntro) {
            this.messageList.addUiFeedbackMessage(this.strings.get('MSG:PlanningModeIntro1Key'));
          }
        }
      },
    });
    worldInteraction.registerKeyCommand(KeyCommandType.ScatterObject, () => {
      if (this.planningMode?.isActive()) {
        this.handleInvalidCommand(this.strings.get('MSG:PlanningModeNoScatter'));
      } else {
        this.pushOrder(OrderType.Scatter, undefined);
      }
    });

    const selectNextUnitCmd = new SelectNextUnitCmd(
      unitSelectionHandler,
      mapPanningHelper,
      this.worldScene.cameraPan,
      this.player,
      this.game.getWorld(),
    );
    worldInteraction.registerKeyCommand(KeyCommandType.NextObject, () => {
      selectNextUnitCmd.setReverse(false);
      selectNextUnitCmd.execute();
    });
    worldInteraction.registerKeyCommand(KeyCommandType.PreviousObject, () => {
      selectNextUnitCmd.setReverse(true);
      selectNextUnitCmd.execute();
    });
    this.disposables.add(selectNextUnitCmd);

    const startLocation = this.game.map.startingLocations[this.player.startLocation];
    const startTile = this.game.map.tiles.getByMapCoords(startLocation.x, startLocation.y);
    const defaultCameraLocation = startTile
      ? mapPanningHelper.computeCameraPanFromTile(startTile.rx, startTile.ry)
      : this.worldScene.cameraPan.getPan();
    const cameraLocations = new Map();
    [
      KeyCommandType.SetView1,
      KeyCommandType.SetView2,
      KeyCommandType.SetView3,
      KeyCommandType.SetView4,
    ].forEach((commandType, index) => {
      worldInteraction.registerKeyCommand(commandType, new SetCameraLocationCmd(this.worldScene.cameraPan, cameraLocations, index));
    });
    [
      KeyCommandType.View1,
      KeyCommandType.View2,
      KeyCommandType.View3,
      KeyCommandType.View4,
    ].forEach((commandType, index) => {
      worldInteraction.registerKeyCommand(
        commandType,
        new GoToCameraLocationCmd(this.worldScene.cameraPan, cameraLocations, index, defaultCameraLocation),
      );
    });

    [
      KeyCommandType.Taunt_1,
      KeyCommandType.Taunt_2,
      KeyCommandType.Taunt_3,
      KeyCommandType.Taunt_4,
      KeyCommandType.Taunt_5,
      KeyCommandType.Taunt_6,
      KeyCommandType.Taunt_7,
      KeyCommandType.Taunt_8,
    ].forEach((commandType, index) => {
      worldInteraction.registerKeyCommand(commandType, () => this.tauntHandler?.sendTaunt(index + 1));
    });
    worldInteraction.registerKeyCommand(KeyCommandType.PlaceBeacon, () => {
      if (worldInteraction.getMode() !== this.beaconMode) {
        worldInteraction.setMode(this.beaconMode);
      }
    });

    const centerViewCmd = new CenterViewCmd(unitSelectionHandler, mapPanningHelper, this.worldScene.cameraPan);
    worldInteraction.registerKeyCommand(KeyCommandType.CenterView, centerViewCmd);

    const followUnitCmd = new FollowUnitCmd(
      unitSelectionHandler,
      this.renderableManager,
      worldInteraction,
      mapPanningHelper,
      this.worldScene.cameraPan,
      this.worldScene,
    );
    followUnitCmd.init();
    this.disposables.add(followUnitCmd);
    worldInteraction.registerKeyCommand(KeyCommandType.Follow, followUnitCmd);

    const playErrorSound = () => this.sound.play(SoundKey.SystemError, ChannelType.Ui);
    [KeyCommandType.PageUser, KeyCommandType.ScreenCapture].forEach((commandType) =>
      worldInteraction.registerKeyCommand(commandType, playErrorSound),
    );
  }

  private handleDeploy(): void {
    if (this.planningMode?.isActive()) {
      this.handleInvalidCommand(this.strings.get('MSG:PlanningModeNoDeploy'));
    } else {
      this.pushOrder(OrderType.DeploySelected, undefined);
    }
  }

  private handleStop(): void {
    if (this.planningMode?.isActive()) {
      this.handleInvalidCommand(this.strings.get('MSG:PlanningModeNoStop'));
    } else {
      this.pushOrder(OrderType.Stop, undefined);
    }
  }

  private handleGuard(): void {
    if (this.planningMode?.isActive()) {
      this.handleInvalidCommand(this.strings.get('MSG:PlanningModeNoGuardArea'));
    } else {
      this.pushOrder(OrderType.Guard, undefined);
    }
  }

  private handleBeacon(tile: any): void {
    if (this.isSinglePlayer) {
      return;
    }

    if (this.beaconFxHandler.canPingLocation(this.player, tile)) {
      this.pushAction(ActionType.PingLocation, (action: any) => {
        action.tile = { x: tile.rx, y: tile.ry };
      });
    }
  }

  private handleCommandBarTeam(team: number, unitSelectionHandler: any): void {
    const groupUnits = unitSelectionHandler.getGroupUnits(team);
    if (!groupUnits.length) {
      unitSelectionHandler.createGroup(team);
      return;
    }

    if (unitSelectionHandler.getSelectedUnits().some((unit: any) => groupUnits.includes(unit))) {
      new CenterGroupCmd(team, unitSelectionHandler, new MapPanningHelper(this.game.map), this.worldScene.cameraPan).execute();
    } else {
      unitSelectionHandler.selectGroup(team);
    }
  }

  private handleInvalidCommand(message: string): void {
    this.sound.play(SoundKey.ScoldSound, ChannelType.Ui);
    this.messageList.addUiFeedbackMessage(message);
  }
}
