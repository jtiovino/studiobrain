'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useChatHistoryStore } from '@/lib/useChatHistoryStore';
import { useHydration } from '@/lib/useHydration';
import { useUserStore } from '@/lib/useUserStore';

export default function UserSettingsForm() {
  const router = useRouter();
  const hasHydrated = useHydration();
  const { restoreFromSettings } = useChatHistoryStore();

  const {
    userLevel,
    roles,
    mainInstrument,
    preferredTuning,
    genreInfluence,
    lessonMode,
    flipFretboardView,
    theme: userTheme,
    defaultTab,
    gear,
    set,
  } = useUserStore();

  const { theme: currentTheme, setTheme } = useTheme();

  const [newGuitar, setNewGuitar] = useState('');
  const [newPedal, setNewPedal] = useState('');
  const [newPlugin, setNewPlugin] = useState('');
  const [genreInput, setGenreInput] = useState('');

  // Update genre input and theme when store hydrates
  useEffect(() => {
    if (hasHydrated) {
      setGenreInput(genreInfluence.join(', '));
      // Sync theme with next-themes if different
      if (userTheme !== currentTheme && userTheme !== 'system') {
        setTheme(userTheme);
      }
      console.log('🎯 Settings form hydrated - current gear:', gear);
    }
  }, [hasHydrated, genreInfluence, gear, userTheme, currentTheme, setTheme]);

  // Don't render until hydration is complete to prevent SSR/client mismatch
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  const addGuitar = () => {
    if (newGuitar.trim()) {
      const updatedGear = {
        ...gear,
        guitar: [...gear.guitar, newGuitar.trim()],
      };
      console.log('🎸 Adding guitar:', newGuitar.trim());
      console.log('🎸 Updated guitars array:', updatedGear.guitar);
      set({ gear: updatedGear });
      setNewGuitar('');
    }
  };

  const addPedal = () => {
    if (newPedal.trim()) {
      const updatedGear = {
        ...gear,
        pedals: [...gear.pedals, newPedal.trim()],
      };
      console.log('🎵 Adding pedal:', newPedal.trim());
      console.log('🎵 Updated pedals array:', updatedGear.pedals);
      set({ gear: updatedGear });
      setNewPedal('');
    }
  };

  const addPlugin = () => {
    if (newPlugin.trim()) {
      const updatedGear = {
        ...gear,
        plugins: [...gear.plugins, newPlugin.trim()],
      };
      console.log('🎛️ Adding plugin:', newPlugin.trim());
      console.log('🎛️ Updated plugins array:', updatedGear.plugins);
      set({ gear: updatedGear });
      setNewPlugin('');
    }
  };

  const removeGuitar = (index: number) => {
    set({
      gear: { ...gear, guitar: gear.guitar.filter((_, i) => i !== index) },
    });
  };

  const removePedal = (index: number) => {
    set({
      gear: { ...gear, pedals: gear.pedals.filter((_, i) => i !== index) },
    });
  };

  const removePlugin = (index: number) => {
    set({
      gear: { ...gear, plugins: gear.plugins.filter((_, i) => i !== index) },
    });
  };

  const updateGenres = (value: string) => {
    setGenreInput(value);
    const genres = value
      .split(',')
      .map(g => g.trim())
      .filter(g => g);
    set({ genreInfluence: genres });
  };

  const handleThemeToggle = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
    set({ theme: newTheme });
  };

  const availableRoles = [
    'student',
    'teacher',
    'producer',
    'guitarist',
    'songwriter',
    'engineer',
  ];

  const toggleRole = (role: string) => {
    if (roles.includes(role)) {
      set({ roles: roles.filter(r => r !== role) });
    } else {
      set({ roles: [...roles, role] });
    }
  };

  // Show loading state while hydrating
  if (!hasHydrated) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <button
        onClick={() => {
          router.push('/');
        }}
        className="text-sm text-indigo-500 hover:underline mb-4"
      >
        ← Exit Settings
      </button>
      <h2 className="text-2xl font-bold mb-6 text-foreground">User Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Level */}
        <div className="space-y-2">
          <Label htmlFor="userLevel" className="text-foreground font-medium">
            User Level
          </Label>
          <Select
            value={userLevel}
            onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') =>
              set({ userLevel: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Roles */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">
            Roles (select all that apply)
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {availableRoles.map(role => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={role}
                  checked={roles.includes(role)}
                  onCheckedChange={() => toggleRole(role)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor={role}
                  className="text-foreground font-normal capitalize cursor-pointer"
                >
                  {role}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Main Instrument */}
        <div className="space-y-2">
          <Label
            htmlFor="mainInstrument"
            className="text-foreground font-medium"
          >
            Main Instrument
          </Label>
          <Select
            value={mainInstrument}
            onValueChange={(value: 'guitar' | 'keyboard' | 'bass') =>
              set({ mainInstrument: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select instrument" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="guitar">Guitar</SelectItem>
              <SelectItem value="keyboard">Keyboard</SelectItem>
              <SelectItem value="bass">Bass</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default Tab */}
        <div className="space-y-2">
          <Label htmlFor="defaultTab" className="text-foreground font-medium">
            Default Tab
          </Label>
          <Select
            value={defaultTab}
            onValueChange={(
              value: 'General' | 'Mix' | 'Theory' | 'Instrument'
            ) => set({ defaultTab: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select default tab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="Mix">Mix</SelectItem>
              <SelectItem value="Theory">Theory</SelectItem>
              <SelectItem value="Instrument">Instrument</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preferred Tuning */}
      <div className="space-y-2">
        <Label
          htmlFor="preferredTuning"
          className="text-foreground font-medium"
        >
          Preferred Tuning
        </Label>
        <Input
          id="preferredTuning"
          value={preferredTuning}
          onChange={e => set({ preferredTuning: e.target.value })}
          placeholder="e.g., Standard (E-A-D-G-B-E)"
          className="bg-background text-foreground border-border placeholder:text-muted-foreground focus:border-ring"
        />
      </div>

      {/* Genre Influence */}
      <div className="space-y-2">
        <Label htmlFor="genreInfluence" className="text-foreground font-medium">
          Genre Influences (comma-separated)
        </Label>
        <Input
          id="genreInfluence"
          value={genreInput}
          onChange={e => updateGenres(e.target.value)}
          placeholder="e.g., prog rock, jazz fusion, metal"
          className="bg-background text-foreground border-border placeholder:text-muted-foreground focus:border-ring"
        />
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="lessonMode"
            checked={lessonMode}
            onCheckedChange={checked => set({ lessonMode: checked })}
          />
          <Label htmlFor="lessonMode" className="text-foreground font-medium">
            Lesson Mode
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="flipFretboardView"
            checked={flipFretboardView}
            onCheckedChange={checked => set({ flipFretboardView: checked })}
          />
          <Label
            htmlFor="flipFretboardView"
            className="text-foreground font-medium"
          >
            Flip Fretboard View
          </Label>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="darkMode"
          checked={currentTheme === 'dark'}
          onCheckedChange={handleThemeToggle}
        />
        <Label htmlFor="darkMode" className="text-foreground font-medium">
          Dark Mode
        </Label>
      </div>

      {/* Gear Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Gear</h3>

        {/* Guitars */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Guitars</Label>
          <div className="flex space-x-2">
            <Input
              value={newGuitar}
              onChange={e => setNewGuitar(e.target.value)}
              placeholder="Add guitar"
              onKeyPress={e => e.key === 'Enter' && addGuitar()}
              className="bg-background text-foreground border-border placeholder:text-muted-foreground focus:border-ring"
            />
            <Button
              onClick={addGuitar}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {gear.guitar.map((guitar, index) => (
              <span
                key={index}
                className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm cursor-pointer hover:bg-secondary/80 border border-border"
                onClick={() => removeGuitar(index)}
              >
                {guitar} ×
              </span>
            ))}
          </div>
        </div>

        {/* Pedals */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Pedals</Label>
          <div className="flex space-x-2">
            <Input
              value={newPedal}
              onChange={e => setNewPedal(e.target.value)}
              placeholder="Add pedal"
              onKeyPress={e => e.key === 'Enter' && addPedal()}
              className="bg-background text-foreground border-border placeholder:text-muted-foreground focus:border-ring"
            />
            <Button
              onClick={addPedal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {gear.pedals.map((pedal, index) => (
              <span
                key={index}
                className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm cursor-pointer hover:bg-secondary/80 border border-border"
                onClick={() => removePedal(index)}
              >
                {pedal} ×
              </span>
            ))}
          </div>
        </div>

        {/* Interface */}
        <div className="space-y-2">
          <Label htmlFor="interface" className="text-foreground font-medium">
            Audio Interface
          </Label>
          <Input
            id="interface"
            value={gear.interface}
            onChange={e =>
              set({ gear: { ...gear, interface: e.target.value } })
            }
            placeholder="e.g., Focusrite Scarlett 2i2"
            className="bg-background text-foreground border-border placeholder:text-muted-foreground focus:border-ring"
          />
        </div>

        {/* Monitors */}
        <div className="space-y-2">
          <Label htmlFor="monitors" className="text-foreground font-medium">
            Studio Monitors
          </Label>
          <Input
            id="monitors"
            value={gear.monitors}
            onChange={e => set({ gear: { ...gear, monitors: e.target.value } })}
            placeholder="e.g., KRK Rokit 5"
            className="bg-background text-foreground border-border placeholder:text-muted-foreground focus:border-ring"
          />
        </div>

        {/* DAW */}
        <div className="space-y-2">
          <Label htmlFor="daw" className="text-foreground font-medium">
            DAW (Digital Audio Workstation)
          </Label>
          <Select
            value={gear.daw}
            onValueChange={value => set({ gear: { ...gear, daw: value } })}
          >
            <SelectTrigger className="bg-background text-foreground border-border focus:border-ring">
              <SelectValue placeholder="Select your DAW" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None / Other</SelectItem>
              <SelectItem value="Logic Pro">Logic Pro</SelectItem>
              <SelectItem value="Ableton Live">Ableton Live</SelectItem>
              <SelectItem value="FL Studio">FL Studio</SelectItem>
              <SelectItem value="Pro Tools">Pro Tools</SelectItem>
              <SelectItem value="Reaper">Reaper</SelectItem>
              <SelectItem value="Cubase">Cubase</SelectItem>
              <SelectItem value="Studio One">Studio One</SelectItem>
              <SelectItem value="Reason">Reason</SelectItem>
              <SelectItem value="GarageBand">GarageBand</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Plugins */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Plugins</Label>
          <div className="flex space-x-2">
            <Input
              value={newPlugin}
              onChange={e => setNewPlugin(e.target.value)}
              placeholder="Add plugin"
              onKeyPress={e => e.key === 'Enter' && addPlugin()}
              className="bg-background text-foreground border-border placeholder:text-muted-foreground focus:border-ring"
            />
            <Button
              onClick={addPlugin}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {gear.plugins.map((plugin, index) => (
              <span
                key={index}
                className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm cursor-pointer hover:bg-secondary/80 border border-border"
                onClick={() => removePlugin(index)}
              >
                {plugin} ×
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
