import 'dart:convert';
import 'dart:developer';
import 'dart:io';

import 'package:coursehub/main.dart';
import 'package:coursehub/utilities/helpers/helpers.dart';
import 'package:http/http.dart' as http;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:app_settings/app_settings.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationServices {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  void firebaseInit(BuildContext context) {
    FirebaseMessaging.onMessage.listen((message) async {
      await foregroundNotification(message);
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
  Future<void> foregroundNotification(RemoteMessage message) async {
    if (Platform.isIOS) {
      // TODO: Implement ios methods
    } else if (Platform.isAndroid) {
      LocalNotifications.initLocalNotifications(message);

      AndroidNotificationChannel channel = AndroidNotificationChannel(
        'high_priority_channel',

        // TODO: manage channel as per type here
        letterCapitalizer(message.data['type']),
        importance: Importance.max,
        showBadge: true,
        playSound: true,
        sound: const RawResourceAndroidNotificationSound('notify'),
      );

      String? imageUrl = message.data['image'];

      final http.Response? response;
      if (imageUrl != null) {
        response = await http.get(Uri.parse(imageUrl));
      } else {
        response = null;
      }

      await LocalNotifications.localNotifications.show(
        int.parse(message.data['id']),
        message.data['title'],
        message.data['body'],
        NotificationDetails(
          android: AndroidNotificationDetails(
            channel.id,
            channel.name,
            importance: Importance.high,
            priority: Priority.high,
            playSound: true,
            ticker: 'ticker',
            sound: channel.sound,
            showWhen: true,
            tag: message.data['id'],
            enableVibration: true,
            subText: 'Attendance',
            actions: [
              const AndroidNotificationAction(
                'id_2',
                'Attended',
                titleColor: Color.fromRGBO(87, 173, 56, 1),
                showsUserInterface: true,
              ),
              const AndroidNotificationAction(
                'id_1',
                'Missed',
                titleColor: Color.fromRGBO(235, 91, 91, 1),
                showsUserInterface: true,
              ),
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

  Future<String> getDeviceToken() async {
    String? token = await _messaging.getToken();
    return token!;
  }

  void isTokenRefreshed() async {
    _messaging.onTokenRefresh.listen((event) {
      event.toString();
    });
  }
}

class LocalNotifications {
  static final localNotifications = FlutterLocalNotificationsPlugin();

  static void initLocalNotifications(RemoteMessage message) async {
    await localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('notifyimage'),
      ),
      onDidReceiveNotificationResponse: (payload) {
        log(payload.actionId.toString());
      },
      onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
    );
  }

  static Future<bool> didNotificationOpenApp() async {
    var initialNotification =
        await localNotifications.getNotificationAppLaunchDetails();
    if (initialNotification?.didNotificationLaunchApp == true) {
      return true;
    } else {
      return false;
    }
  }
}


/*
Categories of notifications:->

1. Exam
2. Timetable
3. Attendance
4. Notice

*/


/* 
Structure of payload:


data: {
id: unique identifier , if same the new notification will replace old one
type: enum(exam,schedule,attendance,notice)
title: string
body: string
image: imageUrl
}





timetableUrl: https://elements-cover-images-0.imgix.net/b6eb10fb-2f7f-44bc-b9a5-47a5ce9d21eb?auto=compress%2Cformat&w=2038&fit=max&s=99d43cbdea724635c7832cf871adca30

*/
