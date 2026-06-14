import React from 'react';
import { Tabs } from 'expo-router';
import TabBar from '@/components/TabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explorer',
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoris',
        }}
      />
      <Tabs.Screen
        name="adventures"
        options={{
          title: 'Aventures',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
        }}
      />
    </Tabs>
  );
}
