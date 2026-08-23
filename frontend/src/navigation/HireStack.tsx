import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HireHomeScreen } from '../screens/hire/HireHomeScreen';
import { JobDetailScreen } from '../screens/hire/JobDetailScreen';
import { MyJobsScreen } from '../screens/hire/MyJobsScreen';
import { PostJobScreen } from '../screens/hire/PostJobScreen';
import { WorkChatScreen } from '../screens/hire/WorkChatScreen';
import type { HireStackParamList } from './types';

const Stack = createNativeStackNavigator<HireStackParamList>();

export function HireStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HireHome" options={{ headerShown: false }}>
        {({ navigation }) => (
          <HireHomeScreen
            onOpenJob={(jobId) => navigation.navigate('HireJob', { jobId })}
            onPostJob={() => navigation.navigate('PostJob')}
            onMyJobs={() => navigation.navigate('MyHire')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="HireJob"
        options={{ title: 'Work', headerShadowVisible: false, headerStyle: { backgroundColor: '#E8F1F8' } }}
      >
        {({ route, navigation }) => (
          <JobDetailScreen
            jobId={route.params.jobId}
            onOpenChat={() => navigation.navigate('HireChat', { jobId: route.params.jobId })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="HireChat"
        options={{ title: 'BuildMart bridge', headerShadowVisible: false, headerStyle: { backgroundColor: '#E8F1F8' } }}
      >
        {({ route }) => <WorkChatScreen jobId={route.params.jobId} />}
      </Stack.Screen>
      <Stack.Screen
        name="PostJob"
        options={{ title: 'Open a work', headerShadowVisible: false, headerStyle: { backgroundColor: '#E8F1F8' } }}
      >
        {({ navigation }) => (
          <PostJobScreen onPosted={(jobId) => navigation.replace('HireJob', { jobId })} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="MyHire"
        options={{ title: 'My jobs & bids', headerShadowVisible: false, headerStyle: { backgroundColor: '#E8F1F8' } }}
      >
        {({ navigation }) => (
          <MyJobsScreen
            onOpenJob={(jobId) => navigation.navigate('HireJob', { jobId })}
            onPostJob={() => navigation.navigate('PostJob')}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
