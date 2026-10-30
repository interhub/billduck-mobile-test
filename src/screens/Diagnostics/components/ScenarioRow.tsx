import {CheckCircleIcon} from 'phosphor-react-native/src/icons/CheckCircle';
import {CircleIcon} from 'phosphor-react-native/src/icons/Circle';
import {StyleSheet, View} from 'react-native';
import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {TextLine} from '@/src/components/ui/TextLine';
import {TouchableScaleView} from '@/src/components/ui/TouchableScaleView';
import {BORDER_WIDTH, ICON_SIZE, SPACING, TOUCH_TARGET} from '@/src/constants/UI_SIZES';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';
import {useTranslation} from '@/src/i18n/useTranslation';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

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

type ScenarioRowProps = {
  scenario: MOCK_SCENARIO;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (scenario: MOCK_SCENARIO) => void;
};

/** One mock scenario as a choice: its id, what it does, and a mark when it is the active one. */
export const ScenarioRow = ({scenario, isSelected, isDisabled, onSelect}: ScenarioRowProps) => {
  const {styles} = useScenarioRowStyles();
  const {t} = useTranslation();
  const description = t.diagnostics.scenario[scenario];
  const accessibilityState = {checked: isSelected, disabled: isDisabled};
  const selectScenario = () => onSelect(scenario);
  return (
    <View testID={SCENARIO_TEST_ID[scenario]} collapsable={false}>
      <TouchableScaleView
        onPress={selectScenario}
        disabled={isDisabled}
        accessibilityRole="radio"
        accessibilityState={accessibilityState}
        accessibilityLabel={description}
        style={styles.row}
      >
        <ScenarioMark isSelected={isSelected} />
        <View style={styles.texts}>
          <TextLine variant="money">{scenario}</TextLine>
          <TextLine variant="caption">{description}</TextLine>
        </View>
      </TouchableScaleView>
    </View>
  );
};

const useScenarioRowStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    row: {
      minHeight: TOUCH_TARGET,
      gap: SPACING.md,
      paddingVertical: SPACING.md,
      borderBottomWidth: BORDER_WIDTH,
      borderColor: colors.border
    },
    texts: {
      flex: 1,
      gap: SPACING.xxs
    }
  })
);
