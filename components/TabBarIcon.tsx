import { Compass } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

export const TabBarIcon = (props: { name: string; color: string }) => {
  return <Compass size={28} style={styles.tabBarIcon} color={props.color} />;
};

export const styles = StyleSheet.create({
  tabBarIcon: {
    marginBottom: -3,
  },
});
