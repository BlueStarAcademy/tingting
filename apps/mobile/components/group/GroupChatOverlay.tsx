import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GroupChatBar } from '@/components/group/GroupChatBar';

interface GroupChatOverlayValue {
  groupId: string | null;
  setGroupId: (groupId: string | null) => void;
}

const GroupChatOverlayContext = createContext<GroupChatOverlayValue>({
  groupId: null,
  setGroupId: () => {},
});

export function GroupChatOverlayProvider({ children }: { children: ReactNode }) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const value = useMemo(() => ({ groupId, setGroupId }), [groupId]);

  return (
    <GroupChatOverlayContext.Provider value={value}>
      {children}
    </GroupChatOverlayContext.Provider>
  );
}

export function useGroupChatOverlay() {
  return useContext(GroupChatOverlayContext);
}

export function GroupChatOverlayHost() {
  const { groupId } = useGroupChatOverlay();
  if (!groupId) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <GroupChatBar groupId={groupId} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 64,
  },
});
