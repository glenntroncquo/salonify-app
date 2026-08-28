import { Pressable } from '@/components/pressable-scale';
import { Colors } from '@/constants/theme';
import {
  clientDurationFromPhases,
  staffDurationFromPhases,
  type PhaseDraft,
} from '@/lib/api/services';
import { COLOR_BG_MAP, COLOR_MAP, COLOR_TEXT_MAP, mapTreatmentColorToEventColor } from '@/lib/treatment-colors';
import React from 'react';
import { Pressable as RNPressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export type EditorPhase = PhaseDraft & { key: string };

const STEP_MINUTES = 5;
const MIN_MINUTES = 1;
const DEFAULT_BLOCK_MINUTES = 30;

let phaseKeySeq = 0;
export function createPhaseKey(): string {
  phaseKeySeq += 1;
  return `phase-${phaseKeySeq}`;
}

export function defaultEditorPhases(): EditorPhase[] {
  return [{ key: createPhaseKey(), phase_type: 'busy', duration_minutes: DEFAULT_BLOCK_MINUTES }];
}

export function editorPhasesFromDrafts(phases: PhaseDraft[]): EditorPhase[] {
  if (phases.length === 0) return defaultEditorPhases();
  return phases.map((phase) => ({
    key: createPhaseKey(),
    phase_type: phase.phase_type,
    duration_minutes: Math.max(MIN_MINUTES, Number(phase.duration_minutes) || DEFAULT_BLOCK_MINUTES),
  }));
}

function Hatch({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 14 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.hatchStripe,
            {
              left: index * 10 - 24,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

type Props = {
  phases: EditorPhase[];
  onChange: (phases: EditorPhase[]) => void;
  serviceColor: string | null;
  theme: typeof Colors.light;
};

export function PhaseBlockEditor({ phases, onChange, serviceColor, theme }: Props) {
  const { t } = useTranslation();
  const [selectedKey, setSelectedKey] = React.useState<string | null>(phases[0]?.key ?? null);
  const [pickingType, setPickingType] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [minutesText, setMinutesText] = React.useState(String(phases[0]?.duration_minutes ?? DEFAULT_BLOCK_MINUTES));

  const eventColor = mapTreatmentColorToEventColor(serviceColor);
  const busyColor = COLOR_MAP[eventColor];
  const freeFill = COLOR_BG_MAP[eventColor];
  const freeText = COLOR_TEXT_MAP[eventColor];

  const selectedIndex = phases.findIndex((phase) => phase.key === selectedKey);
  const selected = selectedIndex >= 0 ? phases[selectedIndex] : null;
  const busyCount = phases.filter((phase) => phase.phase_type === 'busy').length;
  const clientMinutes = clientDurationFromPhases(phases);
  const staffMinutes = staffDurationFromPhases(phases);

  React.useEffect(() => {
    if (selectedKey && phases.some((phase) => phase.key === selectedKey)) return;
    setSelectedKey(phases[0]?.key ?? null);
  }, [phases, selectedKey]);

  React.useEffect(() => {
    const current = phases.find((phase) => phase.key === selectedKey);
    if (current) setMinutesText(String(current.duration_minutes));
  }, [selectedKey, phases]);

  const updateAt = (index: number, patch: Partial<EditorPhase>) => {
    onChange(phases.map((phase, phaseIndex) => (phaseIndex === index ? { ...phase, ...patch } : phase)));
  };

  const handleSelect = (key: string) => {
    setSelectedKey(key);
    setPickingType(false);
    setNotice(null);
  };

  const handleTypeChange = (nextType: 'busy' | 'free') => {
    if (!selected || selectedIndex < 0) return;
    if (selected.phase_type === 'busy' && nextType === 'free' && busyCount <= 1) {
      setNotice(t('service.keepOneBusy'));
      return;
    }
    setNotice(null);
    updateAt(selectedIndex, { phase_type: nextType });
  };

  const handleMinutes = (next: number) => {
    if (!selected || selectedIndex < 0) return;
    const minutes = Math.max(MIN_MINUTES, Math.round(next) || MIN_MINUTES);
    setMinutesText(String(minutes));
    updateAt(selectedIndex, { duration_minutes: minutes });
  };

  const handleDelete = () => {
    if (!selected || selectedIndex < 0) return;
    if (selected.phase_type === 'busy' && busyCount <= 1) {
      setNotice(t('service.keepOneBusy'));
      return;
    }
    const next = phases.filter((_, index) => index !== selectedIndex);
    onChange(next);
    const fallback = next[Math.min(selectedIndex, next.length - 1)];
    setSelectedKey(fallback?.key ?? null);
    setNotice(null);
  };

  const handleAdd = (phaseType: 'busy' | 'free') => {
    const insertAt = selectedIndex >= 0 ? selectedIndex + 1 : phases.length;
    const nextPhase: EditorPhase = {
      key: createPhaseKey(),
      phase_type: phaseType,
      duration_minutes: DEFAULT_BLOCK_MINUTES,
    };
    const next = [...phases.slice(0, insertAt), nextPhase, ...phases.slice(insertAt)];
    onChange(next);
    setSelectedKey(nextPhase.key);
    setPickingType(false);
    setNotice(null);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('service.blocks')}</Text>

      <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {phases.map((phase) => {
          const isSelected = phase.key === selectedKey;
          const isBusy = phase.phase_type === 'busy';
          const showLabel = phase.duration_minutes >= 15 || phases.length <= 3;
          return (
            <RNPressable
              key={phase.key}
              onPress={() => handleSelect(phase.key)}
              style={[
                styles.block,
                {
                  flexGrow: phase.duration_minutes,
                  flexShrink: 1,
                  backgroundColor: isBusy ? busyColor : freeFill,
                  borderColor: isSelected ? theme.text : 'transparent',
                  zIndex: isSelected ? 1 : 0,
                },
              ]}>
              {!isBusy ? <Hatch color={busyColor} /> : null}
              {showLabel ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.blockLabel,
                    { color: isBusy ? '#ffffff' : freeText },
                  ]}>
                  {`${phase.duration_minutes}`}
                </Text>
              ) : null}
            </RNPressable>
          );
        })}
      </View>

      <View style={styles.totalsRow}>
        <View style={[styles.totalChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.totalLabel, { color: theme.muted }]}>{t('service.clientTime')}</Text>
          <Text style={[styles.totalValue, { color: theme.text }]}>
            {`${clientMinutes} ${t('appointment.minutesShort')}`}
          </Text>
        </View>
        <View style={[styles.totalChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.totalLabel, { color: theme.muted }]}>{t('service.staffTime')}</Text>
          <Text style={[styles.totalValue, { color: theme.text }]}>
            {`${staffMinutes} ${t('appointment.minutesShort')}`}
          </Text>
        </View>
      </View>

      {selected ? (
        <View style={[styles.editorCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.typeRow}>
            <TypeChip
              label={t('service.phaseBusy')}
              selected={selected.phase_type === 'busy'}
              theme={theme}
              onPress={() => handleTypeChange('busy')}
            />
            <TypeChip
              label={t('service.phaseFree')}
              selected={selected.phase_type === 'free'}
              theme={theme}
              onPress={() => handleTypeChange('free')}
            />
          </View>
          {selected.phase_type === 'free' ? (
            <Text style={[styles.hint, { color: theme.muted }]}>{t('service.phaseFreeHint')}</Text>
          ) : null}

          <View style={styles.stepperRow}>
            <Pressable
              style={[styles.stepperButton, { borderColor: theme.border, backgroundColor: theme.background }]}
              onPress={() => handleMinutes(selected.duration_minutes - STEP_MINUTES)}>
              <Text style={[styles.stepperButtonText, { color: theme.text }]}>−{STEP_MINUTES}</Text>
            </Pressable>
            <View style={styles.minutesField}>
              <TextInput
                style={[styles.minutesInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                keyboardType="number-pad"
                value={minutesText}
                onChangeText={setMinutesText}
                onBlur={() => {
                  const parsed = Number(minutesText.replace(/[^\d]/g, ''));
                  handleMinutes(Number.isFinite(parsed) && parsed > 0 ? parsed : selected.duration_minutes);
                }}
              />
              <Text style={[styles.minutesUnit, { color: theme.muted }]}>{t('appointment.minutesShort')}</Text>
            </View>
            <Pressable
              style={[styles.stepperButton, { borderColor: theme.border, backgroundColor: theme.background }]}
              onPress={() => handleMinutes(selected.duration_minutes + STEP_MINUTES)}>
              <Text style={[styles.stepperButtonText, { color: theme.text }]}>+{STEP_MINUTES}</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleDelete} hitSlop={8} style={styles.deleteRow}>
            <Text style={[styles.deleteText, { color: theme.error }]}>{t('common.delete')}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.hint, { color: theme.muted }]}>{t('service.tapBlock')}</Text>
      )}

      {notice ? <Text style={[styles.notice, { color: theme.error }]}>{notice}</Text> : null}

      {pickingType ? (
        <View style={styles.typeRow}>
          <TypeChip label={t('service.phaseBusy')} selected={false} theme={theme} onPress={() => handleAdd('busy')} />
          <TypeChip label={t('service.phaseFree')} selected={false} theme={theme} onPress={() => handleAdd('free')} />
        </View>
      ) : (
        <Pressable onPress={() => setPickingType(true)} hitSlop={8}>
          <Text style={styles.addLink}>{t('service.addBlock')}</Text>
        </Pressable>
      )}
    </View>
  );
}

function TypeChip({
  label,
  selected,
  theme,
  onPress,
}: {
  label: string;
  selected: boolean;
  theme: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.typeChip,
        { borderColor: theme.border, backgroundColor: theme.background },
        selected && { backgroundColor: theme.tint, borderColor: theme.tint },
      ]}>
      <Text style={[styles.typeChipText, { color: selected ? theme.onTint : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bar: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 2,
  },
  block: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  hatchStripe: {
    position: 'absolute',
    top: -16,
    width: 2,
    height: 76,
    opacity: 0.28,
    transform: [{ rotate: '28deg' }],
  },
  totalsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  totalChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  editorCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
  },
  notice: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  minutesField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  minutesInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  minutesUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteRow: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20b87b',
  },
});
