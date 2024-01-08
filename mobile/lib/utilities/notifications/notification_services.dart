import 'dart:developer';

import 'package:awesome_notifications/awesome_notifications.dart';
import 'package:awesome_notifications_fcm/awesome_notifications_fcm.dart';
import 'package:coursehub/main.dart';
import 'package:coursehub/providers/navigation_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';



class NotificationController {
  Future<String?> getFirebaseMessagingToken() async {
    try {
      if (await AwesomeNotificationsFcm().isFirebaseAvailable) {
        return await AwesomeNotificationsFcm().requestFirebaseAppToken();
      } else {
        throw ("Firebase not available");
      }
    } catch (e) {
      return null;
    }
  }

  /// Use this method to detect every time that a new notification is displayed
  @pragma("vm:entry-point")
  static Future<void> onNotificationDisplayedMethod(
      ReceivedNotification receivedNotification) async {
    // Your code goes here

    
  }

  /// Use this method to detect when the user taps on a notification or action button
  @pragma("vm:entry-point")
  static Future<void> onActionReceivedMethod(
      ReceivedAction receivedAction) async {

    if (navigatorKey.currentContext != null) {
      navigatorKey.currentContext!
          .read<NavigationProvider>()
          .changePageNumber(4);
    } else {
      log("Context is NULL");
    }
  }

  @pragma("vm:entry-point")
  static Future<void> myFcmTokenHandle(String token) async {
    if (token.isNotEmpty) {
      log("token $token");
    } else {
      debugPrint('Firebase Token deleted');
    }
  }

  @pragma("vm:entry-point")
  static Future<void> mySilentDataHandle(FcmSilentData silentData) async {
    log(silentData.data.toString());
  }

  static Future<void> startListeningNotificationEvents() async {
    AwesomeNotifications().setListeners(
        onActionReceivedMethod: onActionReceivedMethod,
        onNotificationDisplayedMethod: onNotificationDisplayedMethod);
  }
}
