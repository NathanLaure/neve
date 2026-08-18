import React, { useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import ScreenFooter from '@/components/ScreenFooter';
import SettingsPage from '@/components/profile/SettingsPage';
import HomeAddressPicker from '@/components/profile/HomeAddressPicker';
import { formatPlaceLabel } from '@/components/PlaceSearchField';
import { GeocodedPlace } from '@/services/geocodingService';
import { showToast } from '@/utils/toast';

/**
 * « Adresse de domicile ».
 *
 * Le corps est le même qu'à l'inscription (`HomeAddressPicker`) : seul change
 * ce qu'on fait du point retenu — ici un enregistrement immédiat au profil, là
 * une valeur emportée dans la création du compte.
 */
export default function HomeAddressScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();

  const [place, setPlace] = useState<GeocodedPlace | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const savedCoords =
    profile?.homeLat != null && profile?.homeLng != null
      ? { latitude: profile.homeLat, longitude: profile.homeLng }
      : undefined;

  const handleSave = async () => {
    if (!place) return;

    setIsSaving(true);
    const { error } = await updateProfile({
      homeLocation: formatPlaceLabel(place),
      homeLat: place.latitude,
      homeLng: place.longitude,
    });
    setIsSaving(false);

    if (error) {
      showToast.error('Enregistrement impossible', error);
      return;
    }
    router.back();
  };

  return (
    <SettingsPage
      title="Adresse de domicile"
      footer={
        <ScreenFooter>
          <Button
            title="Enregistrer"
            onPress={handleSave}
            loading={isSaving}
            disabled={!place}
          />
        </ScreenFooter>
      }>
      <HomeAddressPicker
        value={place}
        onChange={setPlace}
        savedLabel={profile?.homeLocation}
        savedCoords={savedCoords}
      />
    </SettingsPage>
  );
}
