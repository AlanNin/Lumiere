import * as Notifications from "expo-notifications";

export function usePermissions() {
  async function requestNotificationPermissions() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }
  }

  return { requestNotificationPermissions };
}
