import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/** Jump to the Home tab / Home screen from any nested navigator. */
export function goToHome(navigation: NavigationProp<ParamListBase>) {
  const names = navigation.getState()?.routeNames ?? [];

  if (names.includes('Home')) {
    navigation.navigate('Home' as never);
    return;
  }

  if (names.includes('HomeTab')) {
    navigation.navigate('HomeTab' as never, { screen: 'Home' } as never);
    return;
  }

  const parent = navigation.getParent();
  if (parent) {
    goToHome(parent as NavigationProp<ParamListBase>);
  }
}
