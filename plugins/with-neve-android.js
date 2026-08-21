const { withAppBuildGradle, withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/**
 * Réglages Android qui doivent survivre à `expo prebuild`.
 *
 * Le dossier `android/` est jetable et ignoré par git : tout ce qu'on y modifie à
 * la main disparaît au prochain prebuild. Ce plugin est le seul endroit du dépôt
 * où ces réglages existent réellement.
 */

/** Marqueur d'idempotence : le plugin peut retomber sur un fichier déjà patché. */
const SIGNING_MARKER = 'NEVE_UPLOAD_STORE_FILE';

const SIGNING_CONFIG = `        /*
         * Clé d'envoi Play, posée par plugins/with-neve-android.js.
         *
         * Les identifiants sont lus depuis ~/.gradle/gradle.properties et jamais
         * depuis le dépôt, qui est public. La keystore vit elle aussi hors du
         * projet : \`android/\` est régénéré, tout ce qu'on y range se perd.
         */
        release {
            if (project.hasProperty('${SIGNING_MARKER}')) {
                storeFile file(${SIGNING_MARKER})
                storePassword NEVE_UPLOAD_STORE_PASSWORD
                keyAlias NEVE_UPLOAD_KEY_ALIAS
                keyPassword NEVE_UPLOAD_KEY_PASSWORD
            }
        }
    }`;

const RELEASE_SIGNING = `        release {
            /* Signature d'envoi dès que la keystore est configurée, repli sur le
               debug sinon : un clone frais doit continuer à builder, et un AAB
               signé en debug se fait de toute façon refuser par Play. */
            signingConfig project.hasProperty('${SIGNING_MARKER}')
                ? signingConfigs.release
                : signingConfigs.debug`;

/**
 * Remplace une portion du gabarit Gradle, en échouant bruyamment si elle a changé.
 *
 * Une montée de version d'Expo peut réécrire ce gabarit. Mieux vaut un prebuild
 * qui s'arrête net qu'une build silencieusement signée en debug, refusée par Play
 * une heure plus tard — ou pire, publiée avec la clé que tout le monde possède.
 */
function replaceOrThrow(contents, search, replacement, what) {
  if (!contents.includes(search)) {
    throw new Error(
      `with-neve-android : ${what} introuvable dans android/app/build.gradle. ` +
        `Le gabarit Expo a probablement changé — reposer le patch à la main avant de builder.`
    );
  }
  return contents.replace(search, replacement);
}

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes(SIGNING_MARKER)) return mod;

    let contents = mod.modResults.contents;

    contents = replaceOrThrow(
      contents,
      `            keyPassword 'android'
        }
    }`,
      `            keyPassword 'android'
        }
${SIGNING_CONFIG}`,
      'le bloc signingConfigs.debug'
    );

    contents = replaceOrThrow(
      contents,
      `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
      RELEASE_SIGNING,
      'la signature du buildType release'
    );

    mod.modResults.contents = contents;
    return mod;
  });

/**
 * Liens `https://neve-rando.fr/share/…` ouverts dans l'app plutôt que dans le
 * navigateur.
 *
 * Inerte tant que `/.well-known/assetlinks.json` n'est pas publié sur le domaine
 * avec l'empreinte du certificat de signature : sans lui la vérification échoue
 * et Android retombe sur le navigateur, le comportement actuel. C'est ce qui
 * permet de le poser dès maintenant — l'`intent-filter` est du natif et exigerait
 * sinon une build de plus le jour où l'écran d'accueil des liens existera.
 *
 * Volontairement limité à `/share/` : le reste du domaine (accueil, explorateur,
 * mentions légales) n'a pas d'équivalent dans l'app, et les redirections d'auth
 * passent déjà par le schéma `neve://`.
 */
const withShareAppLinks = (config) =>
  withAndroidManifest(config, (mod) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults);
    activity['intent-filter'] = activity['intent-filter'] ?? [];

    const alreadyDeclared = activity['intent-filter'].some((filter) =>
      filter?.data?.some((entry) => entry?.$?.['android:host'] === 'neve-rando.fr')
    );
    if (alreadyDeclared) return mod;

    activity['intent-filter'].push({
      $: { 'android:autoVerify': 'true' },
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
      ],
      /*
       * Les deux hôtes, et `www` d'abord : c'est lui le canonique, l'apex répond
       * 308 vers lui. Android ne suit pas les redirections pour aller chercher
       * `/.well-known/assetlinks.json` — déclarer le seul apex faisait donc
       * échouer la vérification, et un lien de partage ouvrait le navigateur au
       * lieu de l'application.
       *
       * L'apex reste déclaré pour les liens déjà envoyés, qui le portent.
       */
      data: [
        {
          $: {
            'android:scheme': 'https',
            'android:host': 'www.neve-rando.fr',
            'android:pathPrefix': '/share/',
          },
        },
        {
          $: {
            'android:scheme': 'https',
            'android:host': 'neve-rando.fr',
            'android:pathPrefix': '/share/',
          },
        },
      ],
    });

    return mod;
  });

module.exports = (config) => withShareAppLinks(withReleaseSigning(config));
