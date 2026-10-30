import {StyleSheet, View} from 'react-native';
import {MOCK_SCENARIO, MOCK_SCENARIOS} from '@/src/api/importsApi/mockControlApi';
import {BORDER_WIDTH} from '@/src/constants/UI_SIZES';
import {ScenarioRow} from '@/src/screens/Diagnostics/components/ScenarioRow';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type ScenarioPickerProps = {
  current: MOCK_SCENARIO | null;
  isDisabled: boolean;
  onSelect: (scenario: MOCK_SCENARIO) => void;
};

/** The four mock scenarios as a single choice list; the mark shows the active one. */
export const ScenarioPicker = ({current, isDisabled, onSelect}: ScenarioPickerProps) => {
  const {styles} = useScenarioPickerStyles();
  const rows = MOCK_SCENARIOS.map((scenario) => {
    const isSelected = scenario === current;
    return (
      <ScenarioRow
        key={scenario}
        scenario={scenario}
        isSelected={isSelected}
        isDisabled={isDisabled}
        onSelect={onSelect}
      />
    );
  });
  return <View style={styles.list}>{rows}</View>;
};

const useScenarioPickerStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    list: {
      borderTopWidth: BORDER_WIDTH,
      borderColor: colors.border
    }
  })
);
