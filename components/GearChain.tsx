'use client';

import React, { useEffect, useState } from 'react';
import { useUserStore } from '@/lib/useUserStore';
import { GearService, GearItem } from '@/lib/gearService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Settings,
  Guitar,
  Volume2,
  Trash2,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DropAnimation,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GearChainProps {
  lessonMode: boolean;
  studioBrainResponse?: string;
  onGearUpdate?: (chain: GearItem[]) => void;
}

// Sortable Item Component
function SortableGearItem({
  item,
  index,
  lessonMode,
  onRemove,
  getGearIcon,
  getGearColor,
}: {
  item: GearItem;
  index: number;
  lessonMode: boolean;
  onRemove: (id: string) => void;
  getGearIcon: (type: GearItem['type']) => React.ReactNode;
  getGearColor: (type: GearItem['type']) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    // Override the default transition to be more controlled
    transition: isDragging
      ? 'none'
      : 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dnd-kit-sortable
      className={`flex items-center gap-4 p-3 rounded-lg border ${
        isDragging
          ? 'is-dragging opacity-50 z-50 scale-105'
          : 'bg-white/10 border-white/20 hover:border-white/40 hover:scale-[1.02] transition-all duration-200 ease-out'
      }`}
      {...attributes}
    >
      <div
        {...listeners}
        className="drag-handle cursor-grab active:cursor-grabbing hover:text-white transition-colors"
      >
        <GripVertical className="w-4 h-4 text-slate-400 hover:text-slate-200" />
      </div>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${lessonMode ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-neon-purple/20 text-neon-purple'}`}
      >
        {index + 1}
      </div>
      <div className="flex-1">
        <Badge
          variant="outline"
          className={`${getGearColor(item.type)} border rounded-lg px-3 py-2 text-sm font-medium`}
        >
          <span className="flex items-center gap-2">
            {getGearIcon(item.type)}
            {item.name}
          </span>
        </Badge>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onRemove(item.id)}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

// Drag Overlay Component
function DragOverlayContent({
  item,
  lessonMode,
  getGearIcon,
  getGearColor,
}: {
  item: GearItem;
  lessonMode: boolean;
  getGearIcon: (type: GearItem['type']) => React.ReactNode;
  getGearColor: (type: GearItem['type']) => string;
}) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-slate-800/95 backdrop-blur-xl border-neon-blue/50 shadow-2xl shadow-neon-blue/30 scale-105 rotate-2">
      <GripVertical className="w-4 h-4 text-slate-200" />
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${lessonMode ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-neon-purple/20 text-neon-purple'}`}
      >
        ?
      </div>
      <div className="flex-1">
        <Badge
          variant="outline"
          className={`${getGearColor(item.type)} border rounded-lg px-3 py-2 text-sm font-medium`}
        >
          <span className="flex items-center gap-2">
            {getGearIcon(item.type)}
            {item.name}
          </span>
        </Badge>
      </div>
    </div>
  );
}

export default function GearChain({
  lessonMode,
  studioBrainResponse,
  onGearUpdate,
}: GearChainProps) {
  const { gearChains, gear, set } = useUserStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4, // Reduced from 8px to 4px for more responsive drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom drop animation to prevent horizontal sliding
  const dropAnimation: DropAnimation = {
    duration: 200,
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
    // Simplified approach - no custom side effects to avoid crashes
  };

  // Update StudioBrain chain when response changes
  useEffect(() => {
    if (studioBrainResponse) {
      const suggestions =
        GearService.extractGearFromResponse(studioBrainResponse);
      const gearItems = GearService.suggestionsToGearItems(suggestions);

      if (gearItems.length > 0) {
        // Use functional update to avoid stale closure issues
        set(currentState => {
          // Check if the gear items are actually different to prevent unnecessary updates
          const currentChain = currentState.gearChains.studioBrainChain;
          const isSameChain =
            currentChain.length === gearItems.length &&
            currentChain.every(
              (item, index) => item.name === gearItems[index]?.name
            );

          if (isSameChain) {
            return currentState; // No change needed
          }

          const updatedGearChains = {
            ...currentState.gearChains,
            studioBrainChain: gearItems,
          };

          // Call onGearUpdate if this mode is selected
          if (
            currentState.gearChains.selectedMode === 'studiobrainSuggestion'
          ) {
            // Use setTimeout to avoid calling during render
            setTimeout(() => onGearUpdate?.(gearItems), 0);
          }

          return { ...currentState, gearChains: updatedGearChains };
        });
      }
    }
  }, [studioBrainResponse, set, onGearUpdate]);

  // Initialize custom chain from user gear if empty
  useEffect(() => {
    // Use functional update to get current state and avoid dependency on gearChains
    set(currentState => {
      const { gearChains: currentGearChains } = currentState;
      const { guitar, pedals } = currentState.gear;

      // Only update if custom chain is empty and we have gear to add
      if (
        currentGearChains.customChain.length === 0 &&
        (guitar.length > 0 || pedals.length > 0)
      ) {
        const customChain = GearService.createCustomChainFromUserGear(
          guitar,
          pedals
        );
        const updatedGearChains = {
          ...currentGearChains,
          customChain,
        };
        return { ...currentState, gearChains: updatedGearChains };
      }

      return currentState; // No change needed
    });
  }, [set]); // Only depend on set function, get current state from within the update

  const handleModeToggle = (mode: 'studiobrainSuggestion' | 'customChain') => {
    set(currentState => {
      const updatedGearChains = {
        ...currentState.gearChains,
        selectedMode: mode,
      };

      // Update parent component with active chain
      const activeChain =
        mode === 'studiobrainSuggestion'
          ? currentState.gearChains.studioBrainChain
          : currentState.gearChains.customChain;

      // Use setTimeout to avoid calling during render
      setTimeout(() => onGearUpdate?.(activeChain), 0);

      return { ...currentState, gearChains: updatedGearChains };
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    try {
      setActiveId(event.active.id as string);
    } catch (error) {
      console.error('Drag start error:', error);
      setActiveId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    try {
      const { active, over } = event;

      // Clear active ID after a small delay to ensure smooth drop animation
      setTimeout(() => setActiveId(null), 150);

      if (!over || active.id === over.id) {
        return;
      }

      set(currentState => {
        if (currentState.gearChains.selectedMode !== 'customChain') {
          return currentState;
        }

        const oldIndex = currentState.gearChains.customChain.findIndex(
          item => item.id === active.id
        );
        const newIndex = currentState.gearChains.customChain.findIndex(
          item => item.id === over.id
        );

        // Safety check to ensure both indices are valid
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reorderedItems = arrayMove(
            currentState.gearChains.customChain,
            oldIndex,
            newIndex
          ).map((item, index) => ({
            ...item,
            order: index,
          }));

          const updatedGearChains = {
            ...currentState.gearChains,
            customChain: reorderedItems,
          };

          // Use setTimeout to avoid calling during render
          setTimeout(() => onGearUpdate?.(reorderedItems), 0);

          return { ...currentState, gearChains: updatedGearChains };
        }

        return currentState;
      });
    } catch (error) {
      console.error('Drag end error:', error);
      // Ensure we clear the active ID even if there's an error
      setActiveId(null);
    }
  };

  const removeFromCustomChain = (itemId: string) => {
    set(currentState => {
      const updatedCustomChain = currentState.gearChains.customChain.filter(
        item => item.id !== itemId
      );
      const updatedGearChains = {
        ...currentState.gearChains,
        customChain: updatedCustomChain,
      };

      if (currentState.gearChains.selectedMode === 'customChain') {
        // Use setTimeout to avoid calling during render
        setTimeout(() => onGearUpdate?.(updatedCustomChain), 0);
      }

      return { ...currentState, gearChains: updatedGearChains };
    });
  };

  const getGearIcon = (type: GearItem['type']) => {
    switch (type) {
      case 'amp':
        return <Volume2 className="w-4 h-4" />;
      default:
        return <Guitar className="w-4 h-4" />;
    }
  };

  const getGearColor = (type: GearItem['type']) => {
    const colorMap = {
      amp: lessonMode
        ? 'bg-neon-cyan/20 border-neon-cyan/40 text-neon-cyan'
        : 'bg-neon-purple/20 border-neon-purple/40 text-neon-purple',
      distortion: 'bg-red-500/20 border-red-500/40 text-red-400',
      overdrive: 'bg-orange-500/20 border-orange-500/40 text-orange-400',
      fuzz: 'bg-pink-500/20 border-pink-500/40 text-pink-400',
      delay: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
      reverb: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
      chorus: 'bg-green-500/20 border-green-500/40 text-green-400',
      phaser: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400',
      compressor: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
      eq: 'bg-teal-500/20 border-teal-500/40 text-teal-400',
      other: 'bg-slate-500/20 border-slate-500/40 text-slate-400',
    };
    return colorMap[type] || colorMap.other;
  };

  return (
    <Card className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle
          className={`flex items-center gap-3 text-xl font-bold ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
        >
          <div
            className={`p-2 rounded-lg ${lessonMode ? 'bg-neon-cyan/20' : 'bg-neon-purple/20'}`}
          >
            <Guitar
              className={`w-5 h-5 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'}`}
            />
          </div>
          Gear Chain
        </CardTitle>

        {/* Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
          <Button
            variant={
              gearChains.selectedMode === 'studiobrainSuggestion'
                ? 'default'
                : 'outline'
            }
            size="sm"
            onClick={() => handleModeToggle('studiobrainSuggestion')}
            className={`flex items-center justify-center gap-2 h-10 ${
              gearChains.selectedMode === 'studiobrainSuggestion'
                ? lessonMode
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-black shadow-lg shadow-neon-cyan/30'
                  : 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-lg shadow-neon-purple/30'
                : lessonMode
                  ? 'bg-white/10 backdrop-blur-md border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10'
                  : 'bg-white/10 backdrop-blur-md border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-sm">⚡ StudioBrain Suggestion</span>
          </Button>

          <Button
            variant={
              gearChains.selectedMode === 'customChain' ? 'default' : 'outline'
            }
            size="sm"
            onClick={() => handleModeToggle('customChain')}
            className={`flex items-center justify-center gap-2 h-10 ${
              gearChains.selectedMode === 'customChain'
                ? lessonMode
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-black shadow-lg shadow-neon-cyan/30'
                  : 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-lg shadow-neon-purple/30'
                : lessonMode
                  ? 'bg-white/10 backdrop-blur-md border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10'
                  : 'bg-white/10 backdrop-blur-md border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">🎛️ My Custom Chain</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {gearChains.selectedMode === 'studiobrainSuggestion' ? (
          <div className="space-y-4">
            {gearChains.studioBrainChain.length > 0 ? (
              <>
                <p className="text-sm text-slate-400 mb-4">
                  Gear extracted from StudioBrain&apos;s tone recommendations
                </p>
                <div className="space-y-3">
                  {gearChains.studioBrainChain.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${lessonMode ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-neon-purple/20 text-neon-purple'}`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Badge
                          variant="outline"
                          className={`${getGearColor(item.type)} border rounded-lg px-3 py-2 text-sm font-medium`}
                        >
                          <span className="flex items-center gap-2">
                            {getGearIcon(item.type)}
                            {item.name}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Zap
                  className={`w-12 h-12 mx-auto mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'} opacity-50`}
                />
                <p className="text-slate-400">
                  Ask StudioBrain for tone recommendations to populate your gear
                  chain
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <p className="text-sm text-slate-400">
                Drag and drop to reorder your signal chain
              </p>
              {gear.guitar.length > 0 || gear.pedals.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    set(currentState => {
                      const newChain =
                        GearService.createCustomChainFromUserGear(
                          currentState.gear.guitar,
                          currentState.gear.pedals
                        );
                      const updatedGearChains = {
                        ...currentState.gearChains,
                        customChain: newChain,
                      };

                      // Use setTimeout to avoid calling during render
                      setTimeout(() => onGearUpdate?.(newChain), 0);

                      return { ...currentState, gearChains: updatedGearChains };
                    });
                  }}
                  className={`w-full sm:w-auto ${lessonMode ? 'border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10' : 'border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10'}`}
                >
                  Load My Gear
                </Button>
              ) : null}
            </div>

            {gearChains.customChain.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={gearChains.customChain.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3 min-h-[60px] relative">
                    {gearChains.customChain.map((item, index) => (
                      <SortableGearItem
                        key={item.id}
                        item={item}
                        index={index}
                        lessonMode={lessonMode}
                        onRemove={removeFromCustomChain}
                        getGearIcon={getGearIcon}
                        getGearColor={getGearColor}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={dropAnimation}>
                  {activeId
                    ? (() => {
                        const activeItem = gearChains.customChain.find(
                          item => item.id === activeId
                        );
                        return activeItem ? (
                          <DragOverlayContent
                            item={activeItem}
                            lessonMode={lessonMode}
                            getGearIcon={getGearIcon}
                            getGearColor={getGearColor}
                          />
                        ) : null;
                      })()
                    : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <div className="text-center py-8">
                <Settings
                  className={`w-12 h-12 mx-auto mb-4 ${lessonMode ? 'text-neon-cyan' : 'text-neon-purple'} opacity-50`}
                />
                <p className="text-slate-400 mb-4">
                  No custom gear chain configured
                </p>
                <p className="text-sm text-slate-500">
                  Add gear in Settings or load from your saved equipment
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
