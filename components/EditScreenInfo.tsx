import { Text, View } from 'react-native';

interface EditScreenInfoProps {
  path: string;
}

export const EditScreenInfo: React.FC<EditScreenInfoProps> = ({ path }) => {
  const title = 'Open up the code for this screen:';
  const description =
    'Change any of the text, save the file, and your app will automatically update.';

  return (
    <View>
      <View className={styles.getStartedContainer}>
        <Text className={styles.getStartedText}>{title}</Text>
        <View className={`${styles.codeHighlightContainer} ${styles.homeScreenFilename}`}>
          <Text className={styles.codeText}>{path}</Text>
        </View>
        <Text style={{ marginTop: 8 }} className={styles.getStartedText}>
          {description}
        </Text>
      </View>
    </View>
  );
};

const styles = {
  codeHighlightContainer: `rounded-md px-2 py-1 bg-slate-100 dark:bg-slate-800`,
  codeText: `text-sm font-mono text-slate-800 dark:text-slate-200`,
  getStartedContainer: `items-center mx-12`,
  getStartedText: `text-base leading-6 text-center text-slate-600 dark:text-slate-400`,
  homeScreenFilename: `my-2`,
};
