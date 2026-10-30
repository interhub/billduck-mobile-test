import {Card} from '@/src/components/ui/Card';
import {InfoRow} from '@/src/components/ui/InfoRow';
import {OptionalText} from '@/src/components/ui/OptionalText';
import {ENV} from '@/src/config/env';
import {useTranslation} from '@/src/i18n/useTranslation';
import {describeHealth, HealthState} from '@/src/screens/Diagnostics/logic/describeHealth';

type ServerHealthCardProps = {
  health: HealthState;
};

/** The address the app talks to, whether it answers, and how to start it when it does not. */
export const ServerHealthCard = ({health}: ServerHealthCardProps) => {
  const {t} = useTranslation();
  const healthText = describeHealth(health, t);
  const isServerDown = health === 'down';
  return (
    <Card>
      <InfoRow label={t.diagnostics.addressLabel} value={ENV.API_BASE_URL} valueVariant="money" />
      <InfoRow
        label={t.diagnostics.healthLabel}
        value={healthText}
        testID="diagnostics_health_text"
      />
      <OptionalText
        isVisible={isServerDown}
        text={t.diagnostics.serverDownHint}
        variant="caption"
      />
    </Card>
  );
};
