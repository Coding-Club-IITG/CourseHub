import 'package:awesome_notifications/awesome_notifications.dart';
import 'package:awesome_notifications_fcm/awesome_notifications_fcm.dart';
import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/providers/cache_provider.dart';
import 'package:coursehub/providers/navigation_provider.dart';
import 'package:coursehub/screens/login_screen.dart';
import 'package:coursehub/screens/nav_bar_screen.dart';
import 'package:coursehub/utilities/notifications/notification_services.dart';
import 'package:coursehub/utilities/startup_items.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:provider/provider.dart';



final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsBinding widgetsBinding = WidgetsFlutterBinding.ensureInitialized();

  FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);

  await AwesomeNotifications().initialize(
   
    'resource://drawable/notifyimage',

    [
      NotificationChannel(
        channelGroupKey: 'announcements',
        channelShowBadge: true,
        criticalAlerts: true,
        enableVibration: true,
        channelKey: 'exam',
        channelName: 'Exams',
        channelDescription: 'Notifications regarding midsems and endsems',
        defaultColor: colors[1],
        ledColor: Colors.white,
        importance: NotificationImportance.Max,
        playSound: true,
      ),
       NotificationChannel(
        channelGroupKey: 'announcements',
        channelShowBadge: true,
        criticalAlerts: true,
        enableVibration: true,
        channelKey: 'notices',
        channelName: 'Notices',
        channelDescription: 'Notifications regarding general important notices',
        defaultColor: colors[5],
        ledColor: Colors.white,
        importance: NotificationImportance.Max,
        playSound: true,
      ),
      NotificationChannel(
        channelGroupKey: 'timetable',
        channelShowBadge: true,
        criticalAlerts: true,
        enableVibration: true,
        channelKey: 'schedule',
        channelName: 'Schedule',
        channelDescription: 'Notifications regarding alterations in classes, including cancellations and additions',
        defaultColor: colors[3],
        ledColor: Colors.white,
        importance: NotificationImportance.Max,
        playSound: true,
      ),
      NotificationChannel(
        channelGroupKey: 'timetable',
        channelShowBadge: true,
        criticalAlerts: true,
        enableVibration: true,
        channelKey: 'attendance',
        channelName: 'Attendance',
        channelDescription: 'Notifications regarding your attendance in particular course',
        defaultColor: colors[4],
        ledColor: Colors.white,
        importance: NotificationImportance.Max,
        playSound: true,
      ),
      
    ],
    // Channel groups are only visual and are not required
    channelGroups: [
      NotificationChannelGroup(
        channelGroupKey: 'announcements',
        channelGroupName: 'Announcements',
      ),
      NotificationChannelGroup(
        channelGroupKey: 'timetable',
        channelGroupName: 'Timetable',
      )
    ],
    debug: true,
  );

  final bool isLoggedIn = await startupItems();

  await Firebase.initializeApp();
  await AwesomeNotificationsFcm().initialize(
    onFcmTokenHandle: NotificationController.myFcmTokenHandle,
    onFcmSilentDataHandle: NotificationController.mySilentDataHandle,
    debug: true,
  );

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
