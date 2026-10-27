import { NativeTabs } from 'expo-router/native-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '@/components/mini-player';
import { HAS_TAB_ACCESSORY, TAB_BAR_HEIGHT } from '@/lib/layout';
import { C } from '@/lib/theme';
import { usePlayer } from '@/player/player-context';

function AccessoryContent() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  return <MiniPlayer compact={placement === 'inline'} />;
}

export default function TabsLayout() {
  const { station } = usePlayer();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <NativeTabs tintColor={C.play} backgroundColor={C.bg} minimizeBehavior="onScrollDown">
        {HAS_TAB_ACCESSORY && station ? (
          <NativeTabs.BottomAccessory>
            <AccessoryContent />
          </NativeTabs.BottomAccessory>
        ) : null}
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Dinle</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="dot.radiowaves.left.and.right" md="radio" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="tonight">
          <NativeTabs.Trigger.Label>Bu Gece</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="sparkles" md="nightlife" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="venues">
          <NativeTabs.Trigger.Label>Mekânlar</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="mappin.and.ellipse" md="location_on" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="library">
          <NativeTabs.Trigger.Label>Favoriler</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
        </NativeTabs.Trigger>
      </NativeTabs>
      {!HAS_TAB_ACCESSORY && station ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + TAB_BAR_HEIGHT + 8, height: 60 }}>
          <MiniPlayer floating />
        </View>
      ) : null}
    </View>
  );
}

