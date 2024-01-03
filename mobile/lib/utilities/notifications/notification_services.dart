import 'dart:convert';
import 'dart:developer';
import 'dart:io';

import 'package:coursehub/main.dart';
import 'package:coursehub/providers/navigation_provider.dart';
import 'package:http/http.dart' as http;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:app_settings/app_settings.dart';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:provider/provider.dart';

//TODO: Android Notification Channel ID add this in API call

class NotificationServices {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  void firebaseInit(BuildContext context) {
    FirebaseMessaging.onMessage.listen((message) async {
      await foregroundNotification(message, context);
    });
  }

  void requestNotificationPermission() async {
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      announcement: true,
      badge: true,
      carPlay: true,
      criticalAlert: true,
      provisional: true,
      sound: true,
    );

    if (settings.authorizationStatus != AuthorizationStatus.authorized &&
        settings.authorizationStatus != AuthorizationStatus.provisional) {
      // notification permission denied
      AppSettings.openAppSettings(type: AppSettingsType.notification);
    }
  }

  // function to show visible notification when app is active
  Future<void> foregroundNotification(
      RemoteMessage message, BuildContext context) async {
    if (Platform.isIOS) {
      await FirebaseMessaging.instance
          .setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
    } else if (Platform.isAndroid) {
      LocalNotifications.initLocalNotifications(context, message);

      AndroidNotificationChannel channel = const AndroidNotificationChannel(
        'high_priority_channel',
        'Notices',
        importance: Importance.max,
        showBadge: true,
        playSound: true,
        sound: RawResourceAndroidNotificationSound('notify'),
      );

      String? imageUrl = LocalNotifications.getImageUrl(message.notification!);

      final http.Response? response;
      if (imageUrl != null) {
        response = await http.get(Uri.parse(imageUrl));
      } else {
        response = null;
      }

      await LocalNotifications.localNotifications.show(
        message.notification!.hashCode,
        message.notification!.title,
        message.notification!.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            channel.id,
            channel.name,
            channelDescription: 'This is high priority channel',
            importance: Importance.high,
            priority: Priority.high,
            playSound: true,
            ticker: 'ticker',
            sound: channel.sound,
            actions: [
              AndroidNotificationAction('id_2', 'Attended'),
              AndroidNotificationAction('id_1', 'Missed'),
            ],
            styleInformation: response == null
                ? null
                : BigPictureStyleInformation(
                    ByteArrayAndroidBitmap.fromBase64String(
                      base64Encode(response.bodyBytes),
                    ),
                  ),
          ),
        ),
      );
    }
  }

  //handle tap on notification when app is in background or terminated
  Future<void> backgroundNotification(BuildContext context) async {
    // when app is terminated
    RemoteMessage? initialMessage =
        await FirebaseMessaging.instance.getInitialMessage();

    if (initialMessage != null) {
      handleMessage(context, initialMessage);
    }

    //when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen((event) {
      handleMessage(context, event);
    });
  }

  Future<String> getDeviceToken() async {
    String? token = await _messaging.getToken();
    return token!;
  }

  void isTokenRefreshed() async {
    _messaging.onTokenRefresh.listen((event) {
      event.toString();
    });
  }

  static void handleMessage(BuildContext context, RemoteMessage message) {
    log("Notificatinon clicker");

    context.read<NavigationProvider>().changePageNumber(3);
  }
}

class LocalNotifications {
  static final localNotifications = FlutterLocalNotificationsPlugin();
  static void initLocalNotifications(
      BuildContext context, RemoteMessage message) async {
    await localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('notifyimage'),
      ),
      onDidReceiveNotificationResponse: (payload) {
        // handle interaction when app is active for android
        NotificationServices.handleMessage(context, message);
      },
    );
  }

  static String? getImageUrl(RemoteNotification notification) {
    if (Platform.isIOS && notification.apple != null) {
      return notification.apple?.imageUrl;
    }
    if (Platform.isAndroid && notification.android != null) {
      return notification.android?.imageUrl;
    }
    return null;
  }
}
