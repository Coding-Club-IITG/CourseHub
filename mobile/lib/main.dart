import 'dart:developer';

import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/screens/login_screen.dart';
import 'package:coursehub/screens/nav_bar_screen.dart';
import 'package:coursehub/utilities/helpers/helpers.dart';
import 'package:coursehub/utilities/notifications/notification_services.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'providers/cache_provider.dart';
import 'providers/navigation_provider.dart';
import '../../utilities/startup_items.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

@pragma('vm:entry-point')
Future<void> notificationTapBackground(NotificationResponse payload) async {
  final prefs = await SharedPreferences.getInstance();
  prefs.setInt('initialPageNumber', 3);
  log('INITIAL PAGE NUMBER SET');

  // handle action
}

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage? message) async {
  LocalNotifications.initLocalNotifications(
      message!);
  AndroidNotificationChannel channel = AndroidNotificationChannel(
    'high_priority_channel',

    // TODO: manage channel as per type here
    letterCapitalizer(message!.data['type']),
    importance: Importance.max,
    showBadge: true,
    playSound: true,
    sound: const RawResourceAndroidNotificationSound('notify'),
  );

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
      ),
    ),
  );
}

void main() async {
  WidgetsBinding widgetsBinding = WidgetsFlutterBinding.ensureInitialized();

  FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  final bool isLoggedIn = await startupItems();

  FlutterNativeSplash.remove();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (context) => CacheProvider(),
        ),
        ChangeNotifierProvider(
          create: (context) => NavigationProvider(),
        ),
      ],
      child: MyApp(isLoggedIn: isLoggedIn),
    ),
  );
}

class MyApp extends StatelessWidget {
  final bool isLoggedIn;
  const MyApp({super.key, required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
          statusBarColor: Colors.black, systemNavigationBarColor: Colors.black),
    );
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      key: navigatorKey,
      theme: Themes.theme,
      home: isLoggedIn ? const NavBarScreen() : const LoginScreen(),
      builder: EasyLoading.init(),
    );
  }
}
