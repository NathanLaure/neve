import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Check, ImagePlus, Mountain, Navigation, TrainFront, X } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import SettingsPage from '@/components/profile/SettingsPage';
import ScreenFooter from '@/components/ScreenFooter';
import { Button } from '@/components/Button';
import InlineSelect, { InlineSelectOption } from '@/components/InlineSelect';
import { showToast } from '@/utils/toast';
import {
  FeedbackIntent,
  FeedbackSubjectKind,
  submitFeedback,
} from '@/services/feedbackService';

/** Adresse de contact de l'équipe. Repli quand le formulaire ne peut pas servir. */
const SUPPORT_EMAIL = 'contact@neve-rando.fr';

/* La plus fréquente d'abord : c'est celle que la page propose par défaut. */
const INTENTS: InlineSelectOption[] = [
  { value: 'problem', label: 'signaler un problème' },
  { value: 'data', label: 'corriger une information' },
  { value: 'idea', label: 'proposer une idée' },
  { value: 'help', label: 'demander de l’aide' },
];

const SUBJECTS: InlineSelectOption[] = [
  { value: 'hike', label: 'une randonnée' },
  { value: 'journey', label: 'un trajet ou un horaire' },
  { value: 'other', label: 'autre chose' },
];

/**
 * Invite du champ libre. Elle seule change d'une intention à l'autre — jamais
 * la structure du formulaire : découper en « ce que vous attendiez / ce qui
 * s'est passé » ferait un formulaire de testeur, pas de randonneur.
 */
const PROMPTS: Record<FeedbackIntent, string> = {
  problem: 'Qu’est-ce qui ne va pas ?\nDis-nous sur quel écran, et ce que tu attendais.',
  data: 'Qu’est-ce qui est faux, et qu’est-ce qui serait juste ?',
  idea: 'Qu’est-ce qui te manque dans Névé ?',
  help: 'Sur quoi bloques-tu ?',
};


/**
 * « Suggestions et assistance ».
 *
 * Une seule page pour les quatre besoins, réglée par une phrase dont la fin se
 * tape : « Je voudrais [signaler un problème] ». L'utilisateur dit ce qu'il
 * veut faire, on en déduit la catégorie — il n'a pas à faire le tri entre
 * assistance et suggestion, ce qui est justement notre problème et pas le sien.
 *
 * Le formulaire demande peu et joint beaucoup : ce qui rend un signalement
 * exploitable n'est presque jamais dans ce que la personne écrit, mais dans ce
 * qu'elle ne sait pas nous dire. Voir `collectContext` dans le service.
 */
export default function SupportSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const { user } = useAuth();

  /* Ouvert depuis une fiche ou une aventure, le formulaire sait de quoi on
     parle : la phrase arrive déjà réglée et l'identifiant du sujet part avec le
     message. C'est là que le signalement de donnée fausse devient exploitable —
     « ce train n'existe pas » sans savoir lequel ne mène nulle part. */
  const {
    intent: initialIntent,
    subjectId,
    subjectKind,
    subjectLabel,
    from,
  } = useLocalSearchParams<{
    intent?: FeedbackIntent;
    subjectId?: string;
    subjectKind?: FeedbackSubjectKind;
    /** Nom lisible du sujet, montré à l'utilisateur : « Boucle des Trois Pignons ». */
    subjectLabel?: string;
    from?: string;
  }>();

  const [intent, setIntent] = useState<FeedbackIntent>(initialIntent ?? 'problem');
  const [subject, setSubject] = useState<FeedbackSubjectKind>(subjectKind ?? 'hike');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const canSend = message.trim().length > 0 && !isSending;
  const showsSubject = intent === 'data';

  const prompt = useMemo(() => PROMPTS[intent], [intent]);

  const handlePickScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast.error('Accès refusé', 'Autorise Névé à accéder à tes photos pour joindre une capture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    const asset = result.canceled ? null : result.assets?.[0];
    if (asset) setScreenshot(asset.uri);
  };

  const handleSend = async () => {
    if (!user?.id || !canSend) return;

    setIsSending(true);
    const { error } = await submitFeedback(user.id, {
      intent,
      message,
      /* Le sélecteur l'emporte quand il est affiché, sinon on garde le sujet
         d'où l'on vient : une idée proposée depuis une fiche parle encore de
         cette randonnée, même sans la ligne « sur … » à l'écran. */
      subjectKind: showsSubject ? subject : (subjectKind ?? null),
      subjectId: subjectId ?? null,
      screenshotUri: screenshot,
      screen: from ?? null,
    });
    setIsSending(false);

    if (error) {
      showToast.error('L’envoi a échoué', 'Ton message est gardé, réessaie dans un instant.');
      return;
    }

    setIsSent(true);
  };

  if (isSent) {
    return (
      <SettingsPage title="Suggestions et assistance" fill>
        <View style={styles.sent}>
          <View style={[styles.sentBadge, { backgroundColor: theme.orangeBadge }]}>
            <Check size={28} color={theme.tint} />
          </View>
          <Text style={[styles.sentTitle, { color: theme.text }]}>Merci pour ton message !</Text>
          <Text style={[styles.sentBody, { color: theme.textMuted }]}>
            Nous reviendrons très vite vers toi pour t’informer de la suite.
          </Text>
          <Button title="Fermer" variant="secondary" onPress={() => router.back()} />
        </View>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage
      title="Suggestions et assistance"
      /* Le corps s'étire pour que les deux notes puissent se coller en bas. */
      contentContainerStyle={styles.body}
      footer={
        <ScreenFooter>
          <Button
            title="Envoyer mon message"
            variant="primary"
            icon={<Navigation size={20} />}
            iconPosition="right"
            onPress={handleSend}
            loading={isSending}
            disabled={!canSend}
          />
        </ScreenFooter>
      }>
      {/* Dans le corps et non épinglée sous le titre : à l'ouverture du clavier,
          une introduction de trois lignes coûterait la moitié du champ. */}
      <Text style={[styles.intro, { color: theme.textMuted }]}>
        Un itinéraire faux, un problème technique, une idée pour la suite : écris nous, nous
        reviendrons vers toi sous 48h max. ☺️
      </Text>

      <View style={styles.sentence}>
        <View style={styles.sentenceRow}>
          <Text style={[styles.sentenceText, { color: theme.text }]}>Je voudrais</Text>
          <InlineSelect
            value={intent}
            options={INTENTS}
            onSelect={(next) => setIntent(next as FeedbackIntent)}
            accessibilityLabel="Motif du message"
          />
        </View>

        {/* Seulement sur « corriger une information » : une idée ne porte pas
            sur une randonnée en particulier. */}
        {showsSubject && (
          <View style={styles.sentenceRow}>
            <Text style={[styles.sentenceText, { color: theme.text }]}>sur</Text>
            <InlineSelect
              value={subject}
              options={SUBJECTS}
              onSelect={(next) => setSubject(next as FeedbackSubjectKind)}
              accessibilityLabel="Sujet de la correction"
            />
          </View>
        )}

        {/* Référence de ce d'où l'on vient. Sans elle, on ne sait pas que le
            contexte est déjà joint — et on le retape dans le message, ou pire,
            on n'ose pas croire qu'il est pris en compte. */}
        {subjectLabel && (
          <View style={[styles.context, { backgroundColor: theme.card }]}>
            {subjectKind === 'journey' ? (
              <TrainFront size={16} color={theme.textMuted} />
            ) : (
              <Mountain size={16} color={theme.textMuted} />
            )}
            <Text numberOfLines={1} style={[styles.contextLabel, { color: theme.textMuted }]}>
              {subjectLabel}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.block}>
        <Text style={[styles.label, { color: theme.text }]}>{prompt}</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Ton commentaire ici"
          placeholderTextColor={theme.textMuted}
          multiline
          textAlignVertical="top"
          editable={!isSending}
          style={[styles.textArea, { backgroundColor: theme.card, color: theme.text }]}
        />
      </View>

      {/* Proposée sur les quatre intentions : une idée se montre parfois mieux
          qu'elle ne se décrit, capture de l'écran à l'appui. */}
      <View style={styles.block}>
        <Text style={[styles.label, { color: theme.text }]}>Ajouter une capture d’écran</Text>

        <Pressable
          onPress={handlePickScreenshot}
          disabled={isSending}
          style={[styles.dropZone, { borderColor: theme.textTertiary }]}>
          <ImagePlus size={24} color={theme.textMuted} />
          <Text style={[styles.dropZoneLabel, { color: theme.textMuted }]}>Choisir une image</Text>
        </Pressable>

        {/* La vignette et non le nom du fichier : le sélecteur rend des noms
            comme `hufejoe786HBHJkh.jpg`, qui ne disent rien à personne. */}
        {screenshot && (
          <View style={[styles.thumbCard, { backgroundColor: theme.card }]}>
            <Image source={{ uri: screenshot }} style={styles.thumb} />
            <Pressable
              onPress={() => setScreenshot(null)}
              hitSlop={8}
              accessibilityLabel="Retirer la capture"
              style={[styles.thumbRemove, { backgroundColor: theme.card }]}>
              <X size={12} color={theme.text} />
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.notes}>
        <Text style={[styles.note, { color: theme.textMuted }]}>
          On joint la version de l’app, ton système et l’écran d’où tu écris.
        </Text>
        <Pressable onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <Text style={[styles.note, { color: theme.textMuted }]}>
            Tu peux aussi écrire à {SUPPORT_EMAIL}
          </Text>
        </Pressable>
      </View>

      {isSending && <ActivityIndicator color={theme.tint} style={styles.sendingHint} />}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  sentence: {
    gap: 8,
    marginTop: 28,
  },
  sentenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sentenceText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 30,
  },
  block: {
    gap: 8,
    marginTop: 36,
  },
  /* Discrète et sur une seule ligne : c'est un accusé de contexte, pas une
     information à lire. */
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '100%',
  },
  contextLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  label: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dropZoneLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  thumbCard: {
    alignSelf: 'flex-start',
    padding: 4,
    borderRadius: 8,
  },
  thumb: {
    width: 42,
    height: 90,
    borderRadius: 4,
  },
  /* Débordante d'un quart : posée à l'intérieur, elle mangerait la vignette. */
  thumbRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexGrow: 1,
  },
  /* Poussées en bas de page par la marge automatique : ce sont des mentions,
     elles n'ont pas à s'intercaler entre le formulaire et le bouton. Les deux
     lignes se serrent l'une contre l'autre — elles disent la même chose, que
     le message est bien pris en charge. */
  notes: {
    gap: 4,
    marginTop: 'auto',
    paddingTop: 36,
    alignItems: 'center',
  },
  note: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
  },
  sendingHint: {
    marginTop: 16,
  },
  sent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  sentBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentTitle: {
    fontFamily: 'BricolageGrotesque-SemiBold',
    fontSize: 22,
    lineHeight: 28,
  },
  sentBody: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
});
