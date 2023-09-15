import 'package:coursehub/apis/authentication/login.dart';
import 'package:coursehub/apis/user/user.dart';
import 'package:coursehub/database/cache_store.dart';
import 'package:coursehub/database/hive_store.dart';
import 'package:coursehub/providers/cache_provider.dart';
import 'package:coursehub/providers/navigation_provider.dart';
import 'package:coursehub/utilities/dynamic_links.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:hive_flutter/adapters.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../screens/splash_screen.dart';
import './constants/themes.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await Hive.initFlutter();

  await FirebaseDynamicLink.handleInitialLink();

  try {
    await getCurrentUser();
  } catch (e) {
    // ignore: use_build_context_synchronously

    // logout without context
    final prefs = await SharedPreferences.getInstance();
    final box = await Hive.openBox('coursehub-data');

    prefs.clear();
    box.clear();
    HiveStore.clearHiveData();
    CacheStore.clearCacheStore();
  }

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
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.black,
      ),
    );
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      key: navigatorKey,
      theme: Themes.theme,
      home: const SplashScreen(),
      builder: EasyLoading.init(),
    );
  }
}
