import {CheckCircleIcon} from 'phosphor-react-native/src/icons/CheckCircle';
import {CircleIcon} from 'phosphor-react-native/src/icons/Circle';
import {StyleSheet, View} from 'react-native';
import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {BORDER_WIDTH, ICON_SIZE, SPACING, TOUCH_TARGET} from '@/src/constants/UI_SIZES';
import {TextLine} from '@/src/components/ui/TextLine';
import {TouchableScaleView} from '@/src/components/ui/TouchableScaleView';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';
import {useTranslation} from '@/src/i18n/useTranslation';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

const SCENARIOS: readonly MOCK_SCENARIO[] = [
  MOCK_SCENARIO.HAPPY,
  MOCK_SCENARIO.LOST_ACK,
  MOCK_SCENARIO.STALE_STATUS,
  MOCK_SCENARIO.DELETE_FAILURE
];

const SCENARIO_TEST_ID: Record<MOCK_SCENARIO, string> = {
  [MOCK_SCENARIO.HAPPY]: 'diagnostics_scenario_happy_switch',
  [MOCK_SCENARIO.LOST_ACK]: 'diagnostics_scenario_lost_ack_switch',
  [MOCK_SCENARIO.STALE_STATUS]: 'diagnostics_scenario_stale_status_switch',
  [MOCK_SCENARIO.DELETE_FAILURE]: 'diagnostics_scenario_delete_failure_switch'
};

type ScenarioMarkProps = {
  isSelected: boolean;
};

const ScenarioMark = ({isSelected}: ScenarioMarkProps) => {
  const colors = useThemeColors();
  if (isSelected) {
    return <CheckCircleIcon size={ICON_SIZE.md} color={colors.success} weight="regular" />;
  }
  return <CircleIcon size={ICON_SIZE.md} color={colors.textMuted} weight="regular" />;
};

type ScenarioPickerProps = {
  current: MOCK_SCENARIO | null;
  isDisabled: boolean;
  onSelect: (scenario: MOCK_SCENARIO) => void;
};

/** The four mock scenarios as a single choice list; the mark shows the active one. */
export const ScenarioPicker = ({current, isDisabled, onSelect}: ScenarioPickerProps) => {
  const {styles} = useScenarioPickerStyles();
  const {t} = useTranslation();
  const rows = SCENARIOS.map((scenario) => {
    const isSelected = scenario === current;
    const selectScenario = () => onSelect(scenario);
    return (
      <View key={scenario} testID={SCENARIO_TEST_ID[scenario]} collapsable={false}>
        <TouchableScaleView
          onPress={selectScenario}
          disabled={isDisabled}
          accessibilityRole="radio"
          accessibilityState={{checked: isSelected, disabled: isDisabled}}
          accessibilityLabel={`${scenario}. ${t.diagnostics.scenario[scenario]}`}
          style={styles.row}
        >
          <ScenarioMark isSelected={isSelected} />
          <View style={styles.texts}>
            <TextLine variant="money">{scenario}</TextLine>
            <TextLine variant="caption">{t.diagnostics.scenario[scenario]}</TextLine>
          </View>
        </TouchableScaleView>
      </View>
    );
  });
  return <View style={styles.list}>{rows}</View>;
};

const useScenarioPickerStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    list: {
      borderTopWidth: BORDER_WIDTH,
      borderColor: colors.border
    },
    row: {
      minHeight: TOUCH_TARGET,
      gap: SPACING.md,
      paddingVertical: SPACING.md,
      borderBottomWidth: BORDER_WIDTH,
      borderColor: colors.border
    },
    texts: {
      flex: 1,
      gap: SPACING.xs / 2
    }
  })
);
